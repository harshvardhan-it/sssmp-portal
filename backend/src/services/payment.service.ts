import crypto from 'node:crypto';
import mongoose, { ClientSession, Types } from 'mongoose';
import { AuditLog, Member, Membership, PaymentTransaction, RenewalRequest } from '../models';
import type { PaymentTransactionDocument } from '../models/payment-transaction.model';
import { SYSTEM_ACTOR_ID } from '../models/audit-log.model';
import { SUBSCRIPTION_AMOUNTS } from '../models/types';
import {
  createProviderOrder,
  createProviderRefund,
  fetchProviderPayment,
  publicKeyId,
  verifyCheckoutSignature,
  type RazorpayPayment,
} from './razorpay.service';
import {
  activateMembershipFromCapturedPayment,
  activateRenewalFromCapturedPayment,
} from './membership.service';
import { AdminScope, assertScopeId, ScopeError } from './admin-scope.service';

const ACTIVE_PAYMENT_STATUSES = ['CREATED', 'ORDER_CREATED', 'AUTHORIZED', 'CAPTURED'] as const;

export class PaymentError extends Error {
  constructor(
    public readonly code:
      | 'PAYMENT_NOT_FOUND'
      | 'PAYMENT_NOT_ELIGIBLE'
      | 'PAYMENT_OWNERSHIP'
      | 'PAYMENT_CONFLICT'
      | 'PAYMENT_VERIFICATION_FAILED'
      | 'PAYMENT_PROVIDER_UNAVAILABLE'
      | 'PAYMENT_TRANSACTION_REQUIRED'
      | 'PAYMENT_REFUND_INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

function isDuplicate(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error &&
    (error as { code?: number }).code === 11000);
}

function receipt(): string {
  return `sssmp_${new Date().getFullYear()}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function amountPaise(rupees: number): number {
  return rupees * 100;
}

function safePayment(payment: {
  id?: string;
  _id?: Types.ObjectId;
  membershipId: Types.ObjectId;
  renewalRequestId?: Types.ObjectId;
  plan: string;
  amountPaise: number;
  currency: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  internalReceipt: string;
  status: string;
  capturedAt?: Date;
  refundedAmountPaise: number;
  refundStatus: string;
  providerRefundId?: string;
  createdAt: Date;
}) {
  return {
    id: payment.id ?? payment._id?.toString(),
    membershipId: payment.membershipId.toString(),
    renewalRequestId: payment.renewalRequestId?.toString(),
    plan: payment.plan,
    amountPaise: payment.amountPaise,
    currency: payment.currency,
    provider: 'RAZORPAY',
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    internalReceipt: payment.internalReceipt,
    status: payment.status,
    capturedAt: payment.capturedAt,
    refundedAmountPaise: payment.refundedAmountPaise,
    refundStatus: payment.refundStatus,
    providerRefundId: payment.providerRefundId,
    createdAt: payment.createdAt,
  };
}

async function memberForActor(actor: AdminScope) {
  if (actor.role !== 'MEMBER') throw new ScopeError('Only members can create payment orders');
  const member = await Member.findOne({ userId: assertScopeId(actor.id, 'user') }).lean();
  if (!member) throw new PaymentError('PAYMENT_OWNERSHIP', 'Member profile not found');
  return member;
}

async function auditPayment(
  action:
    | 'PAYMENT_ORDER_CREATED'
    | 'PAYMENT_AUTHORIZED'
    | 'PAYMENT_CAPTURED'
    | 'PAYMENT_FAILED'
    | 'PAYMENT_VERIFICATION_FAILED'
    | 'PAYMENT_REFUNDED'
    | 'PAYMENT_PARTIALLY_REFUNDED',
  paymentId: Types.ObjectId,
  metadata: Record<string, string | number | boolean | null>,
  session?: ClientSession,
) {
  await AuditLog.create([{
    actorUserId: SYSTEM_ACTOR_ID,
    action,
    targetEntityType: 'PAYMENT',
    targetEntityId: paymentId,
    metadata,
  }], session ? { session } : undefined);
}

async function loadBusinessOperation(
  memberId: Types.ObjectId,
  input: { membershipId?: string; renewalRequestId?: string },
) {
  if ((!input.membershipId && !input.renewalRequestId) || (input.membershipId && input.renewalRequestId)) {
    throw new PaymentError('PAYMENT_NOT_ELIGIBLE', 'Provide exactly one membership or renewal reference');
  }
  if (input.membershipId) {
    const membership = await Membership.findOne({
      _id: assertScopeId(input.membershipId, 'membership'),
      memberId,
    }).exec();
    if (!membership || !['PENDING', 'APPROVED'].includes(membership.status)) {
      throw new PaymentError('PAYMENT_NOT_ELIGIBLE', 'Membership is not pending payment');
    }
    return {
      membershipId: membership._id,
      renewalRequestId: undefined,
      plan: membership.plan,
      amountPaise: amountPaise(membership.amount),
    };
  }
  const renewal = await RenewalRequest.findOne({
    _id: assertScopeId(input.renewalRequestId as string, 'renewal'),
    memberId,
  }).exec();
  if (!renewal || !['PENDING', 'APPROVED'].includes(renewal.status)) {
    throw new PaymentError('PAYMENT_NOT_ELIGIBLE', 'Renewal is not pending payment');
  }
  return {
    membershipId: renewal.membershipId,
    renewalRequestId: renewal._id,
    plan: renewal.plan,
    amountPaise: amountPaise(SUBSCRIPTION_AMOUNTS[renewal.plan]),
  };
}

export async function createPaymentOrder(
  actor: AdminScope,
  input: { membershipId?: string; renewalRequestId?: string },
) {
  const member = await memberForActor(actor);
  const operation = await loadBusinessOperation(member._id, input);
  const existing = await PaymentTransaction.findOne({
    membershipId: operation.membershipId,
    ...(operation.renewalRequestId ? { renewalRequestId: operation.renewalRequestId } : { renewalRequestId: { $exists: false } }),
    status: { $in: ACTIVE_PAYMENT_STATUSES },
  }).exec();
  if (existing) {
    if (!existing.providerOrderId) {
      throw new PaymentError('PAYMENT_CONFLICT', 'A payment attempt is pending reconciliation');
    }
    return { keyId: publicKeyId(), payment: safePayment(existing) };
  }

  let payment: PaymentTransactionDocument;
  try {
    const created = await PaymentTransaction.create({
      memberId: member._id,
      membershipId: operation.membershipId,
      renewalRequestId: operation.renewalRequestId,
      plan: operation.plan,
      amountPaise: operation.amountPaise,
      currency: 'INR',
      provider: 'RAZORPAY',
      internalReceipt: receipt(),
      status: 'CREATED',
      refundedAmountPaise: 0,
      refundStatus: 'NONE',
    });
    payment = created;
  } catch (error) {
    if (isDuplicate(error)) throw new PaymentError('PAYMENT_CONFLICT', 'A payment attempt already exists');
    throw error;
  }

  try {
    const order = await createProviderOrder({
      amountPaise: payment.amountPaise,
      receipt: payment.internalReceipt,
      notes: {
        payment_transaction_id: payment.id,
        membership_id: payment.membershipId.toString(),
        ...(payment.renewalRequestId ? { renewal_request_id: payment.renewalRequestId.toString() } : {}),
      },
    });
    payment.providerOrderId = order.id;
    payment.status = 'ORDER_CREATED';
    await payment.save();
    await auditPayment('PAYMENT_ORDER_CREATED', payment._id, {
      orderId: order.id,
      amountPaise: payment.amountPaise,
    });
    return { keyId: publicKeyId(), payment: safePayment(payment) };
  } catch (error) {
    payment.status = 'FAILED';
    payment.failedAt = new Date();
    payment.failureReason = 'Provider order creation failed';
    await payment.save().catch(() => undefined);
    throw new PaymentError('PAYMENT_PROVIDER_UNAVAILABLE', 'Payment provider is temporarily unavailable');
  }
}

async function assertCapturedPayment(
  payment: PaymentTransactionDocument | null,
  input: { orderId: string; paymentId: string; signature: string },
): Promise<RazorpayPayment> {
  if (!payment || !payment.providerOrderId || payment.providerOrderId !== input.orderId) {
    throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Payment order does not match the stored transaction');
  }
  if (!verifyCheckoutSignature(payment.providerOrderId, input.paymentId, input.signature)) {
    throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Payment signature is invalid');
  }
  const providerPayment = await fetchProviderPayment(input.paymentId);
  if (
    providerPayment.order_id !== payment.providerOrderId ||
    providerPayment.amount !== payment.amountPaise ||
    providerPayment.currency !== payment.currency ||
    providerPayment.status !== 'captured'
  ) {
    throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Payment was not captured for this transaction');
  }
  return providerPayment;
}

export async function verifyPayment(
  actor: AdminScope,
  input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  const member = await memberForActor(actor);
  const payment = await PaymentTransaction.findOne({
    providerOrderId: input.razorpayOrderId,
    memberId: member._id,
  }).exec();
  if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND', 'Payment transaction not found');
  if (payment.status === 'CAPTURED') return safePayment(payment);

  let providerPayment: RazorpayPayment;
  try {
    providerPayment = await assertCapturedPayment(payment, {
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });
  } catch (error) {
    await auditPayment('PAYMENT_VERIFICATION_FAILED', payment._id, { orderId: payment.providerOrderId ?? null });
    if (error instanceof PaymentError) throw error;
    throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Payment could not be verified');
  }

  if (mongoose.connection.readyState !== 1) {
    throw new PaymentError('PAYMENT_TRANSACTION_REQUIRED', 'Payment verification requires a database transaction');
  }
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const current = await PaymentTransaction.findOneAndUpdate(
        { _id: payment._id, status: { $ne: 'CAPTURED' } },
        {
          $set: {
            providerPaymentId: providerPayment.id,
            status: 'CAPTURED',
            capturedAt: new Date(),
          },
        },
        { new: true, session },
      ).exec();
      if (!current) {
        result = await PaymentTransaction.findById(payment._id).session(session).exec();
        return;
      }
      if (current.renewalRequestId) {
        await activateRenewalFromCapturedPayment({
          renewalId: current.renewalRequestId,
          paymentId: providerPayment.id,
          capturedAt: current.capturedAt as Date,
        }, session);
      } else {
        await activateMembershipFromCapturedPayment({
          membershipId: current.membershipId,
          paymentId: providerPayment.id,
          capturedAt: current.capturedAt as Date,
        }, session);
      }
      await auditPayment('PAYMENT_CAPTURED', current._id, {
        paymentId: providerPayment.id,
        amountPaise: current.amountPaise,
      }, session);
      result = current;
    });
    if (!result) throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Payment verification did not complete');
    return safePayment(result);
  } finally {
    await session.endSession();
  }
}

export async function listOwnPayments(actor: AdminScope) {
  const member = await memberForActor(actor);
  const payments = await PaymentTransaction.find({ memberId: member._id }).sort({ createdAt: -1 }).exec();
  return payments.map(safePayment);
}

export async function getOwnPayment(actor: AdminScope, paymentId: string) {
  const member = await memberForActor(actor);
  const payment = await PaymentTransaction.findOne({
    _id: assertScopeId(paymentId, 'payment'),
    memberId: member._id,
  }).exec();
  if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND', 'Payment transaction not found');
  return safePayment(payment);
}

export async function getPaymentForScope(actor: AdminScope, paymentId: string) {
  if (actor.role === 'MEMBER') throw new ScopeError();
  const payment = await PaymentTransaction.findById(assertScopeId(paymentId, 'payment')).exec();
  if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND', 'Payment transaction not found');
  const member = await Member.findById(payment.memberId).lean();
  if (!member) throw new PaymentError('PAYMENT_NOT_FOUND', 'Member profile not found');
  if (actor.role === 'DISTRICT_ADMIN' && actor.districtId !== member.districtId.toString()) throw new ScopeError();
  if (actor.role === 'BLOCK_ADMIN' && (!member.blockId || actor.blockId !== member.blockId.toString())) throw new ScopeError();
  return safePayment(payment);
}

export async function listPaymentsForScope(actor: AdminScope) {
  if (actor.role === 'MEMBER') throw new ScopeError();
  const memberFilter = actor.role === 'DISTRICT_ADMIN'
    ? { districtId: assertScopeId(actor.districtId ?? '', 'district') }
    : actor.role === 'BLOCK_ADMIN'
      ? { blockId: assertScopeId(actor.blockId ?? '', 'block') }
      : {};
  const members = await Member.find(memberFilter).select('_id').lean();
  const payments = await PaymentTransaction.find({ memberId: { $in: members.map((member) => member._id) } })
    .sort({ createdAt: -1 })
    .limit(500)
    .exec();
  return payments.map(safePayment);
}

export async function refundPayment(
  actor: AdminScope,
  paymentId: string,
  requestedAmountPaise: number | undefined,
  reason: string,
) {
  const payment = await PaymentTransaction.findById(assertScopeId(paymentId, 'payment')).exec();
  if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND', 'Payment transaction not found');
  await getPaymentForScope(actor, paymentId);
  if (payment.status !== 'CAPTURED' || !payment.providerPaymentId) {
    throw new PaymentError('PAYMENT_REFUND_INVALID', 'Only captured payments can be refunded');
  }
  const remaining = payment.amountPaise - payment.refundedAmountPaise;
  const amountPaise = requestedAmountPaise ?? remaining;
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 1 || amountPaise > remaining || !reason.trim()) {
    throw new PaymentError('PAYMENT_REFUND_INVALID', 'Refund amount or reason is invalid');
  }
  const claimed = await PaymentTransaction.findOneAndUpdate(
    {
      _id: payment._id,
      status: 'CAPTURED',
      refundStatus: { $in: ['NONE', 'PARTIALLY_REFUNDED', 'FAILED'] },
      refundedAmountPaise: payment.refundedAmountPaise,
    },
    { $set: { refundStatus: 'PENDING' } },
    { new: true },
  ).exec();
  if (!claimed) throw new PaymentError('PAYMENT_CONFLICT', 'Another refund is already being processed');
  try {
    const refund = await createProviderRefund(payment.providerPaymentId, amountPaise, { reason: reason.trim() });
    const total = payment.refundedAmountPaise + refund.amount;
    const updated = await PaymentTransaction.findByIdAndUpdate(
      payment._id,
      {
        $set: {
          refundedAmountPaise: total,
          refundStatus: total === payment.amountPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          providerRefundId: refund.id,
        },
      },
      { new: true },
    ).exec();
    await auditPayment(
      total === payment.amountPaise ? 'PAYMENT_REFUNDED' : 'PAYMENT_PARTIALLY_REFUNDED',
      payment._id,
      { amountPaise: refund.amount, reason: reason.trim() },
    );
    return safePayment(updated!);
  } catch (error) {
    await PaymentTransaction.updateOne(
      { _id: payment._id, refundStatus: 'PENDING' },
      { $set: { refundStatus: 'FAILED' } },
    ).exec();
    throw error;
  }
}
