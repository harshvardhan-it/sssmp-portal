import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import mongoose, { Types } from 'mongoose';
import {
  Block,
  District,
  AuditLog,
  Member,
  Membership,
  User,
} from './models';
import { registrationSchema } from './routes/member.routes';
import {
  registerMember,
  RegisterMemberInput,
} from './services/registration.service';

const districtId = new Types.ObjectId();
const blockId = new Types.ObjectId();
const originalDistrictFindOne = District.findOne;
const originalBlockFindOne = Block.findOne;
const originalBlockExists = Block.exists;
const originalMemberExists = Member.exists;
const originalMemberDeleteOne = Member.deleteOne;
const originalMembershipDeleteMany = Membership.deleteMany;
const originalUserSave = User.prototype.save;
const originalUserDeleteOne = User.deleteOne;
const originalMemberSave = Member.prototype.save;
const originalMembershipCreate = Membership.create;
const originalAuditCreate = AuditLog.create;
const originalStartSession = mongoose.startSession;

const validInput: RegisterMemberInput = {
  fullName: 'राजेश कुमार शर्मा',
  fatherHusbandName: 'श्री रामेश्वर शर्मा',
  dob: '1985-04-12',
  gender: 'Male',
  mobile: '9876543210',
  email: 'rajesh@example.com',
  address: 'Bhopal',
  district: districtId.toString(),
  block: blockId.toString(),
  schoolName: 'Government Higher Secondary School',
  designation: 'प्राथमिक शिक्षक',
  employeeId: 'EMP-MP-12345',
  selectedPlan: 'yearly',
  password: 'securePassword123',
};

function query<T>(value: T) {
  return {
    lean: async () => value,
  };
}

let duplicateUser = false;
let duplicateRegistrationId = false;
let duplicateEmployeeId = false;
let memberSaveCount = 0;
let userSaveCount = 0;
let membershipCreateCount = 0;
let auditCalls = 0;

beforeEach(() => {
  duplicateUser = false;
  duplicateRegistrationId = false;
  duplicateEmployeeId = false;
  memberSaveCount = 0;
  userSaveCount = 0;
  membershipCreateCount = 0;
  auditCalls = 0;
  (District.findOne as unknown as () => unknown) = (() =>
    query({
      _id: districtId,
      code: 'BPL',
      nameEn: 'Bhopal',
      nameHi: 'भोपाल',
    })) as typeof District.findOne;
  (Block.findOne as unknown as () => unknown) = (() =>
    query({
      _id: blockId,
      districtId,
      code: 'PHR',
      nameEn: 'Phanda Rural',
      nameHi: 'फंदा ग्रामीण',
    })) as typeof Block.findOne;
  (Block.exists as unknown as () => unknown) = async () => null;
  Member.exists = (async () => null) as unknown as typeof Member.exists;
  Member.deleteOne = (async () => ({ acknowledged: true, deletedCount: 0 })) as unknown as typeof Member.deleteOne;
  Membership.deleteMany = (async () => ({ acknowledged: true, deletedCount: 0 })) as unknown as typeof Membership.deleteMany;
  User.prototype.save = async function () {
    userSaveCount += 1;
    if (duplicateUser) {
      const error = Object.assign(new Error('duplicate user'), { code: 11000 });
      throw error;
    }
    return this;
  };
  User.deleteOne = (async () => ({ acknowledged: true, deletedCount: 0 })) as unknown as typeof User.deleteOne;
  Member.prototype.save = async function () {
    memberSaveCount += 1;
    if (duplicateEmployeeId) {
      const error = Object.assign(new Error('duplicate employee ID'), {
        code: 11000,
        keyPattern: { employeeId: 1 },
      });
      throw error;
    }
    if (duplicateRegistrationId && memberSaveCount === 1) {
      const error = Object.assign(new Error('duplicate registration'), {
        code: 11000,
        keyPattern: { registrationId: 1 },
      });
      throw error;
    }
    return this;
  };
  Membership.create = (async (input: Record<string, unknown>) => {
    membershipCreateCount += 1;
    return {
      ...input,
      _id: new Types.ObjectId(),
      id: new Types.ObjectId().toString(),
    };
  }) as unknown as typeof Membership.create;
  AuditLog.create = (async () => {
    auditCalls += 1;
    return {};
  }) as unknown as typeof AuditLog.create;
});

afterEach(() => {
  District.findOne = originalDistrictFindOne;
  Block.findOne = originalBlockFindOne;
  Block.exists = originalBlockExists;
  Member.exists = originalMemberExists;
  Member.deleteOne = originalMemberDeleteOne;
  Membership.deleteMany = originalMembershipDeleteMany;
  User.prototype.save = originalUserSave;
  User.deleteOne = originalUserDeleteOne;
  Member.prototype.save = originalMemberSave;
  Membership.create = originalMembershipCreate;
  AuditLog.create = originalAuditCreate;
  mongoose.startSession = originalStartSession;
});

test('creates a pending member registration with server-owned subscription amount', async () => {
  const result = await registerMember(validInput);

  assert.match(result.registrationId, /^SSSMP\d{10}$/);
  assert.equal(result.membershipStatus, 'PENDING');
  assert.equal(result.subscriptionPlan, 'YEARLY');
  assert.equal(result.subscriptionAmount, 120);
  assert.equal(result.member.status, 'PENDING');
  assert.equal(result.member.amount, 120);
  assert.equal(userSaveCount, 1);
  assert.equal(memberSaveCount, 1);
  assert.equal(membershipCreateCount, 1);
  assert.equal(auditCalls, 2);
});

