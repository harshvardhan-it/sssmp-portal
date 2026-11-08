import { Types } from 'mongoose';
import { AuditLog, Block, District, User } from '../models';
import type { AuditAction, UserEntity } from '../models';
import { AccountStatus, UserRole } from '../models/types';
import {
  AdminScope,
  assertCanManageRole,
  assertScopeId,
  canAccessBlock,
  canAccessDistrict,
  ScopeError,
} from './admin-scope.service';

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'];

export class AdminError extends Error {
  constructor(
    public readonly code:
      | 'ADMIN_NOT_FOUND'
      | 'INVALID_SCOPE'
      | 'DUPLICATE_ADMIN'
      | 'SELF_MODIFICATION'
      | 'INVALID_STATUS',
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export interface CreateAdminInput {
  email?: string;
  mobile?: string;
  password: string;
  role: UserRole;
  districtId?: string;
  blockId?: string;
}

export interface UpdateAdminInput {
  email?: string;
  mobile?: string;
  password?: string;
  role?: UserRole;
  districtId?: string;
  blockId?: string;
}

function isDuplicate(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error &&
    (error as { code?: number }).code === 11000);
}

function safeAdmin(user: UserEntity & {
  _id?: Types.ObjectId;
  id?: string;
}) {
  const id = user.id ?? user._id?.toString();
  if (!id) throw new Error('Administrator document has no identifier');
  return {
    id,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    accountStatus: user.accountStatus,
    districtId: user.districtId?.toString(),
    blockId: user.blockId?.toString(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function validateScope(
  actor: AdminScope,
  role: UserRole,
  districtId?: string,
  blockId?: string,
): Promise<{ districtId?: Types.ObjectId; blockId?: Types.ObjectId }> {
  assertCanManageRole(actor, role);
  if (role === 'SUPER_ADMIN' || role === 'STATE_ADMIN') {
    if (districtId || blockId) throw new AdminError('INVALID_SCOPE', 'This role cannot have a district or block scope');
    return {};
  }
  if (!districtId) throw new AdminError('INVALID_SCOPE', 'District scope is required');
  const district = assertScopeId(districtId, 'district');
  if (!canAccessDistrict(actor, district.toString())) {
    throw new AdminError('INVALID_SCOPE', 'The district is outside your administrative scope');
  }
  if (role === 'DISTRICT_ADMIN') {
    if (blockId) throw new AdminError('INVALID_SCOPE', 'District administrators cannot have a block scope');
    if (!(await District.exists({ _id: district, isActive: true }))) {
      throw new AdminError('INVALID_SCOPE', 'District not found');
    }
    return { districtId: district };
  }
  if (!blockId) throw new AdminError('INVALID_SCOPE', 'Block scope is required');
  const block = assertScopeId(blockId, 'block');
  if (!(await Block.exists({ _id: block, districtId: district, isActive: true, verificationStatus: 'VERIFIED' }))) {
    throw new AdminError('INVALID_SCOPE', 'Block does not belong to the selected district');
  }
  if (!canAccessBlock(actor, district.toString(), block.toString())) {
    throw new AdminError('INVALID_SCOPE', 'The block is outside your administrative scope');
  }
  return { districtId: district, blockId: block };
}

async function audit(
  actorId: string,
  action: AuditAction,
  targetEntityType: 'USER' | 'DISTRICT' | 'BLOCK',
  targetEntityId: string,
  metadata?: Record<string, string | boolean | null>,
): Promise<void> {
  await AuditLog.create({
    actorUserId: assertScopeId(actorId, 'actor'),
    action,
    targetEntityType,
    targetEntityId: assertScopeId(targetEntityId, 'target'),
    metadata,
  });
}

function adminFilter(actor: AdminScope): Record<string, unknown> {
  if (actor.role === 'SUPER_ADMIN' || actor.role === 'STATE_ADMIN') {
    return { role: { $in: ADMIN_ROLES } };
  }
  if (actor.role === 'DISTRICT_ADMIN') {
    return { role: 'BLOCK_ADMIN', districtId: actor.districtId };
  }
  throw new ScopeError();
}

async function findManagedAdmin(actor: AdminScope, adminId: string) {
  const id = assertScopeId(adminId, 'administrator');
  const admin = await User.findOne({ _id: id, ...adminFilter(actor) });
  if (!admin) throw new AdminError('ADMIN_NOT_FOUND', 'Administrator not found');
  return admin;
}

export async function listAdmins(actor: AdminScope) {
  const admins = await User.find(adminFilter(actor)).sort({ createdAt: -1 });
  return admins.map(safeAdmin);
}

export async function getAdmin(actor: AdminScope, adminId: string) {
  return safeAdmin(await findManagedAdmin(actor, adminId));
}

export async function createAdmin(actor: AdminScope, input: CreateAdminInput) {
  const scope = await validateScope(actor, input.role, input.districtId, input.blockId);
  try {
    const user = new User({
      email: input.email,
      mobile: input.mobile,
      passwordHash: input.password,
      role: input.role,
      accountStatus: 'ACTIVE',
      ...scope,
    });
    await user.save();
    await audit(actor.id, 'ADMIN_CREATED', 'USER', user.id, { role: user.role });
    return safeAdmin(user);
  } catch (error) {
    if (isDuplicate(error)) throw new AdminError('DUPLICATE_ADMIN', 'An administrator account already exists');
    throw error;
  }
}

export async function updateAdmin(actor: AdminScope, adminId: string, input: UpdateAdminInput) {
  const admin = await findManagedAdmin(actor, adminId);
  if (admin.id === actor.id) throw new AdminError('SELF_MODIFICATION', 'An administrator cannot modify this account');
  const previousRole = admin.role;
  const nextRole = input.role ?? admin.role;
  const scope = await validateScope(
    actor,
    nextRole,
    input.districtId ?? admin.districtId?.toString(),
    input.blockId ?? admin.blockId?.toString(),
  );
  const changes: Record<string, unknown> = {};
  if (input.email !== undefined) changes.email = input.email;
  if (input.mobile !== undefined) changes.mobile = input.mobile;
  if (input.password !== undefined) changes.passwordHash = input.password;
  if (input.role !== undefined) changes.role = input.role;
  if (input.role || input.districtId !== undefined || input.blockId !== undefined) {
    changes.districtId = scope.districtId;
    changes.blockId = scope.blockId;
  }
  Object.assign(admin, changes);
  try {
    await admin.save();
  } catch (error) {
    if (isDuplicate(error)) throw new AdminError('DUPLICATE_ADMIN', 'An administrator account already exists');
    throw error;
  }
  await audit(actor.id, 'ADMIN_UPDATED', 'USER', admin.id);
  if (previousRole !== admin.role) await audit(actor.id, 'ADMIN_ROLE_CHANGED', 'USER', admin.id, { role: admin.role });
  if (input.districtId !== undefined || input.blockId !== undefined) {
    await audit(actor.id, 'ADMIN_SCOPE_CHANGED', 'USER', admin.id);
  }
  return safeAdmin(admin);
}

export async function updateAdminStatus(actor: AdminScope, adminId: string, status: 'ACTIVE' | 'INACTIVE') {
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw new AdminError('INVALID_STATUS', 'Status must be ACTIVE or INACTIVE');
  const admin = await findManagedAdmin(actor, adminId);
  if (admin.id === actor.id) throw new AdminError('SELF_MODIFICATION', 'An administrator cannot modify this account');
  admin.accountStatus = status;
  await admin.save();
  await audit(actor.id, status === 'ACTIVE' ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED', 'USER', admin.id);
  return safeAdmin(admin);
}
