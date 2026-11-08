import mongoose, { ClientSession, Types } from 'mongoose';
import { AuditLog, Member, Membership } from '../models';
import { SYSTEM_ACTOR_ID } from '../models/audit-log.model';

export interface ExpirationResult {
  expiredCount: number;
}

function transactionUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('transaction numbers are only allowed') ||
    message.includes('does not support transactions') ||
    message.includes('replica set');
}

async function expireOne(now: Date, session?: ClientSession): Promise<boolean> {
  const membership = await Membership.findOneAndUpdate(
    { status: 'ACTIVE', validityEnd: { $lte: now } },
    { $set: { status: 'EXPIRED' } },
    { new: true, sort: { validityEnd: 1 }, ...(session ? { session } : {}) },
  ).exec();
  if (!membership) return false;

  try {
    await Member.updateOne(
      { _id: membership.memberId },
      {
        $set: { membershipStatus: 'EXPIRED' },
        $unset: { joinedAt: '', membershipExpiresAt: '' },
      },
      session ? { session } : undefined,
    ).exec();
    await AuditLog.create([{
      actorUserId: SYSTEM_ACTOR_ID,
      action: 'MEMBERSHIP_EXPIRED',
      targetEntityType: 'MEMBERSHIP',
      targetEntityId: membership._id as Types.ObjectId,
      metadata: { source: 'EXPIRATION_JOB' },
    }], session ? { session } : undefined);
  } catch (error) {
    if (!session) {
      await Membership.updateOne(
        { _id: membership._id, status: 'EXPIRED' },
        { $set: { status: 'ACTIVE' } },
      ).exec();
    }
    throw error;
  }
  return true;
}

export async function expireMemberships(now = new Date()): Promise<ExpirationResult> {
  let expiredCount = 0;
  while (true) {
    let expired = false;
    if (mongoose.connection.readyState === 1) {
      const session = await mongoose.startSession();
      try {
        try {
          await session.withTransaction(async () => {
            expired = await expireOne(now, session);
          });
        } catch (error) {
          if (!transactionUnsupported(error)) throw error;
          expired = await expireOne(now);
        }
      } finally {
        await session.endSession();
      }
    } else {
      expired = await expireOne(now);
    }
    if (!expired) break;
    expiredCount += 1;
  }
  return { expiredCount };
}