test('rejects duplicate email or mobile registrations', async () => {
  duplicateUser = true;
  await assert.rejects(() => registerMember(validInput), { code: 11000 });
});

test('aborts a transient MongoDB transaction and safely retries registration once without a transaction', async () => {
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, writable: true, value: 1 });
  let transactionActive = false;
  let commitCalls = 0;
  let abortCalls = 0;
  mongoose.startSession = (async () => ({
    startTransaction: () => { transactionActive = true; },
    commitTransaction: async () => {
      commitCalls += 1;
      throw Object.assign(new Error('transient transaction failure'), {
        code: 251,
        errorLabelSet: new Set(['TransientTransactionError']),
      });
    },
    abortTransaction: async () => { abortCalls += 1; transactionActive = false; },
    inTransaction: () => transactionActive,
    endSession: async () => undefined,
  }) as unknown as ReturnType<typeof mongoose.startSession>) as typeof mongoose.startSession;

  try {
    const result = await registerMember(validInput);
    assert.equal(result.membershipStatus, 'PENDING');
    assert.equal(commitCalls, 1);
    assert.equal(abortCalls, 1);
    assert.equal(userSaveCount, 2);
    assert.equal(memberSaveCount, 2);
    assert.equal(membershipCreateCount, 2);
    assert.equal(auditCalls, 4);
  } finally {
    if (readyStateDescriptor) Object.defineProperty(mongoose.connection, 'readyState', readyStateDescriptor);
    else delete (mongoose.connection as unknown as { readyState?: number }).readyState;
    mongoose.startSession = originalStartSession;
  }
});

test('does not fall back to non-transaction registration when transaction abort fails', async () => {
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, writable: true, value: 1 });
  let transactionActive = false;
  mongoose.startSession = (async () => ({
    startTransaction: () => { transactionActive = true; },
    commitTransaction: async () => {
      throw Object.assign(new Error('transient transaction failure'), {
        code: 251,
        errorLabelSet: new Set(['TransientTransactionError']),
      });
    },
    abortTransaction: async () => { throw new Error('abort failed'); },
    inTransaction: () => transactionActive,
    endSession: async () => undefined,
  }) as unknown as ReturnType<typeof mongoose.startSession>) as typeof mongoose.startSession;

  try {
    await assert.rejects(() => registerMember(validInput), /abort failed/);
    assert.equal(userSaveCount, 1);
    assert.equal(memberSaveCount, 1);
    assert.equal(membershipCreateCount, 1);
  } finally {
    if (readyStateDescriptor) Object.defineProperty(mongoose.connection, 'readyState', readyStateDescriptor);
    else delete (mongoose.connection as unknown as { readyState?: number }).readyState;
    mongoose.startSession = originalStartSession;
  }
});

test('requires and trims the employee code at the request boundary', () => {
  const missing = registrationSchema.safeParse({
    ...validInput,
    employeeId: '   ',
    confirmPassword: validInput.password,
    agreeTerms: true,
  });
  assert.equal(missing.success, false);

  const normalized = registrationSchema.parse({
    ...validInput,
    employeeId: '  EMP-MP-987  ',
    confirmPassword: validInput.password,
    agreeTerms: true,
  });
  assert.equal(normalized.employeeId, 'EMP-MP-987');
});

test('rejects an employee code already registered', async () => {
  Member.exists = (async () => ({ _id: new Types.ObjectId() })) as unknown as typeof Member.exists;
  await assert.rejects(
    () => registerMember(validInput),
    (error: Error) => error.name === 'RegistrationError' && error.message.includes('Employee Code'),
  );
});

test('converts a concurrent employee-code duplicate into a clear registration error', async () => {
  duplicateEmployeeId = true;
  await assert.rejects(
    () => registerMember(validInput),
    (error: Error) => error.name === 'RegistrationError' && error.message.includes('verify your Employee Code'),
  );
});

test('declares a unique employee code index while preserving missing legacy records', () => {
  assert.ok(Member.schema.indexes().some(([fields, options]) =>
    fields.employeeId === 1 &&
    options?.unique === true &&
    JSON.stringify(options.partialFilterExpression) === JSON.stringify({ employeeId: { $type: 'string' } }),
  ));
});

test('rejects a block that is not in the selected district', async () => {
  Block.findOne = (() => query(null)) as typeof Block.findOne;
  Block.exists = (async () => ({ _id: blockId })) as unknown as typeof Block.exists;

  await assert.rejects(
    () => registerMember(validInput),
    (error: Error) => error.name === 'RegistrationError' &&
      error.message.includes('does not belong'),
  );
});

test('rejects invalid requests, role escalation fields, and client price tampering', () => {
  const invalid = registrationSchema.safeParse({
    ...validInput,
    agreeTerms: true,
    selectedPlan: 'SUPER_ADMIN',
    role: 'SUPER_ADMIN',
    amount: 1,
  });
  assert.equal(invalid.success, false);

  const priceTampering = registrationSchema.safeParse({
    ...validInput,
    agreeTerms: true,
    amount: 1,
  });
  assert.equal(priceTampering.success, false);
});

test('rejects duplicate registration IDs and retries generation', async () => {
  duplicateRegistrationId = true;
  const result = await registerMember(validInput);
  assert.match(result.registrationId, /^SSSMP\d{10}$/);
});
