import crypto from 'node:crypto';
import { ClientSession, Types } from 'mongoose';
import { AuditLog, Member, Membership, RenewalRequest } from '../models';
import { SYSTEM_ACTOR_ID } from '../models/audit-log.model';
import { ApplicationStatus, SUBSCRIPTION_AMOUNTS, SubscriptionPlan } from '../models/types';
import type { AuditAction } from '../models/audit-log.model';
import {
  AdminScope,
  assertScopeId,
  canAccessBlock,
  canAccessDistrict,
  ScopeError,
} from './admin-scope.service';
import { memberScopeFilter } from './query-scope.service';

export class MembershipError extends Error {
  constructor(
    public readonly code:
      | 'MEMBERSHIP_NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'REASON_REQUIRED'
      | 'PAYMENT_NOT_VERIFIED'
      | 'ACTIVATION_UNAVAILABLE'
      | 'DUPLICATE_RENEWAL'
      | 'INVALID_SCOPE',
    message: string,
  ) {
    super(message);
    this.name = 'MembershipError';
  }
}

export interface CreateMembershipInput {
  memberId: string;
  plan: SubscriptionPlan;
}

function isDuplicate(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error &&
    (error as { code?: number }).code === 11000);
}

function isMembershipNumberDuplicate(error: unknown): boolean {
  if (!isDuplicate(error)) return false;
  if (!error || typeof error !== 'object') return false;
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue;
  return Boolean(keyPattern?.membershipNumber || keyValue?.membershipNumber);
}

