import crypto from 'node:crypto';
import { env } from '../config/env';

export class CashfreeConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = 'CashfreeConfigurationError'; }
}

type JsonRecord = Record<string, unknown>;
const API_VERSION = '2025-01-01';

function configuration() {
  if (!['sandbox', 'production'].includes(env.cashfreeEnvironment)) {
    throw new CashfreeConfigurationError('CASHFREE_ENVIRONMENT must be sandbox or production');
  }
  if (!env.cashfreeAppId || !env.cashfreeSecretKey) {
    throw new CashfreeConfigurationError('Cashfree credentials are not configured');
  }
  return {
    baseUrl: env.cashfreeEnvironment === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg',
    appId: env.cashfreeAppId,
    secret: env.cashfreeSecretKey,
  };
}

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const config = configuration();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': config.appId,
      'x-client-secret': config.secret,
      'x-api-version': API_VERSION,
      'x-request-id': crypto.randomUUID(),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let data: unknown = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error('Cashfree returned an invalid response'); }
  if (!response.ok) {
    const record = data && typeof data === 'object' ? data as JsonRecord : {};
    const message = typeof record.message === 'string' ? record.message : 'Cashfree API request failed';
    throw new Error(`Cashfree API error (${response.status}): ${message.slice(0, 200)}`);
  }
  return data as T;
}

export interface CashfreeOrder {
  order_id: string;
  payment_session_id: string;
  order_status?: string;
}

export interface CashfreePayment {
  cf_payment_id: number | string;
  order_id: string;
  payment_status: string;
  payment_amount: number;
  payment_currency: string;
  payment_completion_time?: string;
}

export async function createCashfreeOrder(input: {
  orderId: string;
  amountPaise: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
}): Promise<CashfreeOrder> {
  const body = {
    order_id: input.orderId,
    order_amount: Number((input.amountPaise / 100).toFixed(2)),
    order_currency: 'INR',
    customer_details: {
      customer_id: input.customerId.slice(0, 50),
      customer_name: input.customerName.slice(0, 100),
      customer_phone: input.customerPhone,
      ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    },
    order_meta: { return_url: input.returnUrl, ...(input.notifyUrl ? { notify_url: input.notifyUrl } : {}) },
    order_note: 'SSSMP membership payment',
  };
  const result = await api<CashfreeOrder>('/orders', { method: 'POST', body });
  if (!result.order_id || !result.payment_session_id) throw new Error('Cashfree order response is incomplete');
  return result;
}

export async function fetchCashfreePayments(orderId: string): Promise<CashfreePayment[]> {
  const result = await api<unknown>(`/orders/${encodeURIComponent(orderId)}/payments`);
  if (!Array.isArray(result)) throw new Error('Cashfree payment list response is invalid');
  return result as CashfreePayment[];
}

export async function createCashfreeRefund(input: {
  orderId: string;
  amountPaise: number;
  refundId: string;
  reason: string;
}): Promise<{ cf_refund_id?: string; refund_id?: string; refund_amount: number; refund_status: string }> {
  return api<{ cf_refund_id?: string; refund_id?: string; refund_amount: number; refund_status: string }>(`/orders/${encodeURIComponent(input.orderId)}/refunds`, {
    method: 'POST',
    body: {
      refund_id: input.refundId,
      refund_amount: Number((input.amountPaise / 100).toFixed(2)),
      refund_note: input.reason.slice(0, 200),
      refund_speed: 'STANDARD',
    },
  });
}

export function cashfreeMode(): 'sandbox' | 'production' {
  return env.cashfreeEnvironment === 'production' ? 'production' : 'sandbox';
}

export function verifyCashfreeWebhookSignature(
  rawBody: Buffer,
  signature: string,
  timestamp: string,
  secret = env.cashfreeSecretKey,
): boolean {
  if (!secret || !signature || !timestamp || !/^\\d+$/.test(timestamp)) return false;
  try {
    const expected = crypto.createHmac('sha256', secret)
      .update(timestamp + rawBody.toString('utf8'), 'utf8')
      .digest('base64');
    const actualBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expected, 'base64');
    return actualBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch { return false; }
}
