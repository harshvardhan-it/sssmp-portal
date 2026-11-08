import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { Block, District } from '../models';

const locationFileSchema = z.object({
  districts: z.array(z.object({
    code: z.string().regex(/^[A-Z0-9_-]+$/),
    nameEn: z.string().min(1).max(100),
    nameHi: z.string().min(1).max(100),
    blocks: z.array(z.object({
      code: z.string().regex(/^[A-Z0-9_-]+$/),
      nameEn: z.string().min(1).max(100),
      nameHi: z.string().min(1).max(100),
    })),
  })),
}).strict();

async function seedLocations(fileName: string): Promise<void> {
  if (env.nodeEnv === 'production') {
    throw new Error('Location seeding is disabled in production');
  }

  const filePath = path.resolve(process.cwd(), fileName);
  const contents = await fs.readFile(filePath, 'utf8');
  const data = locationFileSchema.parse(JSON.parse(contents));

  await mongoose.connect(env.mongodbUri, {
    dbName: 'sssmp_portal',
    serverSelectionTimeoutMS: 10000,
  });

  let districtsInserted = 0;
  let blocksInserted = 0;
  try {
    for (const districtInput of data.districts) {
      const district = await District.findOneAndUpdate(
        { code: districtInput.code },
        {
          $setOnInsert: {
            code: districtInput.code,
            nameEn: districtInput.nameEn,
            nameHi: districtInput.nameHi,
            isActive: true,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (district.createdAt.getTime() === district.updatedAt.getTime()) districtsInserted += 1;

      for (const blockInput of districtInput.blocks) {
        const block = await Block.findOneAndUpdate(
          { code: blockInput.code },
          {
            $setOnInsert: {
              code: blockInput.code,
              nameEn: blockInput.nameEn,
              nameHi: blockInput.nameHi,
              districtId: district._id,
              isActive: true,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        if (block.createdAt.getTime() === block.updatedAt.getTime()) blocksInserted += 1;
      }
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log(`Location seed complete: ${districtsInserted} districts, ${blocksInserted} blocks inserted.`);
}

const fileName = process.argv[2];
if (!fileName) {
  console.error('Usage: npm.cmd run seed:locations -- <verified-location-file.json>');
  process.exitCode = 1;
} else {
  void seedLocations(fileName).catch((error: unknown) => {
    console.error('Location seed failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  });
}
