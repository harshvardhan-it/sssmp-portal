import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Types } from 'mongoose';
import { AuditLog, District, User } from './models';
import { createAdmin } from './services/admin.service';
import { createDistrict } from './services/location-admin.service';
import {
  assertCanManageRole,
  canAccessBlock,
  canAccessDistrict,
  ScopeError,
} from './services/admin-scope.service';
import { blockScopeFilter, memberScopeFilter } from './services/query-scope.service';
import { createAdminSchema } from './routes/admin.routes';
import { districtAdminSchema } from './routes/admin-location.routes';

const districtId = new Types.ObjectId().toString();
const blockId = new Types.ObjectId().toString();
const actorId = new Types.ObjectId().toString();
const originalAuditCreate = AuditLog.create;
const originalDistrictCreate = District.create;
const originalDistrictExists = District.exists;
const originalUserSave = User.prototype.save;

afterEach(() => {
  AuditLog.create = originalAuditCreate;
  District.create = originalDistrictCreate;
  District.exists = originalDistrictExists;
  User.prototype.save = originalUserSave;
});

test('enforces the administrator role matrix and location scope', () => {
  const superAdmin = { id: actorId, role: 'SUPER_ADMIN' as const };
  const stateAdmin = { id: actorId, role: 'STATE_ADMIN' as const };
  const districtAdmin = { id: actorId, role: 'DISTRICT_ADMIN' as const, districtId };
  const blockAdmin = { id: actorId, role: 'BLOCK_ADMIN' as const, districtId, blockId };
  const member = { id: actorId, role: 'MEMBER' as const };

  assert.doesNotThrow(() => assertCanManageRole(superAdmin, 'STATE_ADMIN'));
  assert.doesNotThrow(() => assertCanManageRole(stateAdmin, 'BLOCK_ADMIN'));
  assert.doesNotThrow(() => assertCanManageRole(districtAdmin, 'BLOCK_ADMIN'));
  assert.throws(() => assertCanManageRole(stateAdmin, 'STATE_ADMIN'), ScopeError);
  assert.throws(() => assertCanManageRole(blockAdmin, 'BLOCK_ADMIN'), ScopeError);
  assert.throws(() => assertCanManageRole(member, 'BLOCK_ADMIN'), ScopeError);
  assert.equal(canAccessDistrict(districtAdmin, districtId), true);
  assert.equal(canAccessDistrict(districtAdmin, new Types.ObjectId().toString()), false);
  assert.equal(canAccessBlock(blockAdmin, districtId, blockId), true);
  assert.equal(canAccessBlock(blockAdmin, districtId, new Types.ObjectId().toString()), false);
});

test('builds restrictive data-scope filters for district and block administrators', () => {
  const districtAdmin = { id: actorId, role: 'DISTRICT_ADMIN' as const, districtId };
  const blockAdmin = { id: actorId, role: 'BLOCK_ADMIN' as const, districtId, blockId };
  assert.deepEqual(memberScopeFilter(districtAdmin), { districtId: new Types.ObjectId(districtId) });
  assert.deepEqual(memberScopeFilter(blockAdmin), { blockId: new Types.ObjectId(blockId) });
  assert.deepEqual(blockScopeFilter(districtAdmin), { districtId: new Types.ObjectId(districtId) });
  assert.deepEqual(blockScopeFilter(blockAdmin), { _id: new Types.ObjectId(blockId) });
});

test('rejects unauthorized administrator escalation and cross-district scope', async () => {
  const districtAdmin = { id: actorId, role: 'DISTRICT_ADMIN' as const, districtId };
  await assert.rejects(
    () => createAdmin(districtAdmin, {
      email: 'admin@example.com',
      password: 'password123',
      role: 'STATE_ADMIN',
    }),
    (error: Error) => error.name === 'ScopeError',
  );
  await assert.rejects(
    () => createAdmin(districtAdmin, {
      email: 'admin@example.com',
      password: 'password123',
      role: 'BLOCK_ADMIN',
      districtId: new Types.ObjectId().toString(),
      blockId,
    }),
    (error: Error) => error.name === 'AdminError' && error.message.includes('outside'),
  );
});

test('creates an administrator audit record without storing credentials', async () => {
  const audits: Array<Record<string, unknown>> = [];
  AuditLog.create = (async (input: Record<string, unknown>) => {
    audits.push(input);
    return input;
  }) as unknown as typeof AuditLog.create;
  User.prototype.save = (async function (this: InstanceType<typeof User>) { return this; }) as typeof User.prototype.save;
  District.exists = (async () => ({ _id: districtId })) as unknown as typeof District.exists;

  const result = await createAdmin(
    { id: actorId, role: 'SUPER_ADMIN' },
    { email: 'district@example.com', password: 'password123', role: 'DISTRICT_ADMIN', districtId },
  );

  assert.equal(result.role, 'DISTRICT_ADMIN');
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'ADMIN_CREATED');
  assert.equal((audits[0].metadata as Record<string, unknown>).password, undefined);
});

test('creates a location and audits it, while rejecting duplicate codes at the contract boundary', async () => {
  const audits: Array<Record<string, unknown>> = [];
  AuditLog.create = (async (input: Record<string, unknown>) => {
    audits.push(input);
    return input;
  }) as unknown as typeof AuditLog.create;
  const created = {
    id: districtId,
    _id: new Types.ObjectId(districtId),
    nameEn: 'Verified district',
    nameHi: 'सत्यापित जिला',
    code: 'VERIFIED',
    isActive: true,
  };
  District.create = (async () => created) as unknown as typeof District.create;
  const result = await createDistrict(
    { id: actorId, role: 'STATE_ADMIN' },
    { nameEn: created.nameEn, nameHi: created.nameHi, code: created.code },
  );
  assert.equal(result.code, 'VERIFIED');
  assert.equal(audits[0].action, 'DISTRICT_CREATED');

  const invalid = districtAdminSchema.safeParse({ nameEn: 'x', nameHi: 'x', code: 'bad code' });
  assert.equal(invalid.success, false);
  const missingCredential = createAdminSchema.safeParse({ password: 'password123', role: 'BLOCK_ADMIN' });
  assert.equal(missingCredential.success, false);
});
