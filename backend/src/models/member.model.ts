import { HydratedDocument, Schema, Types, model } from 'mongoose';
import {
  MEMBERSHIP_STATUSES,
  MembershipStatus,
  SUBSCRIPTION_AMOUNTS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  LOCATION_ASSIGNMENT_STATUSES,
  LocationAssignmentStatus,
} from './types';

export interface Member {
  userId: Types.ObjectId;
  fullName: string;
  fatherOrHusbandName: string;
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  mobile: string;
  email?: string;
  schoolName: string;
  designation: string;
  employeeId: string;
  districtId: Types.ObjectId;
  blockId?: Types.ObjectId;
  locationStatus: LocationAssignmentStatus;
  registrationId: string;
  membershipStatus: MembershipStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionAmount: number;
  joinedAt?: Date;
  membershipExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MemberDocument = HydratedDocument<Member>;

const memberSchema = new Schema<Member>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    fatherOrHusbandName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: /^\d{10}$/,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    schoolName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    districtId: {
      type: Schema.Types.ObjectId,
      ref: 'District',
      required: true,
      index: true,
    },
    blockId: {
      type: Schema.Types.ObjectId,
      ref: 'Block',
      index: true,
    },
    locationStatus: {
      type: String,
      enum: LOCATION_ASSIGNMENT_STATUSES,
      default: 'VERIFIED',
      required: true,
      index: true,
    },
    registrationId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      index: true,
      maxlength: 40,
      match: /^[A-Z0-9_-]+$/,
    },
    membershipStatus: {
      type: String,
      enum: MEMBERSHIP_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    subscriptionPlan: {
      type: String,
      enum: SUBSCRIPTION_PLANS,
      required: true,
    },
    subscriptionAmount: {
      type: Number,
      required: true,
      enum: Object.values(SUBSCRIPTION_AMOUNTS),
      min: 120,
      max: 1000,
    },
    joinedAt: {
      type: Date,
    },
    membershipExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

memberSchema.index({ districtId: 1, blockId: 1, membershipStatus: 1 });
memberSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $type: 'string' } },
  },
);
memberSchema.pre('validate', function () {
  if (this.subscriptionAmount !== SUBSCRIPTION_AMOUNTS[this.subscriptionPlan]) {
    this.invalidate('subscriptionAmount', 'Subscription amount does not match the selected plan');
  }
});

export const Member = model<Member>('Member', memberSchema);
