import { Types } from 'mongoose';
import { AuditLog, Block, District, Member } from '../models';
import type { AuditAction } from '../models';
import { AdminScope, assertScopeId, canAccessBlock, canAccessDistrict, ScopeError } from './admin-scope.service';
import { blockScopeFilter, districtScopeFilter, memberScopeFilter } from './query-scope.service';

export class LocationAdminError extends Error {
  constructor(
    public readonly code: 'LOCATION_NOT_FOUND' | 'DUPLICATE_LOCATION' | 'INVALID_SCOPE' | 'REFERENCED_LOCATION' | 'MEMBER_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'LocationAdminError';
  }
}

export interface DistrictInput {
  nameEn: string;
  nameHi: string;
  code: string;
  isActive?: boolean;
}

export interface BlockInput {
  nameEn: string;
  nameHi: string;
  code: string;
  districtId: string;
  isActive?: boolean;
}

function isDuplicate(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error &&
    (error as { code?: number }).code === 11000);
}

async function audit(
  actorId: string,
  action: AuditAction,
  targetType: 'DISTRICT' | 'BLOCK',
  targetId: string,
): Promise<void> {
  await AuditLog.create({
    actorUserId: assertScopeId(actorId, 'actor'),
    action,
    targetEntityType: targetType,
    targetEntityId: assertScopeId(targetId, targetType.toLowerCase()),
  });
}

