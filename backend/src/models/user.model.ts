import bcrypt from 'bcrypt';
import { HydratedDocument, Model, Schema, Types, model } from 'mongoose';
import {
  ACCOUNT_STATUSES,
  AccountStatus,
  USER_ROLES,
  UserRole,
} from './types';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;
const BCRYPT_SALT_ROUNDS = 12;

export interface User {
  email?: string;
  mobile?: string;
  passwordHash: string;
  role: UserRole;
  districtId?: Types.ObjectId;
  blockId?: Types.ObjectId;
  accountStatus: AccountStatus;
  lastLoginAt?: Date;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserModel extends Model<User> {
  hashPassword(password: string): Promise<string>;
}

export type UserDocument = HydratedDocument<User>;

const userSchema = new Schema<User, UserModel>(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    mobile: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      match: /^\d{10}$/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      validate: {
        validator: (value: string): boolean =>
          BCRYPT_HASH_PATTERN.test(value) || (value.length >= 8 && value.length <= 128),
        message: 'Password must be a bcrypt hash or between 8 and 128 characters',
      },
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'MEMBER',
      required: true,
    },
    districtId: {
      type: Schema.Types.ObjectId,
      ref: 'District',
      index: true,
    },
    blockId: {
      type: Schema.Types.ObjectId,
      ref: 'Block',
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
    sessionVersion: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ role: 1, accountStatus: 1 });
userSchema.index({ role: 1, districtId: 1, blockId: 1 });
userSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: 'SUPER_ADMIN' } },
);

userSchema.pre('validate', function () {
  if (!this.email && !this.mobile) {
    throw new Error('User must have an email or mobile credential');
  }
});

userSchema.statics.hashPassword = async (password: string): Promise<string> => {
  if (password.length < 8 || password.length > 128) {
    throw new Error('Password must be between 8 and 128 characters');
  }

  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

userSchema.pre('save', async function () {
  if (this.isModified('passwordHash') && !BCRYPT_HASH_PATTERN.test(this.passwordHash)) {
    this.passwordHash = await User.hashPassword(this.passwordHash);
  }
});

export const User = model<User, UserModel>('User', userSchema);
