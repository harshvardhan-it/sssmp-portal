
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { User, AuditLog } from '../models';

async function promoteSuperAdmin() {
  const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error('BOOTSTRAP_EMAIL is required');
  }

  await connectDatabase();

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existing = await User.findOne({ email }).session(session);

      if (!existing) {
        throw new Error('Account not found');
      }

      if (existing.role !== 'MEMBER') {
        throw new Error(`Expected MEMBER account, found ${existing.role}`);
      }

      if (existing.accountStatus !== 'ACTIVE') {
        throw new Error('Account must be ACTIVE');
      }

      const superAdminCount = await User.countDocuments({
        role: 'SUPER_ADMIN',
      }).session(session);

      if (superAdminCount !== 0) {
        throw new Error('A SUPER_ADMIN already exists');
      }

      const result = await User.updateOne(
        {
          _id: existing._id,
          role: 'MEMBER',
          accountStatus: 'ACTIVE',
        },
        {
          $set: { role: 'SUPER_ADMIN' },
        },
        {
          session,
          runValidators: true,
        }
      );

      if (result.modifiedCount !== 1) {
        throw new Error('Account promotion failed');
      }

      await AuditLog.create(
        [{
          actorUserId: existing._id,
          action: 'ADMIN_ROLE_CHANGED',
          targetEntityType: 'USER',
          targetEntityId: existing._id,
          metadata: {
            fromRole: 'MEMBER',
            toRole: 'SUPER_ADMIN',
            reason: 'Initial administrator setup',
          },
        }],
        { session }
      );
    });

    console.log('SUCCESS: Existing account promoted to SUPER_ADMIN');
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
}

promoteSuperAdmin().catch((error) => {
  console.error('PROMOTION FAILED:', error.message);
  process.exitCode = 1;
});
