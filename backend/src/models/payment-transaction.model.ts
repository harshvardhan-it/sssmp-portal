import { HydratedDocument, Schema, Types, model } from 'mongoose';
import {
  PAYMENT_STATUSES,
  PaymentStatus,
  REFUND_STATUSES,
  RefundStatus,
  SubscriptionPlan,
} from './types';

export interface PaymentTransaction {
  memberId: Types.ObjectId;
  membershipId: Types.ObjectId;
  renewalRequestId?: Types.ObjectId;
  plan: SubscriptionPlan;
  amountPaise: number;
  currency: 'INR';
  provider: 'RAZORPAY' | 'CASHFREE';
  providerOrderId?: string;
  providerPaymentId?: string;
  internalReceipt: string;
  status: PaymentStatus;
  capturedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  refundedAmountPaise: number;
  refundStatus: RefundStatus;
  providerRefundId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentTransactionDocument = HydratedDocument<PaymentTransaction>;

const paymentTransactionSchema = new Schema<PaymentTransaction>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    membershipId: { type: Schema.Types.ObjectId, ref: 'Membership', required: true, index: true },
    renewalRequestId: { type: Schema.Types.ObjectId, ref: 'RenewalRequest', index: true },
    plan: { type: String, enum: ['OFFICE_BEARER', 'YEARLY'], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['INR'], required: true, default: 'INR' },
    provider: { type: String, enum: ['RAZORPAY', 'CASHFREE'], required: true, default: 'CASHFREE' },
    providerOrderId: { type: String, sparse: true, unique: true, index: true },
    providerPaymentId: { type: String, sparse: true, unique: true, index: true },
    internalReceipt: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, default: 'CREATED', index: true },
    capturedAt: Date,
    failedAt: Date,
    failureReason: { type: String, maxlength: 500 },
    refundedAmountPaise: { type: Number, required: true, min: 0, default: 0 },
    refundStatus: { type: String, enum: REFUND_STATUSES, required: true, default: 'NONE' },
    providerRefundId: { type: String, sparse: true, unique: true },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true, versionKey: false },
);

paymentTransactionSchema.index({ memberId: 1, createdAt: -1 });
paymentTransactionSchema.index(
  { membershipId: 1, renewalRequestId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['CREATED', 'ORDER_CREATED', 'AUTHORIZED', 'CAPTURED'] } },
  },
);

export const PaymentTransaction = model<PaymentTransaction>('PaymentTransaction', paymentTransactionSchema);
