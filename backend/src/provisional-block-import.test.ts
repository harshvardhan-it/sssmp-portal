import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import {
  matchDistrictRecords,
  PAB_BLOCK_EXPECTED_COUNT,
} from './services/provisional-block-import.service';

test('requires the official Annexure XII record count', () => {
  assert.equal(PAB_BLOCK_EXPECTED_COUNT, 263);
});

test('matches source districts by official code before normalized name', () => {
  const district = { _id: new Types.ObjectId(), code: 'MP-01', nameEn: 'Bhopal' };
  const matches = matchDistrictRecords([
    { districtCode: 'MP-01', districtName: 'Different label', blockCode: 'B1', blockName: 'Block One' },
    { districtCode: 'UNKNOWN', districtName: 'Bhopal', blockCode: 'B2', blockName: 'Block Two' },
    { districtCode: 'UNKNOWN', districtName: 'Missing', blockCode: 'B3', blockName: 'Block Three' },
  ], [district]);

  assert.equal(matches[0].district?.code, 'MP-01');
  assert.equal(matches[1].district?.code, 'MP-01');
  assert.equal(matches[2].reason, 'UNMATCHED');
});