function assertCanManageLocations(actor: AdminScope): void {
  if (!['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(actor.role)) {
    throw new ScopeError();
  }
}

async function getDistrictForScope(actor: AdminScope, districtId: string) {
  const id = assertScopeId(districtId, 'district');
  if (!canAccessDistrict(actor, id.toString())) throw new LocationAdminError('INVALID_SCOPE', 'District is outside your administrative scope');
  const district = await District.findById(id);
  if (!district) throw new LocationAdminError('LOCATION_NOT_FOUND', 'District not found');
  return district;
}

export async function listAdminDistricts(actor: AdminScope) {
  assertCanManageLocations(actor);
  if (actor.role === 'DISTRICT_ADMIN') {
    if (!actor.districtId) throw new LocationAdminError('INVALID_SCOPE', 'District scope is required');
    return [await getDistrictForScope(actor, actor.districtId)];
  }
  return District.find(districtScopeFilter(actor)).sort({ nameEn: 1 });
}

export async function getAdminDistrict(actor: AdminScope, districtId: string) {
  assertCanManageLocations(actor);
  return getDistrictForScope(actor, districtId);
}

export async function createDistrict(actor: AdminScope, input: DistrictInput) {
  if (!['SUPER_ADMIN', 'STATE_ADMIN'].includes(actor.role)) throw new ScopeError();
  try {
    const district = await District.create({
      nameEn: input.nameEn,
      nameHi: input.nameHi,
      code: input.code,
      isActive: input.isActive ?? true,
    });
    await audit(actor.id, 'DISTRICT_CREATED', 'DISTRICT', district.id);
    return district;
  } catch (error) {
    if (isDuplicate(error)) throw new LocationAdminError('DUPLICATE_LOCATION', 'District code already exists');
    throw error;
  }
}

export async function updateDistrict(actor: AdminScope, districtId: string, input: Partial<DistrictInput>) {
  assertCanManageLocations(actor);
  const district = await getDistrictForScope(actor, districtId);
  if (input.nameEn !== undefined) district.nameEn = input.nameEn;
  if (input.nameHi !== undefined) district.nameHi = input.nameHi;
  if (input.code !== undefined) district.code = input.code;
  if (input.isActive !== undefined) district.isActive = input.isActive;
  try {
    await district.save();
  } catch (error) {
    if (isDuplicate(error)) throw new LocationAdminError('DUPLICATE_LOCATION', 'District code already exists');
    throw error;
  }
  await audit(actor.id, input.isActive === true ? 'DISTRICT_ACTIVATED' : input.isActive === false ? 'DISTRICT_DEACTIVATED' : 'DISTRICT_UPDATED', 'DISTRICT', district.id);
  return district;
}

export async function listAdminBlocks(actor: AdminScope, districtId: string) {
  await getDistrictForScope(actor, districtId);
  return Block.find({ ...blockScopeFilter(actor), districtId: assertScopeId(districtId, 'district') }).sort({ nameEn: 1 });
}

export async function createBlock(actor: AdminScope, input: BlockInput) {
  assertCanManageLocations(actor);
  const district = await getDistrictForScope(actor, input.districtId);
  try {
    const block = await Block.create({
      nameEn: input.nameEn,
      nameHi: input.nameHi,
      code: input.code,
      districtId: district._id,
      isActive: input.isActive ?? true,
    });
    await audit(actor.id, 'BLOCK_CREATED', 'BLOCK', block.id);
    return block;
  } catch (error) {
    if (isDuplicate(error)) throw new LocationAdminError('DUPLICATE_LOCATION', 'Block code already exists');
    throw error;
  }
}

export async function updateBlock(actor: AdminScope, blockId: string, input: Partial<BlockInput>) {
  assertCanManageLocations(actor);
  const block = await Block.findById(assertScopeId(blockId, 'block'));
  if (!block) throw new LocationAdminError('LOCATION_NOT_FOUND', 'Block not found');
  if (!canAccessBlock(actor, block.districtId.toString(), block.id)) {
    throw new LocationAdminError('INVALID_SCOPE', 'Block is outside your administrative scope');
  }
  if (input.districtId !== undefined && input.districtId !== block.districtId.toString()) {
    await getDistrictForScope(actor, input.districtId);
    block.districtId = assertScopeId(input.districtId, 'district');
  }
  if (input.nameEn !== undefined) block.nameEn = input.nameEn;
  if (input.nameHi !== undefined) block.nameHi = input.nameHi;
  if (input.code !== undefined) block.code = input.code;
  if (input.isActive !== undefined) block.isActive = input.isActive;
  try {
    await block.save();
  } catch (error) {
    if (isDuplicate(error)) throw new LocationAdminError('DUPLICATE_LOCATION', 'Block code already exists');
    throw error;
  }
  await audit(actor.id, input.isActive === true ? 'BLOCK_ACTIVATED' : input.isActive === false ? 'BLOCK_DEACTIVATED' : 'BLOCK_UPDATED', 'BLOCK', block.id);
  return block;
}

export async function assertLocationNotReferenced(type: 'DISTRICT' | 'BLOCK', id: string): Promise<void> {
  const filter = type === 'DISTRICT' ? { districtId: new Types.ObjectId(id) } : { blockId: new Types.ObjectId(id) };
  if (await Member.exists(filter)) {
    throw new LocationAdminError('REFERENCED_LOCATION', 'Location is referenced by members and cannot be deleted');
  }
}

export async function listUnassignedMembers(actor: AdminScope) {
  if (!['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(actor.role)) throw new ScopeError();
  return Member.find({
    ...memberScopeFilter(actor),
    $or: [{ blockId: { $exists: false } }, { blockId: null }],
  }).sort({ createdAt: -1 }).lean();
}

export async function assignMemberBlock(actor: AdminScope, memberId: string, blockId: string) {
  if (!['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'].includes(actor.role)) throw new ScopeError();
  const memberObjectId = assertScopeId(memberId, 'member');
  const blockObjectId = assertScopeId(blockId, 'block');
  const block = await Block.findOne({ _id: blockObjectId, isActive: true }).lean();
  if (!block) throw new LocationAdminError('LOCATION_NOT_FOUND', 'Active block not found');
  if (block.verificationStatus === 'PROVISIONAL') {
    throw new LocationAdminError('INVALID_SCOPE', 'Provisional blocks must be verified before member assignment');
  }
  if (!canAccessDistrict(actor, block.districtId.toString())) {
    throw new LocationAdminError('INVALID_SCOPE', 'Block is outside your administrative scope');
  }
  const member = await Member.findOneAndUpdate(
    {
      _id: memberObjectId,
      districtId: block.districtId,
      $or: [{ blockId: { $exists: false } }, { blockId: null }],
    },
    { $set: { blockId: block._id, locationStatus: 'VERIFIED' } },
    { new: true },
  ).exec();
  if (!member) {
    throw new LocationAdminError('MEMBER_NOT_FOUND', 'Member is not unassigned or is outside your district scope');
  }
  await AuditLog.create({
    actorUserId: assertScopeId(actor.id, 'actor'),
    action: 'MEMBER_LOCATION_ASSIGNED',
    targetEntityType: 'MEMBER',
    targetEntityId: member._id,
    metadata: { blockId: block._id.toString(), locationStatus: 'VERIFIED' },
  });
  return member;
}
