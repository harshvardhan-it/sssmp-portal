import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173',
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '1d'),
  authRateLimitWindowMs: 15 * 60 * 1000,
  authRateLimitMaxAttempts: 10,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  razorpayEnvironment: process.env.RAZORPAY_ENVIRONMENT ?? 'test',
};
