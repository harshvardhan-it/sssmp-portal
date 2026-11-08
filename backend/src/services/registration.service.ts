import crypto from 'node:crypto';
import mongoose, { ClientSession, Types } from 'mongoose';
import { AuditLog, Block, District, Member, Membership, User, SYSTEM_ACTOR_ID } from '../models';
import { createMembershipForMember } from './membership.service';
import {
  SUBSCRIPTION_AMOUNTS,
  SubscriptionPlan,
} from '../models/types';

export interface RegisterMemberInput {
  fullName: string;
  fatherHusbandName: string;
  dob: string;
  gender?: string;
  mobile: string;
  email?: string;
  address?: string;
  district: string;
  block?: string;
  schoolName: string;
  designation: string;
  employeeId: string;
  selectedPlan: 'office_bearer' | 'yearly';
  password: string;
}

export class RegistrationError extends Error {
  constructor(
    public readonly code: 'LOCATION_NOT_FOUND' | 'BLOCK_DISTRICT_MISMATCH' | 'DUPLICATE' | 'VALIDATION_ERROR',
    message: string,
  ) {
    super(message);
    this.name = 'RegistrationError';
  }
}

function duplicateKeyFields(error: unknown): string[] {
  if (!error || typeof error !== 'object') return [];
  const pattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  if (pattern) return Object.keys(pattern);
  const value = (error as { keyValue?: Record<string, unknown> }).keyValue;
  return value ? Object.keys(value) : [];
}

export function registrationDuplicateMessage(error: unknown): string | undefined {
  if (!isDuplicateKeyError(error)) return undefined;
  const fields = duplicateKeyFields(error);
  if (fields.includes('employeeId')) return 'Employee Code / Unique ID is already registered.';
  if (fields.includes('mobile')) return 'This mobile number is already registered.';
  if (fields.includes('email')) return 'This email address is already registered.';
  if (fields.includes('registrationId')) return 'A registration number collision occurred. Please submit again.';
  if (fields.includes('membershipNumber')) return 'A membership number collision occurred. Please submit again.';
  return 'A duplicate registration record was detected. Please verify your details.';
}

export interface RegistrationResult {
  registrationId: string;
  membershipStatus: 'PENDING';
  locationStatus: 'VERIFIED' | 'LOCATION_PENDING';
  subscriptionPlan: SubscriptionPlan;
  subscriptionAmount: number;
  member: {
    id: string;
    registrationNumber: string;
    fullName: string;
    fatherHusbandName: string;
    dob: string;
    gender?: string;
    mobile: string;
    email?: string;
    address?: string;
    district: string;
    block: string;
    schoolName: string;
    designation: string;
    employeeId: string;
    plan: 'office_bearer' | 'yearly';
    status: 'PENDING';
    locationStatus: 'VERIFIED' | 'LOCATION_PENDING';
    amount: number;
  };
}

function toSubscriptionPlan(plan: RegisterMemberInput['selectedPlan']): SubscriptionPlan {
  return plan === 'office_bearer' ? 'OFFICE_BEARER' : 'YEARLY';
}

