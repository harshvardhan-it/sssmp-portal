import React from 'react';
import { Award, ExternalLink, ShieldCheck, UserRound } from 'lucide-react';
import { LEADERSHIP_DATA } from '../../data/leadershipData';
import { useLanguage } from '../../contexts/LanguageContext';

export const LeadershipPage: React.FC = () => {
  const { language, t } = useLanguage();

  return (
    <div className="bg-[#FAF9F5] min-h-screen py-10 sm:py-14 pattern-dots">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-[#102F50] text-xs font-bold mb-3">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t('leadership.badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102F50] font-serif mb-3">
            {t('leadership.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {t('leadership.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LEADERSHIP_DATA.map((leader) => (
            <article
              key={leader.id}
              className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-20 h-20 rounded-2xl bg-[#102F50]/10 flex items-center justify-center text-[#102F50] border border-[#102F50]/20 shrink-0 overflow-hidden">
                  {leader.id === 'rakesh-dubey' ? (
                    <img
                      src="/rakesh-dubey.png"
                      alt={language === 'hi' ? leader.nameHi : leader.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <UserRound className="w-8 h-8" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900 font-serif">
                    {language === 'hi' ? leader.nameHi : leader.name}
                  </h2>
                  <p className="text-sm font-semibold text-[#049B70] mt-1">
                    {language === 'hi' ? leader.roleHi : leader.role}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'hi' ? leader.regionHi : leader.region}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                {language === 'hi' ? leader.bioHi : leader.bioEn}
              </p>

              <div className="mt-5">
                <h3 className="text-sm font-bold text-[#102F50] mb-3">
                  {t('leadership.contributions')}
                </h3>
                <ul className="space-y-2.5">
                  {(language === 'hi' ? leader.highlightsHi : leader.highlightsEn).map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#049B70] shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-5">
                <a
                  href={leader.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#102F50] hover:text-[#049B70] transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('leadership.facebookProfile')}
                </a>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3 h-3 text-[#049B70]" />
                  {t('leadership.publicRecordNote')}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
