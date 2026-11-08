import React, { useEffect, useState } from 'react';
import { fetchDistrictBlocks, fetchDistricts, type LocationBlock, type LocationDistrict } from '../../lib/api';

interface Props {
  districtId: string;
  blockId: string;
  onChange: (field: 'district' | 'block', value: string) => void;
  language: string;
}

export const MemberLocationSelector: React.FC<Props> = ({ districtId, blockId, onChange, language }) => {
  const [districts, setDistricts] = useState<LocationDistrict[]>([]);
  const [blocks, setBlocks] = useState<LocationBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  useEffect(() => { fetchDistricts().then(setDistricts).catch(() => setDistricts([])); }, []);
  useEffect(() => {
    if (!districtId) { setBlocks([]); return; }
    setLoadingBlocks(true);
    fetchDistrictBlocks(districtId).then((result) => setBlocks(result.blocks)).catch(() => setBlocks([])).finally(() => setLoadingBlocks(false));
  }, [districtId]);
  const name = (item: { nameHi: string; nameEn: string }) => language === 'hi' ? item.nameHi : item.nameEn;
  return <div className="md:col-span-2 grid md:grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border">
    <label className="text-sm">{language === 'hi' ? 'जिला' : 'District'}
      <select value={districtId} onChange={(event) => { onChange('district', event.target.value); onChange('block', ''); }} className="mt-1 w-full rounded border p-2" required>
        <option value="">{language === 'hi' ? 'जिला चुनें' : 'Select district'}</option>
        {districts.map((district) => <option key={district.id} value={district.id}>{name(district)}</option>)}
      </select>
    </label>
    <label className="text-sm">{language === 'hi' ? 'शिक्षा ब्लॉक' : 'Education Block'}
      <select value={blockId} disabled={!districtId || loadingBlocks} onChange={(event) => onChange('block', event.target.value)} className="mt-1 w-full rounded border p-2">
        <option value="">{loadingBlocks ? (language === 'hi' ? 'लोड हो रहा है…' : 'Loading…') : (language === 'hi' ? 'ब्लॉक चुनें' : 'Select block')}</option>
        {blocks.map((block) => <option key={block.id} value={block.id}>{name(block)}{block.verificationStatus === 'PROVISIONAL' ? ` — ${language === 'hi' ? 'अनंतिम' : 'Provisional'}` : ''}</option>)}
      </select>
    </label>
    <p className="md:col-span-2 text-xs text-slate-600">{language === 'hi' ? 'अनंतिम ब्लॉक के लिए स्थान सत्यापन लंबित रहेगा और इससे Block Admin अधिकार नहीं मिलते।' : 'A provisional block remains location-pending and never grants Block Admin access.'}</p>
  </div>;
};
