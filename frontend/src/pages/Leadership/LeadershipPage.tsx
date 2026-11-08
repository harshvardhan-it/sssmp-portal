import React, { useState } from 'react';
import { ShieldCheck, UserCheck, MapPin, Award } from 'lucide-react';
import { LEADERSHIP_DATA } from '../../data/leadershipData';
import { useLanguage } from '../../contexts/LanguageContext';

export const LeadershipPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [filterLevel, setFilterLevel] = useState<'all' | 'state' | 'division'>('all');

  const filtered = LEADERSHIP_DATA.filter(
    (l) => filterLevel === 'all' || l.level === filterLevel
  );

  return (
    <div className="bg-[#FAF9F5] min-h-screen py-10 sm:py-14 pattern-dots">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#102F50] text-xs font-bold mb-3">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t('leadership.badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102F50] font-serif mb-3">
            {t('leadership.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {t('leadership.subtitle')}
          </p>

          <div className="mt-3 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 inline-block">
            {t('leadership.constitutionNote')}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <button
            onClick={() => setFilterLevel('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterLevel === 'all'
                ? 'bg-[#102F50] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('leadership.tabAll')}
          </button>
          <button
            onClick={() => setFilterLevel('state')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterLevel === 'state'
                ? 'bg-[#102F50] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('leadership.tabState')}
          </button>
          <button
            onClick={() => setFilterLevel('division')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterLevel === 'division'
                ? 'bg-[#102F50] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t('leadership.tabDivision')}
          </button>
        </div>

        {/* Leaders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((leader) => (
            <div
              key={leader.id}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#102F50]/10 flex items-center justify-center text-[#102F50] font-serif font-black text-lg border border-[#102F50]/20">
                    <UserCheck className="w-7 h-7" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      leader.level === 'state'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-100 text-[#102F50] border border-blue-200'
                    }`}
                  >
                    {leader.level === 'state' ? t('leadership.levelState') : t('leadership.levelDivision')}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1 font-serif">
                  {language === 'hi' ? leader.nameHi : leader.name}
                </h3>

                <div className="text-xs font-semibold text-[#049B70] mb-3">
                  {language === 'hi' ? leader.roleHi : leader.role}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{language === 'hi' ? leader.regionHi : leader.region}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {language === 'hi' ? leader.bioHi : leader.bioEn}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#049B70]" />
                  {t('leadership.authorizedBadge')}
                </span>
                <span className="font-mono text-slate-400">SSSMP/EXEC</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