function generateRegistrationId(): string {
  return `SSSMP${new Date().getFullYear()}${crypto.randomInt(100000, 1000000)}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
  );
}

function isEmployeeIdDuplicateError(error: unknown): boolean {
  return Boolean(
    isDuplicateKeyError(error) &&
      error &&
      typeof error === 'object' &&
      'keyPattern' in error &&
      Boolean((error as { keyPattern?: Record<string, unknown> }).keyPattern?.employeeId),
  );
}

function isRegistrationIdDuplicateError(error: unknown): boolean {
  return Boolean(
    isDuplicateKeyError(error) &&
      error &&
      typeof error === 'object' &&
      'keyPattern' in error &&
      Boolean((error as { keyPattern?: Record<string, unknown> }).keyPattern?.registrationId),
  );
}

function normalizeInput(input: RegisterMemberInput): RegisterMemberInput {
  const employeeId = input.employeeId.trim();
  if (!employeeId) {
    throw new RegistrationError(
      'VALIDATION_ERROR',
      'Employee Code / Unique ID is required. कृपया कर्मचारी कोड / यूनिक आईडी दर्ज करें।',
    );
  }
  return { ...input, employeeId };
}

async function findLocations(input: RegisterMemberInput): Promise<{
  district: { _id: Types.ObjectId; nameEn: string; nameHi: string };
  block?: { _id: Types.ObjectId; nameEn: string; nameHi: string; districtId: Types.ObjectId; verificationStatus: 'VERIFIED' | 'PROVISIONAL' };
}> {
  if (!Types.ObjectId.isValid(input.district)) {
    throw new RegistrationError('LOCATION_NOT_FOUND', 'Selected district was not found');
  }

  const district = await District.findOne({
    _id: input.district,
    isActive: true,
  }).lean();
  if (!district) {
    throw new RegistrationError('LOCATION_NOT_FOUND', 'Selected district was not found');
  }

  if (!input.block) return { district, block: undefined };
  if (!Types.ObjectId.isValid(input.block)) {
    throw new RegistrationError('LOCATION_NOT_FOUND', 'Selected block was not found');
  }
  const block = await Block.findOne({
    isActive: true,
    districtId: district._id,
    _id: input.block,
  }).lean();
  if (!block) {
    const blockExists = await Block.exists({
      isActive: true,
      _id: input.block,
    });
    throw new RegistrationError(
      blockExists ? 'BLOCK_DISTRICT_MISMATCH' : 'LOCATION_NOT_FOUND',
      blockExists
        ? 'Selected block does not belong to the selected district'
        : 'Selected block was not found',
    );
  }

  return { district, block };
}

async function createRegistration(
  input: RegisterMemberInput,
  session?: ClientSession,
): Promise<RegistrationResult> {
  const existingEmployee = await Member.exists({ employeeId: input.employeeId });
  if (existingEmployee) {
    throw new RegistrationError(
      'DUPLICATE',
      'Employee Code / Unique ID already exists. Please verify your Employee Code / कर्मचारी कोड पहले से पंजीकृत है।',
    );
  }
  const { district, block } = await findLocations(input);
  const subscriptionPlan = toSubscriptionPlan(input.selectedPlan);
  const subscriptionAmount = SUBSCRIPTION_AMOUNTS[subscriptionPlan];

  const user = new User({
    email: input.email || undefined,
    mobile: input.mobile,
    passwordHash: input.password,
    role: 'MEMBER',
    accountStatus: 'ACTIVE',
  });
  await user.save(session ? { session } : undefined);

  let member;
  try {
    let registrationId = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      registrationId = generateRegistrationId();
      try {
        member = new Member({
          userId: user._id,
          fullName: input.fullName,
          fatherOrHusbandName: input.fatherHusbandName,
          dateOfBirth: new Date(input.dob),
          gender: input.gender || undefined,
          mobile: input.mobile,
          email: input.email || undefined,
          address: input.address || undefined,
          schoolName: input.schoolName,
          designation: input.designation,
          employeeId: input.employeeId,
          districtId: district._id,
          ...(block ? { blockId: block._id } : {}),
          registrationId,
          membershipStatus: 'PENDING',
          locationStatus: block && block.verificationStatus !== 'PROVISIONAL' ? 'VERIFIED' : 'LOCATION_PENDING',
          subscriptionPlan,
          subscriptionAmount,
        });
        await member.save(session ? { session } : undefined);
        await createMembershipForMember(member._id, subscriptionPlan, session);
        await AuditLog.create([{
          actorUserId: SYSTEM_ACTOR_ID,
          action: 'MEMBER_REGISTERED',
          targetEntityType: 'MEMBER',
          targetEntityId: member._id,
          metadata: { source: 'REGISTRATION', locationStatus: block && block.verificationStatus !== 'PROVISIONAL' ? 'VERIFIED' : 'LOCATION_PENDING' },
        }], session ? { session } : undefined);
        break;
      } catch (error) {
        if (isEmployeeIdDuplicateError(error)) {
          throw new RegistrationError(
            'DUPLICATE',
            'Employee Code / Unique ID already exists. Please verify your Employee Code / कर्मचारी कोड पहले से पंजीकृत है।',
          );
        }
        if (!isRegistrationIdDuplicateError(error) || attempt === 4) throw error;
      }
    }

    if (!member) throw new Error('Unable to generate a unique registration ID');

    return {
      registrationId,
      membershipStatus: 'PENDING',
      locationStatus: block && block.verificationStatus !== 'PROVISIONAL' ? 'VERIFIED' : 'LOCATION_PENDING',
      subscriptionPlan,
      subscriptionAmount,
      member: {
        id: member.id,
        registrationNumber: registrationId,
        fullName: input.fullName,
        fatherHusbandName: input.fatherHusbandName,
        dob: input.dob,
        gender: input.gender,
        mobile: input.mobile,
        email: input.email,
        address: input.address,
        district: district.nameEn,
        block: block?.nameEn ?? '',
        schoolName: input.schoolName,
        designation: input.designation,
        employeeId: input.employeeId,
        plan: input.selectedPlan,
        status: 'PENDING',
        locationStatus: block && block.verificationStatus !== 'PROVISIONAL' ? 'VERIFIED' : 'LOCATION_PENDING',
        amount: subscriptionAmount,
      },
    };
  } catch (error) {
    if (!session) {
      if (member?._id) {
        await Membership.deleteMany({ memberId: member._id });
        await Member.deleteOne({ _id: member._id });
      }
      await User.deleteOne({ _id: user._id });
    }
    throw error;
  }
}

function isTransactionUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: number }).code
    : undefined;
  const labels = typeof error === 'object' && error !== null && 'errorLabelSet' in error
    ? (error as { errorLabelSet?: Set<string> }).errorLabelSet
    : undefined;
  return code === 20 || code === 251 || labels?.has('TransientTransactionError') ||
    message.includes('transaction numbers are only allowed') ||
    message.includes('transactions are not supported') ||
    message.includes('does not support transactions') ||
    message.includes('replica set');
}

function hasErrorLabel(error: unknown, label: string): boolean {
  return Boolean(
    error && typeof error === 'object' && 'errorLabelSet' in error &&
      (error as { errorLabelSet?: Set<string> }).errorLabelSet?.has(label),
  );
}

export async function registerMember(input: RegisterMemberInput): Promise<RegistrationResult> {
  const normalizedInput = normalizeInput(input);
  if (mongoose.connection.readyState !== 1) {
    return createRegistration(normalizedInput);
  }

  const session = await mongoose.startSession();
  try {
    let result: RegistrationResult | undefined;
    try {
      session.startTransaction();
      result = await createRegistration(normalizedInput, session);
      await session.commitTransaction();
      if (!result) throw new Error('Registration transaction returned no result');
      return result;
    } catch (error) {
      const canRetryWithoutTransaction = isTransactionUnsupported(error);
      if (hasErrorLabel(error, 'UnknownTransactionCommitResult')) throw error;
      if (session.inTransaction()) await session.abortTransaction();
      if (!canRetryWithoutTransaction) throw error;
    }
  } finally {
    await session.endSession();
  }

  return createRegistration(normalizedInput);
}
