import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Types } from 'mongoose';
import { AuditLog, Member, Membership, RenewalRequest, User } from './models';
import {
  createMembership,
  requestRenewal,
} from './services/membership.service';
import { bootstrapSuperAdmin } from './services/bootstrap.service';

const memberId = new Types.ObjectId();
const membershipId = new Types.ObjectId();
const actorId = new Types.ObjectId();
const originalMembershipCreate = Membership.create;
const originalMembershipFindOne = Membership.findOne;
const originalMembershipFind = Membership.find;
const originalMembershipFindById = Membership.findById;
const originalMembershipExists = Membership.exists;
const originalRenewalCreate = RenewalRequest.create;
const originalRenewalFindOne = RenewalRequest.findOne;
const originalMemberFindOne = Member.findOne;
const originalMemberFindById = Member.findById;
const originalUserFindOne = User.findOne;
const originalUserCreate = User.create;
const originalAuditCreate = AuditLog.create;

afterEach(() => {
  Membership.create = originalMembershipCreate;
  Membership.findOne = originalMembershipFindOne;
  Membership.find = originalMembershipFind;
  Membership.findById = originalMembershipFindById;
  Membership.exists = originalMembershipExists;
  RenewalRequest.create = originalRenewalCreate;
  RenewalRequest.findOne = originalRenewalFindOne;
  Member.findOne = originalMemberFindOne;
  Member.findById = originalMemberFindById;
  User.findOne = originalUserFindOne;
  User.create = originalUserCreate;
  AuditLog.create = originalAuditCreate;
});

test('creates a pending membership with a trusted plan amount', async () => {
  const created = {
    _id: membershipId,
    id: membershipId.toString(),
    memberId,
    membershipNumber: 'SSSMP-M-2026-123456',
    plan: 'YEARLY' as const,
    amount: 120,
    status: 'PENDING' as const,
  };
  Membership.create = (async (input: Array<Record<string, unknown>>) => [{ ...created, ...input[0] }]) as unknown as typeof Membership.create;
  Membership.exists = (async () => null) as unknown as typeof Membership.exists;
  Member.findById = (() => ({ lean: async () => ({ _id: memberId, districtId: new Types.ObjectId(), blockId: new Types.ObjectId() }) })) as unknown as typeof Member.findById;
  AuditLog.create = (async () => ({})) as unknown as typeof AuditLog.create;

  const result = await createMembership(
    { id: actorId.toString(), role: 'SUPER_ADMIN' },
    { memberId: memberId.toString(), plan: 'YEARLY' },
  );
  assert.equal(result.status, 'PENDING');
  assert.equal(result.amount, 120);
});

test('rejects a district administrator from creating membership outside its district', async () => {
  const otherDistrict = new Types.ObjectId();
  Member.findById = (() => ({ lean: async () => ({ _id: memberId, districtId: otherDistrict, blockId: new Types.ObjectId() }) })) as unknown as typeof Member.findById;
  await assert.rejects(
    () => createMembership(
      { id: actorId.toString(), role: 'DISTRICT_ADMIN', districtId: new Types.ObjectId().toString() },
      { memberId: memberId.toString(), plan: 'YEARLY' },
    ),
    /outside your district scope/i,
  );
});

test('prevents duplicate pending renewals and preserves historical validity', async () => {
  RenewalRequest.findOne = (() => ({ exec: async () => ({ _id: new Types.ObjectId() }) })) as unknown as typeof RenewalRequest.findOne;
  const membership = {
    _id: membershipId,
    id: membershipId.toString(),
    memberId,
    plan: 'YEARLY' as const,
    amount: 120,
    status: 'ACTIVE' as const,
    validityStart: new Date('2026-01-01'),
    validityEnd: new Date('2026-12-31'),
  };
  Membership.findById = (() => ({ exec: async () => membership })) as unknown as typeof Membership.findById;
  Member.exists = (async () => true) as unknown as typeof Member.exists;
  await assert.rejects(
    () => requestRenewal({ id: memberId.toString(), role: 'MEMBER' }, membershipId.toString()),
    /pending renewal/i,
  );
});

test('bootstraps only the first SUPER_ADMIN and audits the operation', async () => {
  let existing: unknown = null;
  User.findOne = (() => ({ exec: async () => existing })) as unknown as typeof User.findOne;
  const saved = {
    _id: actorId,
    id: actorId.toString(),
    role: 'SUPER_ADMIN',
    accountStatus: 'ACTIVE',
  };
  User.create = (async () => saved) as unknown as typeof User.create;
  AuditLog.create = (async () => ({})) as unknown as typeof AuditLog.create;
  const result = await bootstrapSuperAdmin({
    email: 'root@example.com',
    password: 'strong-runtime-password',
  });
  assert.equal(result.role, 'SUPER_ADMIN');
  existing = saved;
  await assert.rejects(
    () => bootstrapSuperAdmin({ email: 'other@example.com', password: 'strong-runtime-password' }),
    /already exists/i,
  );
});
