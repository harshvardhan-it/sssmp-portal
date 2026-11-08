import mongoose from 'mongoose';
import { AuditLog, CashfreeWebhookEvent, PaymentTransaction } from '../models';
import { SYSTEM_ACTOR_ID } from '../models/audit-log.model';
import { fetchCashfreePayments } from './cashfree.service';
import { activateMembershipFromCapturedPayment, activateRenewalFromCapturedPayment } from './membership.service';

type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
  return value && typeof value === 'object' ? value as RecordValue : {};
}
function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.length ? value : undefined;
}

export async function receiveCashfreeWebhook(payload: RecordValue) {
  const order = object(object(payload.data).order);
  const payment = object(object(payload.data).payment);
  const orderId = string(order.order_id);
  const paymentId = payment.cf_payment_id === undefined ? undefined : String(payment.cf_payment_id);
  const eventType = string(payload.type) ?? 'UNKNOWN';
  if (!orderId) throw new Error('Cashfree webhook order ID is missing');
  const eventId = [orderId, paymentId ?? 'none', eventType, string(payload.event_time) ?? 'unknown'].join(':').slice(0, 250);

  try {
    const event = await CashfreeWebhookEvent.create({
      providerEventId: eventId, eventType, providerOrderId: orderId, providerPaymentId: paymentId,
      signatureVerified: true, processingStatus: 'RECEIVED',
      payload: { type: eventType, orderId, paymentId, paymentStatus: payment.payment_status ?? null },
    });
    await AuditLog.create([{
      actorUserId: SYSTEM_ACTOR_ID, action: 'PAYMENT_WEBHOOK_RECEIVED',
      targetEntityType: 'PAYMENT', targetEntityId: event._id, metadata: { eventType, provider: 'CASHFREE' },
    }]);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as {code?:number}).code === 11000) {
      const previous = await CashfreeWebhookEvent.findOne({ providerEventId: eventId }).lean();
      if (previous?.processingStatus === 'PROCESSED') return { duplicate: true };
    } else throw error;
  }

  if (eventType.toUpperCase().includes('REFUND')) {
    const refund = object(object(payload.data).refund);
    const refundStatus = string(refund.refund_status);
    const refundAmount = typeof refund.refund_amount === 'number' ? Math.round(refund.refund_amount * 100) : 0;
    const refundId = string(refund.cf_refund_id) ?? string(refund.refund_id);
    if (refundStatus === 'SUCCESS' && refundAmount > 0) {
      const transaction = await PaymentTransaction.findOne({ provider: 'CASHFREE', providerOrderId: orderId }).exec();
      if (transaction) {
        const alreadyRecorded = transaction.providerRefundId === refundId;
        if (!alreadyRecorded) {
          const total = Math.min(transaction.amountPaise, transaction.refundedAmountPaise + refundAmount);
          await PaymentTransaction.updateOne({ _id: transaction._id }, {
            $set: {
              refundedAmountPaise: total,
              refundStatus: total === transaction.amountPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
              providerRefundId: refundId,
            },
          });
        }
      }
    } else if (refundStatus === 'FAILED') {
      await PaymentTransaction.updateOne({ provider: 'CASHFREE', providerOrderId: orderId }, { $set: { refundStatus: 'FAILED' } });
    }
    await CashfreeWebhookEvent.updateOne({ providerEventId: eventId }, {
      $set: { processingStatus: 'PROCESSED', processedAt: new Date() },
    });
    return { duplicate: false };
  }

  try {
    await reconcileCashfreeOrder(orderId);
    await CashfreeWebhookEvent.updateOne({ providerEventId: eventId }, {
      $set: { processingStatus: 'PROCESSED', processedAt: new Date() },
    });
    return { duplicate: false };
  } catch (error) {
    await CashfreeWebhookEvent.updateOne({ providerEventId: eventId }, {
      $set: { processingStatus: 'FAILED', safeErrorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Webhook processing failed' },
      $inc: { retryCount: 1 },
    });
    throw error;
  }
}

export async function reconcileCashfreeOrder(orderId: string) {
  const payment = await PaymentTransaction.findOne({ provider: 'CASHFREE', providerOrderId: orderId }).exec();
  if (!payment) return { matched: false };
  const providerPayments = await fetchCashfreePayments(orderId);
  const success = providerPayments.find((item) =>
    item.order_id === orderId &&
    item.payment_status === 'SUCCESS' &&
    item.payment_currency === payment.currency &&
    Math.round(item.payment_amount * 100) === payment.amountPaise,
  );
  if (success) {
    if (mongoose.connection.readyState !== 1) throw new Error('Cashfree reconciliation requires a database transaction');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await PaymentTransaction.findOneAndUpdate(
          { _id: payment._id, status: { $in: ['CREATED', 'ORDER_CREATED', 'AUTHORIZED'] } },
          { $set: { providerPaymentId: String(success.cf_payment_id), status: 'CAPTURED', capturedAt: success.payment_completion_time ? new Date(success.payment_completion_time) : new Date() } },
          { new: true, session },
        ).exec();
        if (!current) return;
        if (current.renewalRequestId) {
          await activateRenewalFromCapturedPayment({ renewalId: current.renewalRequestId, paymentId: String(success.cf_payment_id), capturedAt: current.capturedAt as Date }, session);
        } else {
          await activateMembershipFromCapturedPayment({ membershipId: current.membershipId, paymentId: String(success.cf_payment_id), capturedAt: current.capturedAt as Date }, session);
        }
        await AuditLog.create([{
          actorUserId: SYSTEM_ACTOR_ID, action: 'PAYMENT_CAPTURED', targetEntityType: 'PAYMENT',
          targetEntityId: current._id, metadata: { provider: 'CASHFREE', paymentId: String(success.cf_payment_id), amountPaise: current.amountPaise },
        }], { session });
      });
    } finally { await session.endSession(); }
    return { matched: true, captured: true };
  }

  const failed = providerPayments.some((item) => item.order_id === orderId && item.payment_status === 'FAILED');
  if (failed) await PaymentTransaction.updateOne(
    { _id: payment._id, status: { $in: ['CREATED', 'ORDER_CREATED', 'AUTHORIZED'] } },
    { $set: { status: 'FAILED', failedAt: new Date(), failureReason: 'Cashfree reported payment failure' } },
  );
  return { matched: true, captured: false };
}
