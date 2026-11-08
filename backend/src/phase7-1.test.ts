import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { Types } from 'mongoose';
import { Block, District, Member, Membership, PaymentTransaction, User } from './models';
import { profileUpdateSchema } from './routes/member.routes';
import { getOwnMembership } from './services/membership.service';
import { getOwnPayment, listOwnPayments, PaymentError } from './services/payment.service';

const originals = {
  memberFindOne: Member.findOne,
  membershipFindOne: Membership.findOne,
  paymentFindOne: PaymentTransaction.findOne,
  paymentFind: PaymentTransaction.find,
};

afterEach(() => {
  Member.findOne = originals.memberFindOne;
  Membership.findOne = originals.membershipFindOne;
  PaymentTransaction.findOne = originals.paymentFindOne;
  PaymentTransaction.find = originals.paymentFind;
});

test('profile schema accepts editable fields and rejects privilege fields', () => {
  const valid = profileUpdateSchema.safeParse({ fullName: 'Updated Name', district: new Types.ObjectId().toString(), block: '' });
  assert.equal(valid.success, true);
  const escalation = profileUpdateSchema.safeParse({ role: 'SUPER_ADMIN', membershipStatus: 'ACTIVE', paymentStatus: 'CAPTURED', districtId: new Types.ObjectId().toString() });
  assert.equal(escalation.success, false);
});

test('profile location references remain explicit database identifiers', () => {
  const mismatch = profileUpdateSchema.safeParse({ district: 'not-an-object-id', block: new Types.ObjectId().toString() });
  assert.equal(mismatch.success, false);
  assert.equal(District.schema.path('isActive') !== undefined, true);
  assert.equal(Block.schema.path('districtId') !== undefined, true);
});

test('member membership lookup is scoped by authenticated user', async () => {
  const userId = new Types.ObjectId();
  const memberId = new Types.ObjectId();
  let filter: Record<string, unknown> | undefined;
  Member.findOne = ((value: Record<string, unknown>) => { filter = value; return { lean: async () => ({ _id: memberId }) }; }) as unknown as typeof Member.findOne;
  Membership.findOne = (() => ({ sort: () => ({ exec: async () => ({ _id: new Types.ObjectId(), memberId, membershipNumber: 'SSSMP-M-2026-1', plan: 'YEARLY', amount: 120, status: 'PENDING', appliedAt: new Date(), createdAt: new Date(), updatedAt: new Date() }) }) })) as unknown as typeof Membership.findOne;
  await getOwnMembership({ id: userId.toString(), role: 'MEMBER' });
  assert.deepEqual(filter, { userId });
});

test('payment history and receipts use the authenticated member owner', async () => {
  const userId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  let historyFilter: Record<string, unknown> | undefined;
  let receiptFilter: Record<string, unknown> | undefined;
  Member.findOne = (() => ({ lean: async () => ({ _id: ownerId }) })) as unknown as typeof Member.findOne;
  PaymentTransaction.find = ((value: Record<string, unknown>) => { historyFilter = value; return { sort: () => ({ exec: async () => [] }) }; }) as unknown as typeof PaymentTransaction.find;
  PaymentTransaction.findOne = ((value: Record<string, unknown>) => { receiptFilter = value; return { exec: async () => null }; }) as unknown as typeof PaymentTransaction.findOne;
  await listOwnPayments({ id: userId.toString(), role: 'MEMBER' });
  await assert.rejects(() => getOwnPayment({ id: userId.toString(), role: 'MEMBER' }, new Types.ObjectId().toString()), (error: PaymentError) => error.code === 'PAYMENT_NOT_FOUND');
  assert.deepEqual(historyFilter, { memberId: ownerId });
  assert.equal(receiptFilter?.memberId, ownerId);
});

test('membership and payment models expose server-owned status fields', () => {
  assert.equal(Membership.schema.path('status').options.required, true);
  assert.equal(PaymentTransaction.schema.path('status').options.required, true);
  assert.equal(User.schema.path('role').options.required, true);
});