function generateMembershipNumber(): string {
  return `SSSMP-M-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
}

function auditAction(
  actorId: string,
  action: AuditAction,
  entityType: 'MEMBERSHIP' | 'RENEWAL',
  entityId: string,
  metadata?: Record<string, string | boolean | null>,
  session?: ClientSession,
): Promise<unknown> {
  const document = {
    actorUserId: assertScopeId(actorId, 'actor'),
    action,
    targetEntityType: entityType,
    targetEntityId: assertScopeId(entityId, 'target'),
    metadata,
  };
  return AuditLog.create([document], session ? { session } : undefined);
}

function derivedMemberStatus(status: ApplicationStatus): 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'INACTIVE' {
  if (status === 'PENDING' || status === 'APPROVED') return 'PENDING';
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'EXPIRED') return 'EXPIRED';
  return 'INACTIVE';
}

async function synchronizeMemberStatus(
  memberId: Types.ObjectId,
  status: ApplicationStatus,
  fields: { joinedAt?: Date; membershipExpiresAt?: Date } = {},
  session?: ClientSession,
): Promise<void> {
  const update: { $set: Record<string, Date | string | undefined>; $unset?: Record<string, ''> } = {
    $set: {
      membershipStatus: derivedMemberStatus(status),
      ...fields,
    },
  };
  if (status !== 'ACTIVE') {
    update.$unset = { joinedAt: '', membershipExpiresAt: '' };
  }
  const result = await Member.updateOne(
    { _id: memberId },
    update,
    session ? { session } : undefined,
  ).exec();
  if (result.matchedCount !== 1) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Member profile not found');
}

async function findMembership(membershipId: string) {
  const id = assertScopeId(membershipId, 'membership');
  const membership = await Membership.findById(id).exec();
  if (!membership) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Membership not found');
  return membership;
}

async function assertMembershipAccess(actor: AdminScope, membership: { memberId: Types.ObjectId }): Promise<void> {
  if (actor.role === 'MEMBER') {
    const owned = await Member.exists({ _id: membership.memberId, userId: assertScopeId(actor.id, 'user') });
    if (!owned) throw new ScopeError('You can only access your own membership');
    return;
  }
  if (actor.role === 'SUPER_ADMIN' || actor.role === 'STATE_ADMIN') return;
  const member = await Member.findById(membership.memberId).lean();
  if (!member) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Member profile not found');
  if (actor.role === 'DISTRICT_ADMIN' && !canAccessDistrict(actor, member.districtId.toString())) {
    throw new MembershipError('INVALID_SCOPE', 'Membership is outside your district scope');
  }
  if (actor.role === 'BLOCK_ADMIN' && (!member.blockId || !canAccessBlock(actor, member.districtId.toString(), member.blockId.toString()))) {
    throw new MembershipError('INVALID_SCOPE', 'Membership is outside your block scope');
  }
}

function safeMembership(membership: {
  id?: string;
  _id?: Types.ObjectId;
  memberId: Types.ObjectId;
  membershipNumber: string;
  plan: SubscriptionPlan;
  amount: number;
  status: ApplicationStatus;
  appliedAt: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  activatedAt?: Date;
  activatedBy?: Types.ObjectId;
  validityStart?: Date;
  validityEnd?: Date;
  paymentVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  const id = membership.id ?? membership._id?.toString();
  if (!id) throw new Error('Membership document has no identifier');
  return {
    id,
    memberId: membership.memberId.toString(),
    membershipNumber: membership.membershipNumber,
    plan: membership.plan,
    amount: membership.amount,
    status: membership.status,
    appliedAt: membership.appliedAt,
    approvedAt: membership.approvedAt,
    approvedBy: membership.approvedBy?.toString(),
    rejectedAt: membership.rejectedAt,
    rejectedBy: membership.rejectedBy?.toString(),
    rejectionReason: membership.rejectionReason,
    activatedAt: membership.activatedAt,
    activatedBy: membership.activatedBy?.toString(),
    validityStart: membership.validityStart,
    validityEnd: membership.validityEnd,
    paymentVerifiedAt: membership.paymentVerifiedAt,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

export async function createMembership(
  actor: AdminScope,
  input: CreateMembershipInput,
  session?: ClientSession,
) {
  const memberId = assertScopeId(input.memberId, 'member');
  if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'STATE_ADMIN' && actor.role !== 'DISTRICT_ADMIN' && actor.role !== 'BLOCK_ADMIN') {
    throw new ScopeError('Only authorized administrators can create membership records');
  }
  if (input.plan !== 'OFFICE_BEARER' && input.plan !== 'YEARLY') {
    throw new MembershipError('INVALID_TRANSITION', 'Invalid membership plan');
  }
  const member = await Member.findById(memberId).lean();
  if (!member) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Member profile not found');
  if (actor.role === 'DISTRICT_ADMIN' && !canAccessDistrict(actor, member.districtId.toString())) {
    throw new MembershipError('INVALID_SCOPE', 'Member is outside your district scope');
  }
  if (actor.role === 'BLOCK_ADMIN' && (!member.blockId || !canAccessBlock(actor, member.districtId.toString(), member.blockId.toString()))) {
    throw new MembershipError('INVALID_SCOPE', 'Member is outside your block scope');
  }
  const existing = await Membership.exists({
    memberId,
    status: { $in: ['PENDING', 'APPROVED', 'ACTIVE'] },
  });
  if (existing) throw new MembershipError('INVALID_TRANSITION', 'Member already has an active application or membership');
  const amount = SUBSCRIPTION_AMOUNTS[input.plan];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const membership = await Membership.create([{
        memberId,
        membershipNumber: generateMembershipNumber(),
        plan: input.plan,
        amount,
        status: 'PENDING',
      }], session ? { session } : undefined);
      const created = membership[0];
      await auditAction(actor.id, 'MEMBERSHIP_CREATED', 'MEMBERSHIP', created.id, { plan: input.plan });
      return safeMembership(created);
    } catch (error) {
      if (!isMembershipNumberDuplicate(error)) {
        if (isDuplicate(error)) {
          throw new MembershipError('INVALID_TRANSITION', 'Member already has an active application or membership');
        }
        throw error;
      }
      if (attempt === 4) throw error;
    }
  }
  throw new Error('Unable to generate a unique membership number');
}

export async function createMembershipForMember(
  memberId: Types.ObjectId,
  plan: SubscriptionPlan,
  session?: ClientSession,
) {
  const amount = SUBSCRIPTION_AMOUNTS[plan];
  const membership = await Membership.create([{
    memberId,
    membershipNumber: generateMembershipNumber(),
    plan,
    amount,
    status: 'PENDING',
  }], session ? { session } : undefined);
  const created = Array.isArray(membership) ? membership[0] : membership;
  await auditAction(
    SYSTEM_ACTOR_ID.toString(),
    'MEMBERSHIP_CREATED',
    'MEMBERSHIP',
    created.id,
    { plan, source: 'REGISTRATION' },
    session,
  );
  return created;
}

export async function getOwnMembership(actor: AdminScope) {
  if (actor.role !== 'MEMBER') throw new ScopeError('This endpoint is for members');
  const member = await Member.findOne({ userId: assertScopeId(actor.id, 'user') }).lean();
  if (!member) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Member profile not found');
  const membership = await Membership.findOne({ memberId: member._id }).sort({ createdAt: -1 }).exec();
  if (!membership) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Membership not found');
  return safeMembership(membership);
}

export async function getOwnMembershipHistory(actor: AdminScope) {
  if (actor.role !== 'MEMBER') throw new ScopeError('This endpoint is for members');
  const member = await Member.findOne({ userId: assertScopeId(actor.id, 'user') }).lean();
  if (!member) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Member profile not found');
  const memberships = await Membership.find({ memberId: member._id }).sort({ createdAt: -1 }).exec();
  return memberships.map(safeMembership);
}

export async function getOwnRenewalHistory(actor: AdminScope) {
  if (actor.role !== 'MEMBER') throw new ScopeError('This endpoint is for members');
  const member = await Member.findOne({ userId: assertScopeId(actor.id, 'user') }).lean();
  if (!member) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Member profile not found');
  return RenewalRequest.find({ memberId: member._id }).sort({ requestedAt: -1 }).exec();
}

export async function listMemberships(actor: AdminScope, status?: ApplicationStatus) {
  if (actor.role === 'MEMBER') throw new ScopeError();
  const filter = { ...memberScopeFilter(actor), ...(status ? { status } : {}) };
  const members = await Member.find(filter).select('_id').lean();
  const ids = members.map((member) => member._id);
  const memberships = await Membership.find({ memberId: { $in: ids }, ...(status ? { status } : {}) })
    .sort({ createdAt: -1 }).exec();
  return memberships.map(safeMembership);
}

export async function activateMembershipFromCapturedPayment(
  input: {
    membershipId: Types.ObjectId;
    paymentId: string;
    capturedAt: Date;
  },
  session: ClientSession,
) {
  const membership = await Membership.findOneAndUpdate(
    { _id: input.membershipId, status: { $in: ['PENDING', 'APPROVED'] } },
    {
      $set: {
        status: 'ACTIVE',
        activatedAt: input.capturedAt,
        activatedBy: SYSTEM_ACTOR_ID,
        paymentVerifiedAt: input.capturedAt,
        paymentVerifiedBy: SYSTEM_ACTOR_ID,
        validityStart: input.capturedAt,
      },
    },
    { new: true, session },
  ).exec();
  if (!membership) {
    const existing = await Membership.findById(input.membershipId).session(session).exec();
    if (existing?.status === 'ACTIVE') return existing;
    throw new MembershipError('INVALID_TRANSITION', 'Membership is not pending payment activation');
  }
  if (membership.plan === 'YEARLY') {
    membership.validityEnd = new Date(input.capturedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
    await membership.save({ session });
  }
  await synchronizeMemberStatus(
    membership.memberId,
    membership.status,
    { joinedAt: input.capturedAt, membershipExpiresAt: membership.validityEnd },
    session,
  );
  await auditAction(
    SYSTEM_ACTOR_ID.toString(),
    'MEMBERSHIP_ACTIVATED',
    'MEMBERSHIP',
    membership.id,
    { paymentId: input.paymentId },
    session,
  );
  return membership;
}

export async function requestRenewal(actor: AdminScope, membershipId: string) {
  const membership = await findMembership(membershipId);
  await assertMembershipAccess(actor, membership);
  if (actor.role !== 'MEMBER') throw new ScopeError('Only the member can request a renewal');
  if (membership.status !== 'ACTIVE' && membership.status !== 'EXPIRED') {
    throw new MembershipError('INVALID_TRANSITION', 'Only active or expired memberships can be renewed');
  }
  const existing = await RenewalRequest.findOne({
    membershipId: membership._id,
    status: { $in: ['PENDING', 'APPROVED', 'ACTIVE'] },
  }).exec();
  if (existing) throw new MembershipError('DUPLICATE_RENEWAL', 'A pending renewal already exists');
  let renewal;
  try {
    renewal = await RenewalRequest.create({
      membershipId: membership._id,
      memberId: membership.memberId,
      plan: membership.plan,
      amount: SUBSCRIPTION_AMOUNTS[membership.plan],
      status: 'PENDING',
      previousValidityStart: membership.validityStart,
      previousValidityEnd: membership.validityEnd,
    });
  } catch (error) {
    if (isDuplicate(error)) throw new MembershipError('DUPLICATE_RENEWAL', 'A pending renewal already exists');
    throw error;
  }
  await auditAction(actor.id, 'RENEWAL_REQUESTED', 'RENEWAL', renewal.id);
  return renewal;
}

export async function listRenewals(actor: AdminScope) {
  if (actor.role === 'MEMBER') throw new ScopeError();
  const members = await Member.find(memberScopeFilter(actor)).select('_id').lean();
  return RenewalRequest.find({ memberId: { $in: members.map((member) => member._id) } }).sort({ requestedAt: -1 }).exec();
}

export async function activateRenewalFromCapturedPayment(
  input: {
    renewalId: Types.ObjectId;
    paymentId: string;
    capturedAt: Date;
  },
  session: ClientSession,
) {
  const renewal = await RenewalRequest.findOneAndUpdate(
    { _id: input.renewalId, status: { $in: ['PENDING', 'APPROVED'] } },
    {
      $set: {
        status: 'ACTIVE',
        activatedAt: input.capturedAt,
        newValidityStart: input.capturedAt,
      },
    },
    { new: true, session },
  ).exec();
  if (!renewal) {
    const existing = await RenewalRequest.findById(input.renewalId).session(session).exec();
    if (existing?.status === 'ACTIVE') return existing;
    throw new MembershipError('INVALID_TRANSITION', 'Renewal is not pending payment activation');
  }
  const membership = await Membership.findById(renewal.membershipId).session(session).exec();
  if (!membership) throw new MembershipError('MEMBERSHIP_NOT_FOUND', 'Membership not found');
  if (renewal.plan === 'YEARLY') {
    const base = membership.status === 'ACTIVE' && membership.validityEnd && membership.validityEnd > input.capturedAt
      ? membership.validityEnd
      : input.capturedAt;
    renewal.newValidityStart = base;
    renewal.newValidityEnd = new Date(base.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
  await renewal.save({ session });
  membership.status = 'ACTIVE';
  membership.validityStart = renewal.newValidityStart;
  membership.validityEnd = renewal.newValidityEnd;
  membership.activatedAt = input.capturedAt;
  membership.activatedBy = SYSTEM_ACTOR_ID;
  await membership.save({ session });
  await synchronizeMemberStatus(
    membership.memberId,
    membership.status,
    { joinedAt: membership.validityStart, membershipExpiresAt: membership.validityEnd },
    session,
  );
  await auditAction(
    SYSTEM_ACTOR_ID.toString(),
    'RENEWAL_ACTIVATED',
    'RENEWAL',
    renewal.id,
    { paymentId: input.paymentId },
    session,
  );
  return renewal;
}
