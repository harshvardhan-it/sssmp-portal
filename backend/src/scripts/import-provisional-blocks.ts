import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import {
  importProvisionalBlocks,
  PAB_BLOCK_EXPECTED_COUNT,
} from '../services/provisional-block-import.service';

const recordSchema = z.object({
  districtCode: z.string().trim().min(1),
  districtName: z.string().trim().min(1),
  blockCode: z.string().trim().min(1),
  blockName: z.string().trim().min(1),
}).strict();

async function main(): Promise<void> {
  if (env.nodeEnv === 'production') throw new Error('Provisional location import is disabled in production');
  const fileName = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!fileName) throw new Error('Usage: npm.cmd run import:provisional-blocks -- <records.json> [--dry-run]');
  const records = z.array(recordSchema).parse(JSON.parse(await fs.readFile(path.resolve(process.cwd(), fileName), 'utf8')));
  if (records.length !== PAB_BLOCK_EXPECTED_COUNT) {
    throw new Error(`Input must contain exactly ${PAB_BLOCK_EXPECTED_COUNT} records`);
  }
  await mongoose.connect(env.mongodbUri, { dbName: 'sssmp_portal', serverSelectionTimeoutMS: 10000 });
  try {
    const summary = await importProvisionalBlocks(records, { dryRun });
    console.log(JSON.stringify({ dryRun, ...summary }));
  } finally {
    await mongoose.disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error('Provisional block import failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
