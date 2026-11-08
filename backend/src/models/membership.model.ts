import { HydratedDocument, Schema, Types, model } from 'mongoose';
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  SUBSCRIPTION_AMOUNTS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from './types';

export interface Membership {
  memberId: Types.ObjectId;
  membershipNumber: string;
  plan: SubscriptionPlan;
  amount: number;
  status: ApplicationStatus;
  appliedAt: Date;
  approvedAt?: Date;
  approvedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectionReason?: string;
  activatedAt?: Date;
  activatedBy?: Types.ObjectId;
  validityStart?: Date;
  validityEnd?: Date;
  paymentVerifiedAt?: Date;
  paymentVerifiedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type MembershipDocument = HydratedDocument<Membership>;

const membershipSchema = new Schema<Membership>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    membershipNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      match: /^SSSMP-M-\d{4}-\d{6}$/,
    },
    plan: { type: String, enum: SUBSCRIPTION_PLANS, required: true },
    amount: { type: Number, enum: Object.values(SUBSCRIPTION_AMOUNTS), required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'PENDING', required: true, index: true },
    appliedAt: { type: Date, required: true, default: Date.now },
    approvedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    activatedAt: Date,
    activatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    validityStart: Date,
    validityEnd: Date,
    paymentVerifiedAt: Date,
    paymentVerifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false },
);

membershipSchema.index({ memberId: 1, status: 1 });
membershipSchema.index({ status: 1, createdAt: -1 });
membershipSchema.index(
  { memberId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'APPROVED', 'ACTIVE'] } } },
);
membershipSchema.pre('validate', function () {
  if (this.amount !== SUBSCRIPTION_AMOUNTS[this.plan]) {
    this.invalidate('amount', 'Membership amount does not match the selected plan');
  }
  if (this.status === 'ACTIVE' && (!this.activatedAt || !this.validityStart)) {
    this.invalidate('activatedAt', 'Active memberships require server activation metadata');
  }
});

export const Membership = model<Membership>('Membership', membershipSchema);
