import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Types } from 'mongoose';
import { AuditLog, Member, Membership, RenewalRequest, User } from './models';
import { expireMemberships } from './services/membership-expiration.service';
import {
  requestRenewal,
} from './services/membership.service';

const memberId = new Types.ObjectId();
const membershipId = new Types.ObjectId();
const actorId = new Types.ObjectId();
const originalMembershipFindOneAndUpdate = Membership.findOneAndUpdate;
const originalMembershipFindById = Membership.findById;
const originalMemberUpdateOne = Member.updateOne;
const originalMemberExists = Member.exists;
const originalRenewalFindOne = RenewalRequest.findOne;
const originalRenewalCreate = RenewalRequest.create;
const originalAuditCreate = AuditLog.create;
const originalUserFindOne = User.findOne;
const originalUserCreate = User.create;

afterEach(() => {
  Membership.findOneAndUpdate = originalMembershipFindOneAndUpdate;
  Membership.findById = originalMembershipFindById;
  Member.updateOne = originalMemberUpdateOne;
  Member.exists = originalMemberExists;
  RenewalRequest.findOne = originalRenewalFindOne;
  RenewalRequest.create = originalRenewalCreate;
  AuditLog.create = originalAuditCreate;
  User.findOne = originalUserFindOne;
  User.create = originalUserCreate;
});

test('declares singleton and duplicate-prevention indexes', () => {
  assert.ok(User.schema.indexes().some(([fields, options]) =>
    fields.role === 1 &&
    options?.unique === true &&
    JSON.stringify(options.partialFilterExpression) === JSON.stringify({ role: 'SUPER_ADMIN' }),
  ));
  assert.ok(Membership.schema.indexes().some(([fields, options]) =>
    fields.memberId === 1 && options?.unique === true,
  ));
  assert.ok(RenewalRequest.schema.indexes().some(([fields, options]) =>
    fields.membershipId === 1 && options?.unique === true,
  ));
});

test('maps a concurrent bootstrap loser to an already-exists error', async () => {
  User.findOne = (() => ({ exec: async () => null })) as unknown as typeof User.findOne;
  let attempts = 0;
  User.create = (async () => {
    attempts += 1;
    if (attempts === 1) {
      return { _id: actorId, id: actorId.toString(), role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' };
    }
    throw Object.assign(new Error('duplicate role'), {
      code: 11000,
      keyPattern: { role: 1 },
    });
  }) as unknown as typeof User.create;
  AuditLog.create = (async () => ({})) as unknown as typeof AuditLog.create;

  const results = await Promise.allSettled([
    import('./services/bootstrap.service').then(({ bootstrapSuperAdmin }) =>
      bootstrapSuperAdmin({ email: 'one@example.com', password: 'strong-runtime-password' })),
    import('./services/bootstrap.service').then(({ bootstrapSuperAdmin }) =>
      bootstrapSuperAdmin({ email: 'two@example.com', password: 'strong-runtime-password' })),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.match(String(rejected && rejected.status === 'rejected' ? rejected.reason : ''), /already exists/i);
});

test('rejects renewal requests for non-eligible membership states', async () => {
  const membership = {
    _id: membershipId,
    memberId,
    status: 'PENDING' as const,
  };
  Membership.findById = (() => ({ exec: async () => membership })) as unknown as typeof Membership.findById;
  Member.exists = (async () => true) as unknown as typeof Member.exists;
  await assert.rejects(
    () => requestRenewal({ id: memberId.toString(), role: 'MEMBER' }, membershipId.toString()),
    /active or expired/i,
  );
});

test('expires active memberships once and synchronizes the derived member status', async () => {
  let remaining = 1;
  const expired = {
    _id: membershipId,
    memberId,
    status: 'EXPIRED' as const,
  };
  Membership.findOneAndUpdate = (() => ({
    exec: async () => remaining-- > 0 ? expired : null,
  })) as unknown as typeof Membership.findOneAndUpdate;
  Member.updateOne = (() => ({ exec: async () => ({ matchedCount: 1 }) })) as unknown as typeof Member.updateOne;
  AuditLog.create = (async () => ({})) as unknown as typeof AuditLog.create;

  assert.deepEqual(await expireMemberships(new Date('2026-12-01')), { expiredCount: 1 });
  assert.deepEqual(await expireMemberships(new Date('2026-12-01')), { expiredCount: 0 });
});
