import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { Block, District } from '../models';

const districtFileSchema = z.object({
  source: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().date(),
  districts: z.array(z.object({
    code: z.string(),
    nameEn: z.string().min(1),
    nameHi: z.string().min(1),
  })).length(55),
});

const blockFileSchema = z.array(z.object({
  districtCode: z.string().min(1),
  districtName: z.string().min(1),
  blockCode: z.string().min(1),
  blockName: z.string().min(1),
})).length(263);

/** Loads the checked-in location snapshots without replacing existing records. */
export async function ensureLocationData(dataDirectory = path.resolve(__dirname, '../data')): Promise<void> {
  const districtData = districtFileSchema.parse(JSON.parse(
    await fs.readFile(path.join(dataDirectory, 'mp-districts-igod.json'), 'utf8'),
  ));
  const blockData = blockFileSchema.parse(JSON.parse(
    await fs.readFile(path.join(dataDirectory, 'mp-pab-2022-23-annexure-xii.json'), 'utf8'),
  ));

  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '');
  const districts = new Map<string, { _id: unknown; nameEn: string }>();
  for (const input of districtData.districts) {
    const district = await District.findOneAndUpdate(
      { code: input.code },
      { $setOnInsert: { ...input, isActive: true, source: districtData.source, sourceUrl: districtData.sourceUrl, sourceRetrievedAt: new Date(districtData.retrievedAt) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    districts.set(normalize(input.nameEn), { _id: district._id, nameEn: district.nameEn });
  }

  for (const input of blockData) {
    const sourceName = input.districtName.replace(/^HOSHANGABAD$/i, 'NARMADAPURAM')
      .replace(/^KHARGONE$/i, 'KHARGONE (WEST NIMAR)')
      .replace(/^KHANDWA$/i, 'KHANDWA (EAST NIMAR)');
    const district = districts.get(normalize(sourceName));
    if (!district) continue;
    await Block.updateOne(
      { sourceBlockCode: input.blockCode },
      { $setOnInsert: { nameEn: input.blockName, nameHi: input.blockName, code: `PAB_${input.blockCode}`, districtId: district._id, isActive: true, source: 'Ministry of Education / Samagra Shiksha', sourceDocument: 'MP PAB 2022-23 Annexure XII', sourceBlockCode: input.blockCode, datasetVersion: '2022-23', verificationStatus: 'PROVISIONAL' } },
      { upsert: true },
    );
  }
}
