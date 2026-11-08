import { Block, District } from '../models';
import type { Types } from 'mongoose';

export const PAB_BLOCK_SOURCE_URL =
  'https://dsel.education.gov.in/sites/default/files/2022-07/pab_mp_2223.pdf';
export const PAB_BLOCK_SOURCE_DOCUMENT = 'MP PAB 2022-23 Annexure XII';
export const PAB_BLOCK_DATASET_VERSION = '2022-23';
export const PAB_BLOCK_EXPECTED_COUNT = 263;
const SOURCE_DISTRICT_ALIASES: Record<string, string> = {
  KHARGONE: 'KHARGONE (WEST NIMAR)',
  KHANDWA: 'KHANDWA (EAST NIMAR)',
  HOSHANGABAD: 'NARMADAPURAM',
};

export interface ProvisionalBlockRecord {
  districtCode: string;
  districtName: string;
  blockCode: string;
  blockName: string;
}

export interface DistrictMatch {
  record: ProvisionalBlockRecord;
  district?: { _id: Types.ObjectId; code: string; nameEn: string };
  reason?: 'UNMATCHED' | 'AMBIGUOUS';
}

export interface ImportSummary {
  extracted: number;
  inserted: number;
  existing: number;
  unmatched: number;
  failed: number;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase()
    .replace(/district$/i, '');
}

export function matchDistrictRecords(
  records: ProvisionalBlockRecord[],
  districts: Array<{ _id: Types.ObjectId; code: string; nameEn: string }>,
): DistrictMatch[] {
  return records.map((record) => {
    const byCode = districts.filter((district) => district.code.toLowerCase() === record.districtCode.toLowerCase());
    if (byCode.length === 1) return { record, district: byCode[0] };
    if (byCode.length > 1) return { record, reason: 'AMBIGUOUS' };
    const aliasedName = SOURCE_DISTRICT_ALIASES[record.districtName.toUpperCase()] ?? record.districtName;
    const byName = districts.filter((district) => normalizeName(district.nameEn) === normalizeName(aliasedName));
    if (byName.length === 1) return { record, district: byName[0] };
    return { record, reason: byName.length > 1 ? 'AMBIGUOUS' : 'UNMATCHED' };
  });
}

export async function importProvisionalBlocks(
  records: ProvisionalBlockRecord[],
  options: { dryRun: boolean },
): Promise<ImportSummary> {
  if (records.length !== PAB_BLOCK_EXPECTED_COUNT) {
    throw new Error(`Expected ${PAB_BLOCK_EXPECTED_COUNT} extracted records, received ${records.length}`);
  }
  const districts = await District.find({ isActive: true }).select({ code: 1, nameEn: 1 }).lean();
  const matches = matchDistrictRecords(records, districts);
  const summary: ImportSummary = {
    extracted: records.length,
    inserted: 0,
    existing: 0,
    unmatched: matches.filter((match) => !match.district).length,
    failed: 0,
  };
  if (options.dryRun) return summary;

  for (const match of matches) {
    if (!match.district) continue;
    try {
      const existing = await Block.findOne({
        $or: [{ sourceBlockCode: match.record.blockCode }, { code: match.record.blockCode.toUpperCase() }],
      }).lean();
      if (existing) {
        summary.existing += 1;
        continue;
      }
      await Block.create({
        nameEn: match.record.blockName,
        nameHi: match.record.blockName,
        code: match.record.blockCode,
        districtId: match.district._id,
        isActive: true,
        source: 'Ministry of Education / Samagra Shiksha',
        sourceUrl: PAB_BLOCK_SOURCE_URL,
        sourceDocument: PAB_BLOCK_SOURCE_DOCUMENT,
        sourceBlockCode: match.record.blockCode,
        datasetVersion: PAB_BLOCK_DATASET_VERSION,
        verificationStatus: 'PROVISIONAL',
      });
      summary.inserted += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}
