
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDatabase } from '../config/database';
import { User } from '../models';

async function resetPassword() {
  const email = process.env.BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_PASSWORD;

  if (!email || !password || password.length < 8 || password.length > 128) {
    throw new Error('Valid email and 8-128 character password required');
  }

  await connectDatabase();

  try {
    const user = await User.findOne({
      email,
      role: 'SUPER_ADMIN',
      accountStatus: 'ACTIVE',
    }).select('+passwordHash');

    if (!user) {
      throw new Error('Active SUPER_ADMIN account not found');
    }

    const passwordHash = await User.hashPassword(password);

    const result = await User.updateOne(
      {
        _id: user._id,
        role: 'SUPER_ADMIN',
        accountStatus: 'ACTIVE',
      },
      {
        $set: { passwordHash },
        $inc: { sessionVersion: 1 },
      },
      { runValidators: true }
    );

    if (result.modifiedCount !== 1) {
      throw new Error('Password update failed');
    }

    const updated = await User.findById(user._id).select('+passwordHash');

    if (!updated || !(await bcrypt.compare(password, updated.passwordHash))) {
      throw new Error('Password verification failed');
    }

    console.log('SUCCESS: SUPER_ADMIN password reset.');
    console.log('Email:', updated.email);
    console.log('Role:', updated.role);
    console.log('Status:', updated.accountStatus);
    console.log('Password verification: PASSED');
  } finally {
    await mongoose.disconnect();
  }
}

resetPassword().catch(error => {
  console.error('PASSWORD RESET FAILED:', error.message);
  process.exitCode = 1;
});
