import crypto from 'node:crypto';
import mongoose, { ClientSession, Types } from 'mongoose';
import { AuditLog, Member, Membership, PaymentTransaction, RenewalRequest } from '../models';
import type { PaymentTransactionDocument } from '../models/payment-transaction.model';
import { SYSTEM_ACTOR_ID } from '../models/audit-log.model';
import { SUBSCRIPTION_AMOUNTS } from '../models/types';
import { createProviderRefund } from './razorpay.service';
import { createCashfreeOrder, createCashfreeRefund, cashfreeMode } from './cashfree.service';
import { reconcileCashfreeOrder } from './cashfree-webhook.service';
import {
  activateMembershipFromCapturedPayment,
  activateRenewalFromCapturedPayment,
} from './membership.service';
import { AdminScope, assertScopeId, ScopeError } from './admin-scope.service';
import { env } from '../config/env';

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
  provider: 'RAZORPAY' | 'CASHFREE';
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
    provider: payment.provider,
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
    if (existing.provider !== 'CASHFREE' || !existing.providerOrderId) {
      throw new PaymentError('PAYMENT_CONFLICT', 'A legacy Razorpay payment attempt must be reconciled before a new Cashfree attempt can be created');
    }
    const sessionId = existing.metadata?.cashfreePaymentSessionId;
    if (typeof sessionId !== 'string') throw new PaymentError('PAYMENT_CONFLICT', 'Cashfree payment session is unavailable; contact support');
    return { paymentSessionId: sessionId, mode: cashfreeMode(), payment: safePayment(existing) };
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
      provider: 'CASHFREE',
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
    const order = await createCashfreeOrder({
      orderId: payment.internalReceipt,
      amountPaise: payment.amountPaise,
      customerId: member._id.toString(),
      customerName: member.fullName,
      customerPhone: member.mobile,
      customerEmail: member.email,
      returnUrl: `${env.frontendUrl.replace(/\\/$/, '')}/member/payments?cashfree_order_id={order_id}`,
      notifyUrl: env.cashfreeWebhookUrl || undefined,
    });
    payment.provider = 'CASHFREE';
    payment.providerOrderId = order.order_id;
    payment.metadata = { ...(payment.metadata ?? {}), cashfreePaymentSessionId: order.payment_session_id };
    payment.status = 'ORDER_CREATED';
    await payment.save();
    await auditPayment('PAYMENT_ORDER_CREATED', payment._id, {
      orderId: order.order_id,
      amountPaise: payment.amountPaise,
      provider: 'CASHFREE',
    });
    return { paymentSessionId: order.payment_session_id, mode: cashfreeMode(), payment: safePayment(payment) };
  } catch (error) {
    payment.status = 'FAILED';
    payment.failedAt = new Date();
    payment.failureReason = 'Provider order creation failed';
    await payment.save().catch(() => undefined);
    throw new PaymentError('PAYMENT_PROVIDER_UNAVAILABLE', 'Payment provider is temporarily unavailable');
  }
}

export async function verifyPayment(
  actor: AdminScope,
  input: { cashfreeOrderId: string },
) {
  const member = await memberForActor(actor);
  const payment = await PaymentTransaction.findOne({
    provider: 'CASHFREE',
    providerOrderId: input.cashfreeOrderId,
    memberId: member._id,
  }).exec();
  if (!payment) throw new PaymentError('PAYMENT_NOT_FOUND', 'Cashfree payment transaction not found');
  if (payment.status !== 'CAPTURED') {
    try {
      await reconcileCashfreeOrder(input.cashfreeOrderId);
    } catch {
      throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Cashfree payment could not yet be verified. Please refresh shortly.');
    }
  }
  const verified = await PaymentTransaction.findById(payment._id).exec();
  if (!verified || verified.status !== 'CAPTURED') {
    throw new PaymentError('PAYMENT_VERIFICATION_FAILED', 'Cashfree has not confirmed a successful payment');
  }
  return safePayment(verified);
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
    if (payment.provider === 'CASHFREE') {
      const refund = await createCashfreeRefund({ orderId: payment.providerOrderId!, amountPaise, refundId: `rfnd_${crypto.randomUUID().replace(/-/g, '')}`, reason: reason.trim() });
      const updated = await PaymentTransaction.findByIdAndUpdate(payment._id, { $set: { refundStatus: 'PENDING', providerRefundId: refund.cf_refund_id ?? refund.refund_id } }, { new: true }).exec();
      await auditPayment('PAYMENT_REFUNDED', payment._id, { amountPaise, reason: reason.trim(), provider: 'CASHFREE', refundStatus: refund.refund_status });
      return safePayment(updated!);
    }
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
