import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';
import { UserRole } from '../models/types';

export interface SafeUser {
  id: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  accountStatus: string;
  districtId?: string;
  blockId?: string;
  lastLoginAt?: Date;
}

interface SafeUserSource {
  id: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  accountStatus: string;
  districtId?: { toString(): string } | string;
  blockId?: { toString(): string } | string;
  lastLoginAt?: Date;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export function toSafeUser(user: SafeUserSource): SafeUser {
  return {
    id: user.id,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    accountStatus: user.accountStatus,
    districtId: user.districtId?.toString(),
    blockId: user.blockId?.toString(),
    lastLoginAt: user.lastLoginAt,
  };
}

export async function login(input: LoginInput): Promise<{ token: string; user: SafeUser }> {
  const identifier = input.identifier.trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { mobile: input.identifier.trim() }],
  }).select('+passwordHash');

  if (!user || user.accountStatus !== 'ACTIVE') {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const lastLoginAt = new Date();
  await User.updateOne({ _id: user.id }, { $set: { lastLoginAt } });

  const token = jwt.sign(
    { role: user.role, sessionVersion: user.sessionVersion ?? 0 },
    env.jwtSecret,
    {
      subject: user.id,
      expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
    },
  );

  return {
    token,
    user: toSafeUser({
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      accountStatus: user.accountStatus,
      districtId: user.districtId,
      blockId: user.blockId,
      lastLoginAt,
    }),
  };
}
