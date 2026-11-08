import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { expireMemberships } from '../services/membership-expiration.service';

async function main(): Promise<void> {
  await connectDatabase();
  try {
    const result = await expireMemberships();
    console.log(`Expired memberships: ${result.expiredCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error('Membership expiration failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
