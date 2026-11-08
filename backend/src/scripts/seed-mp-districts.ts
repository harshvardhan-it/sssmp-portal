import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { District } from '../models';

const inputSchema = z.object({
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().date(),
  districts: z.array(z.object({
    code: z.string().regex(/^MP_[A-Z0-9_]+$/),
    nameEn: z.string().min(1).max(100),
    nameHi: z.string().min(1).max(100),
  }).strict()).length(55),
}).strict();

export interface DistrictSeedSummary {
  inserted: number;
  existing: number;
  failed: number;
}

type DistrictSeedData = z.infer<typeof inputSchema>;

export async function seedDistrictRecords(
  data: DistrictSeedData,
  options: { dryRun?: boolean } = {},
): Promise<DistrictSeedSummary> {
  const summary: DistrictSeedSummary = { inserted: 0, existing: 0, failed: 0 };
  for (const district of data.districts) {
    if (options.dryRun) {
      const exists = await District.exists({ code: district.code });
      if (exists) summary.existing += 1;
      else summary.inserted += 1;
      continue;
    }
    try {
      const result = await District.updateOne(
        { code: district.code },
        {
          $setOnInsert: {
            ...district,
            isActive: true,
            source: data.source,
            sourceUrl: data.sourceUrl,
            sourceRetrievedAt: new Date(data.retrievedAt),
          },
        },
        { upsert: true },
      );
      if (result.upsertedCount === 1) summary.inserted += 1;
      else summary.existing += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}

export async function seedMpDistricts(
  fileName: string,
  options: { dryRun?: boolean } = {},
): Promise<DistrictSeedSummary> {
  const contents = await fs.readFile(path.resolve(process.cwd(), fileName), 'utf8');
  const data = inputSchema.parse(JSON.parse(contents));

  await mongoose.connect(env.mongodbUri, {
    dbName: 'sssmp_portal',
    serverSelectionTimeoutMS: 10000,
  });
  try {
    return await seedDistrictRecords(data, options);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileName = args.find((arg) => !arg.startsWith('--')) ??
    'src/data/mp-districts-igod.json';

  if (env.nodeEnv === 'production' && !dryRun) {
    console.error('District seeding is disabled in production. Use --dry-run to inspect only.');
    process.exitCode = 1;
  } else {
    void seedMpDistricts(fileName, { dryRun }).then((summary) => {
      console.log(`District seed ${dryRun ? 'dry-run' : 'complete'}: ${summary.inserted} inserted, ${summary.existing} existing, ${summary.failed} failed.`);
    }).catch((error: unknown) => {
      console.error('District seed failed:', error instanceof Error ? error.message : 'unknown error');
      process.exitCode = 1;
    });
  }
}
