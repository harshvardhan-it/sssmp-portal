import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env';

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigurationError';
  }
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
  error_description?: string;
}

export interface RazorpayRefund {
  id: string;
  amount: number;
  status: string;
}

type ProviderRecord = Record<string, unknown>;

function providerRecord(value: unknown): ProviderRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid Razorpay response');
  return value as ProviderRecord;
}

function requiredString(record: ProviderRecord, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Razorpay response missing ${key}`);
  return value;
}

function requiredNumber(record: ProviderRecord, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Razorpay response missing ${key}`);
  return value;
}

function toOrder(value: unknown): RazorpayOrder {
  const record = providerRecord(value);
  return {
    id: requiredString(record, 'id'),
    amount: requiredNumber(record, 'amount'),
    currency: requiredString(record, 'currency'),
    receipt: typeof record.receipt === 'string' ? record.receipt : undefined,
    status: typeof record.status === 'string' ? record.status : undefined,
  };
}

function toPayment(value: unknown): RazorpayPayment {
  const record = providerRecord(value);
  return {
    id: requiredString(record, 'id'),
    order_id: requiredString(record, 'order_id'),
    amount: requiredNumber(record, 'amount'),
    currency: requiredString(record, 'currency'),
    status: requiredString(record, 'status'),
    captured: typeof record.captured === 'boolean' ? record.captured : undefined,
    error_description: typeof record.error_description === 'string' ? record.error_description : undefined,
  };
}

function toRefund(value: unknown): RazorpayRefund {
  const record = providerRecord(value);
  return {
    id: requiredString(record, 'id'),
    amount: requiredNumber(record, 'amount'),
    status: requiredString(record, 'status'),
  };
}

function client(): Razorpay {
  if (
    env.razorpayEnvironment !== 'test' ||
    !env.razorpayKeyId ||
    !env.razorpayKeySecret
  ) {
    throw new PaymentConfigurationError('Razorpay test-mode configuration is unavailable');
  }
  return new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
}

export function publicKeyId(): string {
  if (env.razorpayEnvironment !== 'test' || !env.razorpayKeyId) {
    throw new PaymentConfigurationError('Razorpay test-mode configuration is unavailable');
  }
  return env.razorpayKeyId;
}

export async function createProviderOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const result = await client().orders.create({
    amount: input.amountPaise,
    currency: 'INR',
    receipt: input.receipt,
    notes: input.notes,
  });
  return toOrder(result);
}

export async function fetchProviderPayment(paymentId: string): Promise<RazorpayPayment> {
  return toPayment(await client().payments.fetch(paymentId));
}

export async function createProviderRefund(
  paymentId: string,
  amountPaise: number,
  notes: Record<string, string>,
): Promise<RazorpayRefund> {
  return toRefund(await client().payments.refund(paymentId, { amount: amountPaise, notes }));
}

export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.razorpayWebhookSecret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}
