import { AuditLog, User } from '../models';

export interface BootstrapSuperAdminInput {
  email?: string;
  mobile?: string;
  password: string;
}

export class BootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BootstrapError';
  }
}

export async function bootstrapSuperAdmin(input: BootstrapSuperAdminInput) {
  if ((!input.email && !input.mobile) || input.password.length < 8 || input.password.length > 128) {
    throw new BootstrapError('A valid email or mobile and an 8-128 character password are required');
  }
  const existing = await User.findOne({ role: 'SUPER_ADMIN' }).exec();
  if (existing) throw new BootstrapError('A SUPER_ADMIN account already exists');

  let user;
  try {
    user = await User.create({
      email: input.email,
      mobile: input.mobile,
      passwordHash: input.password,
      role: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    ) {
      const duplicate = error as {
        keyPattern?: Record<string, number>;
      };

      const fields = Object.keys(duplicate.keyPattern ?? {});

      if (fields.includes('email')) {
        throw new BootstrapError('This email is already registered');
      }

      if (fields.includes('mobile')) {
        throw new BootstrapError('This mobile number is already registered');
      }

      if (fields.includes('role')) {
        throw new BootstrapError('A SUPER_ADMIN account already exists');
      }

      throw new BootstrapError(
        `Duplicate database value: ${fields.join(', ') || 'unknown field'}`
      );
    }

    throw error;
  }
  await AuditLog.create({
    actorUserId: user._id,
    action: 'SUPER_ADMIN_BOOTSTRAPPED',
    targetEntityType: 'USER',
    targetEntityId: user._id,
    metadata: { role: 'SUPER_ADMIN' },
  });
  return {
    id: user.id,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    accountStatus: user.accountStatus,
  };
}
