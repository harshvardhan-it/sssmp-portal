import React from 'react';
import { BookOpen, HeartHandshake, GraduationCap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const OrganizationValues: React.FC = () => {
  const { t } = useLanguage();
  const informationCards = [
    { title: t('organizationInfo.purposeTitle'), subtitle: t('organizationInfo.purposeSubtitle'), description: t('organizationInfo.purposeDesc'), icon: BookOpen, borderColor: 'border-t-4 border-t-[#102F50]', iconBg: 'bg-blue-50 text-[#102F50]' },
    { title: t('organizationInfo.specialTitle'), subtitle: t('organizationInfo.specialSubtitle'), description: t('organizationInfo.specialDesc'), icon: HeartHandshake, borderColor: 'border-t-4 border-t-[#049B70]', iconBg: 'bg-emerald-50 text-[#049B70]' },
    { title: t('organizationInfo.eligibilityTitle'), subtitle: t('organizationInfo.eligibilitySubtitle'), description: t('organizationInfo.eligibilityDesc'), icon: GraduationCap, borderColor: 'border-t-4 border-t-amber-600', iconBg: 'bg-amber-50 text-amber-700' },
  ];
  return (
    <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] watermark-book relative">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded" />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] tracking-tight font-serif">{t('organizationInfo.sectionTitle')}</h2>
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded" />
          </div>
          <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-2xl mx-auto font-medium">{t('organizationInfo.sectionSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {informationCards.map((card) => {
            const Icon = card.icon;
            return <article key={card.title} className={`h-full bg-white rounded-xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow border border-slate-200/80 ${card.borderColor}`}>
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 ${card.iconBg}`}><Icon className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 font-serif">{card.title}</h3>
                  <p className="text-xs font-semibold text-slate-500 mb-2">{card.subtitle}</p>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{card.description}</p>
                </div>
              </div>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
};
