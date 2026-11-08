import { HydratedDocument, Schema, Types, model } from 'mongoose';
import { RENEWAL_STATUSES, RenewalStatus, SUBSCRIPTION_AMOUNTS, SUBSCRIPTION_PLANS, SubscriptionPlan } from './types';

export interface RenewalRequest {
  membershipId: Types.ObjectId;
  memberId: Types.ObjectId;
  plan: SubscriptionPlan;
  amount: number;
  status: RenewalStatus;
  previousValidityStart?: Date;
  previousValidityEnd?: Date;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  newValidityStart?: Date;
  newValidityEnd?: Date;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RenewalRequestDocument = HydratedDocument<RenewalRequest>;

const renewalRequestSchema = new Schema<RenewalRequest>(
  {
    membershipId: { type: Schema.Types.ObjectId, ref: 'Membership', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
    plan: { type: String, enum: SUBSCRIPTION_PLANS, required: true },
    amount: { type: Number, enum: Object.values(SUBSCRIPTION_AMOUNTS), required: true },
    status: { type: String, enum: RENEWAL_STATUSES, default: 'PENDING', required: true, index: true },
    previousValidityStart: Date,
    previousValidityEnd: Date,
    requestedAt: { type: Date, required: true, default: Date.now },
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    newValidityStart: Date,
    newValidityEnd: Date,
    activatedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

renewalRequestSchema.index({ membershipId: 1, status: 1 });
renewalRequestSchema.index(
  { membershipId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'APPROVED', 'ACTIVE'] } } },
);
renewalRequestSchema.pre('validate', function () {
  if (this.amount !== SUBSCRIPTION_AMOUNTS[this.plan]) {
    this.invalidate('amount', 'Renewal amount does not match the selected plan');
  }
});

export const RenewalRequest = model<RenewalRequest>('RenewalRequest', renewalRequestSchema);
