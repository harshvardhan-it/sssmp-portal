import { HydratedDocument, Schema, model } from 'mongoose';

export interface CashfreeWebhookEvent {
  providerEventId: string;
  eventType: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  signatureVerified: boolean;
  processingStatus: 'RECEIVED' | 'PROCESSED' | 'FAILED';
  receivedAt: Date;
  processedAt?: Date;
  retryCount: number;
  safeErrorMessage?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CashfreeWebhookEventDocument = HydratedDocument<CashfreeWebhookEvent>;
const schema = new Schema<CashfreeWebhookEvent>({
  providerEventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  providerOrderId: String,
  providerPaymentId: String,
  signatureVerified: { type: Boolean, required: true },
  processingStatus: { type: String, enum: ['RECEIVED', 'PROCESSED', 'FAILED'], required: true, index: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  processedAt: Date,
  retryCount: { type: Number, required: true, default: 0 },
  safeErrorMessage: { type: String, maxlength: 500 },
  payload: Schema.Types.Mixed,
}, { timestamps: true, versionKey: false });

export const CashfreeWebhookEvent = model<CashfreeWebhookEvent>('CashfreeWebhookEvent', schema);
