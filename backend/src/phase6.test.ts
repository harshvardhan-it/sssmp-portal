import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AuditLog, CashfreeWebhookEvent, PaymentTransaction, RazorpayWebhookEvent } from './models';

test('payment transactions enforce provider and active-operation uniqueness indexes', () => {
  const indexes = PaymentTransaction.schema.indexes();
  assert.ok(indexes.some(([fields, options]) =>
    fields.providerOrderId === 1 && options?.unique === true && options.sparse === true,
  ));
  assert.ok(indexes.some(([fields, options]) =>
    fields.providerPaymentId === 1 && options?.unique === true && options.sparse === true,
  ));
  assert.ok(indexes.some(([fields, options]) =>
    fields.membershipId === 1 &&
    fields.renewalRequestId === 1 &&
    options?.unique === true &&
    Boolean(options.partialFilterExpression),
  ));
});

test('payment transactions accept Cashfree while retaining legacy Razorpay records', () => {
  const provider = PaymentTransaction.schema.path('provider');
  assert.deepEqual(provider.options.enum, ['RAZORPAY', 'CASHFREE']);
});

test('Cashfree webhook inbox enforces one durable record per provider event', () => {
  assert.ok(CashfreeWebhookEvent.schema.indexes().some(([fields, options]) =>
    fields.providerEventId === 1 && options?.unique === true,
  ));
});

test('legacy Razorpay webhook inbox remains readable for historical events', () => {
  assert.ok(RazorpayWebhookEvent.schema.indexes().some(([fields, options]) =>
    fields.providerEventId === 1 && options?.unique === true,
  ));
});

test('payment audit events use a dedicated payment target type', () => {
  const path = AuditLog.schema.path('targetEntityType');
  assert.ok(path && Array.isArray(path.options.enum) && path.options.enum.includes('PAYMENT'));
});
