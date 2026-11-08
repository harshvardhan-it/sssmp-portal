import mongoose from 'mongoose';
import { env } from '../config/env';
import { Membership, PaymentTransaction } from '../models';

const apply = process.argv.includes('--apply');

async function main() {
  if (apply && env.nodeEnv === 'production') throw new Error('Refusing lifecycle migration in production; run an approved maintenance procedure');
  await mongoose.connect(env.mongodbUri);
  const statuses = await Membership.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  const legacyApproved = await Membership.find({ status: 'APPROVED' }).select('_id memberId').lean();
  const capturedMembershipIds = new Set((await PaymentTransaction.find({ status: 'CAPTURED' }).select('membershipId').lean()).map((payment) => payment.membershipId.toString()));
  const report = {
    dryRun: !apply,
    statuses,
    legacyApproved: legacyApproved.length,
    approvedWithCapturedPayment: legacyApproved.filter((membership) => capturedMembershipIds.has(membership._id.toString())).length,
    approvedWithoutCapturedPayment: legacyApproved.filter((membership) => !capturedMembershipIds.has(membership._id.toString())).length,
  };
  console.log(JSON.stringify(report, null, 2));
  if (apply) {
    const result = await Membership.updateMany(
      { status: 'APPROVED', _id: { $nin: [...capturedMembershipIds] } },
      { $set: { status: 'PENDING' }, $unset: { approvedAt: '', approvedBy: '' } },
    );
    console.log(JSON.stringify({ migratedToPendingPayment: result.modifiedCount }, null, 2));
  }
  await mongoose.disconnect();
}

main().catch(async (error) => { console.error('Membership lifecycle report failed'); console.error(error instanceof Error ? error.message : error); await mongoose.disconnect(); process.exitCode = 1; });
