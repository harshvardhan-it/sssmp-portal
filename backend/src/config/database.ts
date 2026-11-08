import mongoose from 'mongoose';
import { env } from './env';

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.mongodbUri, {
    dbName: 'sssmp_portal',
    serverSelectionTimeoutMS: 10000,
  });
  console.log('MongoDB connected');
}
