import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Types } from 'mongoose';
import { AuditLog, Block, District, Member, Membership, User } from './models';
import { seedDistrictRecords } from './scripts/seed-mp-districts';
import { assignMemberBlock, listUnassignedMembers } from './services/location-admin.service';
import { registerMember } from './services/registration.service';

const districtId = new Types.ObjectId();
const blockId = new Types.ObjectId();
const memberId = new Types.ObjectId();
const originalDistrictUpdateOne = District.updateOne;
const originalDistrictExists = District.exists;
const originalBlockFindOne = Block.findOne;
const originalMemberExists = Member.exists;
const originalMemberFindOneAndUpdate = Member.findOneAndUpdate;
const originalMemberFind = Member.find;
const originalAuditCreate = AuditLog.create;

afterEach(() => {
  District.updateOne = originalDistrictUpdateOne;
  District.exists = originalDistrictExists;
  Block.findOne = originalBlockFindOne;
  Member.exists = originalMemberExists;
  Member.findOneAndUpdate = originalMemberFindOneAndUpdate;
  Member.find = originalMemberFind;
  AuditLog.create = originalAuditCreate;
});

test('district seeder is insert-only and idempotent', async () => {
  const updates: Array<Record<string, unknown>> = [];
  District.updateOne = (async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
    updates.push({ filter, update });
    return { upsertedCount: updates.length === 1 ? 1 : 0 };
  }) as unknown as typeof District.updateOne;
  const data = {
    source: 'Government directory',
    sourceUrl: 'https://igod.gov.in/sg/MP/E042/organizations',
    retrievedAt: '2026-11-06',
    districts: [
      { code: 'MP_ONE', nameEn: 'One', nameHi: 'एक' },
      { code: 'MP_TWO', nameEn: 'Two', nameHi: 'दो' },
    ],
  } as never;

  const first = await seedDistrictRecords(data);
  const second = await seedDistrictRecords(data);
  assert.deepEqual(first, { inserted: 1, existing: 1, failed: 0 });
  assert.deepEqual(second, { inserted: 0, existing: 2, failed: 0 });
  assert.equal((updates[0].update as { $setOnInsert: { blocks?: unknown } }).$setOnInsert.blocks, undefined);
});

test('registration accepts a valid district without a block', async () => {
  const originalDistrictFindOne = District.findOne;
  const originalUserSave = User.prototype.save;
  const originalMemberSave = Member.prototype.save;
  const originalMembershipCreate = Membership.create;
  District.findOne = (() => ({ lean: async () => ({ _id: districtId, nameEn: 'Bhopal', nameHi: 'भोपाल' }) })) as typeof District.findOne;
  Member.prototype.save = (async function (this: InstanceType<typeof Member>) { return this; }) as typeof Member.prototype.save;
  Member.exists = (async () => null) as unknown as typeof Member.exists;
  User.prototype.save = (async function (this: InstanceType<typeof User>) { return this; }) as typeof User.prototype.save;
  Membership.create = (async () => ({ _id: new Types.ObjectId(), id: new Types.ObjectId().toString() })) as unknown as typeof Membership.create;
  AuditLog.create = (async () => ({})) as unknown as typeof AuditLog.create;
  try {
    const result = await registerMember({
      fullName: 'Test Member',
      fatherHusbandName: 'Test Parent',
      dob: '1990-01-01',
      mobile: '9000000000',
      district: districtId.toString(),
      block: '',
      schoolName: 'Test School',
      designation: 'Teacher',
      employeeId: 'EMP-LOCATION-001',
      selectedPlan: 'yearly',
      password: 'strong-password',
    });

    test('registration rejects an invalid district even when block is omitted', async () => {
      await assert.rejects(
        () => registerMember({
          fullName: 'Test Member',
          fatherHusbandName: 'Test Parent',
          dob: '1990-01-01',
          mobile: '9000000001',
          district: 'not-an-object-id',
          block: '',
          schoolName: 'Test School',
          designation: 'Teacher',
          employeeId: 'EMP-LOCATION-002',
          selectedPlan: 'yearly',
          password: 'strong-password',
        }),
        (error: Error) => error.name === 'RegistrationError' && error.message.includes('district'),
      );
    });
    assert.equal(result.member.block, '');
  } finally {
    District.findOne = originalDistrictFindOne;
    User.prototype.save = originalUserSave;
    Member.prototype.save = originalMemberSave;
    Membership.create = originalMembershipCreate;
  }
});

test('only scoped state or district admins can assign an unassigned member', async () => {
  Block.findOne = (() => ({ lean: async () => ({ _id: blockId, districtId, isActive: true }) })) as typeof Block.findOne;
  Member.findOneAndUpdate = (() => ({
    exec: async () => ({ _id: memberId }),
  })) as unknown as typeof Member.findOneAndUpdate;
  AuditLog.create = (async (input: Record<string, unknown>) => input) as unknown as typeof AuditLog.create;

  await assert.rejects(
    () => assignMemberBlock({ id: new Types.ObjectId().toString(), role: 'BLOCK_ADMIN', blockId: blockId.toString() }, memberId.toString(), blockId.toString()),
    (error: Error) => error.name === 'ScopeError',
  );
  const assigned = await assignMemberBlock(
    { id: new Types.ObjectId().toString(), role: 'DISTRICT_ADMIN', districtId: districtId.toString() },
    memberId.toString(),
    blockId.toString(),
  );
  assert.equal(assigned._id, memberId);

  await assert.rejects(
    () => assignMemberBlock(
      { id: new Types.ObjectId().toString(), role: 'DISTRICT_ADMIN', districtId: new Types.ObjectId().toString() },
      memberId.toString(),
      blockId.toString(),
    ),
    (error: Error) => error.name === 'LocationAdminError' && error.message.includes('outside'),
  );
});

test('unassigned member listing is never available to block admins', async () => {
  await assert.rejects(
    () => listUnassignedMembers({ id: new Types.ObjectId().toString(), role: 'BLOCK_ADMIN', blockId: blockId.toString() }),
    (error: Error) => error.name === 'ScopeError',
  );
});
