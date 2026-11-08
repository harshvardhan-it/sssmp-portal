import mongoose from 'mongoose';
import { AuditLog, PaymentTransaction, RazorpayWebhookEvent } from '../models';
import { SYSTEM_ACTOR_ID } from '../models/audit-log.model';
import { fetchProviderPayment, verifyWebhookSignature } from './razorpay.service';
import {
  activateMembershipFromCapturedPayment,
  activateRenewalFromCapturedPayment,
} from './membership.service';

type ProviderRecord = Record<string, unknown>;

function record(value: unknown): ProviderRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid webhook payload');
  return value as ProviderRecord;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function nestedEntity(payload: ProviderRecord, ...keys: string[]): ProviderRecord | undefined {
  let current: unknown = payload;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as ProviderRecord)[key];
  }
  return current && typeof current === 'object' ? current as ProviderRecord : undefined;
}

function eventId(payload: ProviderRecord): string {
  const id = stringValue(payload.id);
  if (!id) throw new Error('Webhook event ID is required');
  return id;
}

export async function receiveWebhook(rawBody: Buffer, signature: string) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new Error('Invalid webhook signature');
  }
  let payload: ProviderRecord;
  try {
    payload = record(JSON.parse(rawBody.toString('utf8')) as unknown);
  } catch {
    throw new Error('Malformed webhook payload');
  }
  const id = eventId(payload);
  const eventType = stringValue(payload.event) ?? 'unknown';
  const paymentEntity = nestedEntity(payload, 'payload', 'payment', 'entity');
  const orderId = paymentEntity ? stringValue(paymentEntity.order_id) : undefined;
  const paymentId = paymentEntity ? stringValue(paymentEntity.id) : undefined;

  try {
    const event = await RazorpayWebhookEvent.create({
      providerEventId: id,
      eventType,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      signatureVerified: true,
      processingStatus: 'RECEIVED',
      payload: {
        event: eventType,
        providerOrderId: orderId ?? null,
        providerPaymentId: paymentId ?? null,
        amount: paymentEntity?.amount ?? null,
        currency: paymentEntity?.currency ?? null,
        status: paymentEntity?.status ?? null,
      },
    });
    await AuditLog.create([{
      actorUserId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_WEBHOOK_RECEIVED',
      targetEntityType: 'PAYMENT',
      targetEntityId: event._id,
      metadata: { eventType },
    }]);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error &&
      (error as { code?: number }).code === 11000) {
      const existing = await RazorpayWebhookEvent.findOne({ providerEventId: id }).lean().exec();
      if (!existing || existing.processingStatus === 'PROCESSED') return { duplicate: true };
    }
    if (!(error && typeof error === 'object' && 'code' in error &&
      (error as { code?: number }).code === 11000)) throw error;
  }

  try {
    await processWebhookEvent(id, eventType, orderId, paymentId);
    await RazorpayWebhookEvent.updateOne(
      { providerEventId: id },
      { $set: { processingStatus: 'PROCESSED', processedAt: new Date() } },
    ).exec();
    return { duplicate: false };
  } catch (error) {
    await RazorpayWebhookEvent.updateOne(
      { providerEventId: id },
      {
        $set: {
          processingStatus: 'FAILED',
          safeErrorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Webhook processing failed',
        },
        $inc: { retryCount: 1 },
      },
    ).exec();
    await AuditLog.create([{
      actorUserId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_WEBHOOK_PROCESSING_FAILED',
      targetEntityType: 'PAYMENT',
      targetEntityId: SYSTEM_ACTOR_ID,
      metadata: { eventType },
    }]);
    throw error;
  }
}

async function processWebhookEvent(
  _eventIdValue: string,
  eventType: string,
  orderId?: string,
  paymentId?: string,
) {
  if (eventType === 'payment.failed') {
    if (!orderId) return;
    await PaymentTransaction.updateOne(
      { providerOrderId: orderId, status: { $nin: ['CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
      { $set: { status: 'FAILED', failedAt: new Date(), failureReason: 'Provider reported payment failure' } },
    ).exec();
    return;
  }
  if (eventType !== 'payment.captured' || !orderId || !paymentId) return;
  const providerPayment = await fetchProviderPayment(paymentId);
  const payment = await PaymentTransaction.findOne({ providerOrderId: orderId }).exec();
  if (
    !payment ||
    providerPayment.order_id !== orderId ||
    providerPayment.amount !== payment.amountPaise ||
    providerPayment.currency !== payment.currency ||
    providerPayment.status !== 'captured'
  ) {
    throw new Error('Webhook payment does not match a captured provider payment');
  }
  if (mongoose.connection.readyState !== 1) throw new Error('Webhook processing requires a database transaction');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const payment = await PaymentTransaction.findOneAndUpdate(
        { providerOrderId: orderId, status: { $in: ['CREATED', 'ORDER_CREATED', 'AUTHORIZED'] } },
        {
          $set: {
            providerPaymentId: paymentId,
            status: 'CAPTURED',
            capturedAt: new Date(),
          },
        },
        { new: true, session },
      ).exec();
      if (!payment) return;
      if (payment.renewalRequestId) {
        await activateRenewalFromCapturedPayment({
          renewalId: payment.renewalRequestId,
          paymentId,
          capturedAt: payment.capturedAt as Date,
        }, session);
      } else {
        await activateMembershipFromCapturedPayment({
          membershipId: payment.membershipId,
          paymentId,
          capturedAt: payment.capturedAt as Date,
        }, session);
      }
    });
  } finally {
    await session.endSession();
  }
}
