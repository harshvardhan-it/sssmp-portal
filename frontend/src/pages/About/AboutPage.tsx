import React from 'react';
import { ShieldCheck, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export const AboutPage: React.FC = () => {
  const { t } = useLanguage();
  const cards = [
    { title: t('organizationInfo.purposeTitle'), subtitle: t('organizationInfo.purposeSubtitle'), description: t('organizationInfo.purposeDesc'), icon: BookOpen, borderColor: 'border-t-4 border-t-[#102F50]', iconBg: 'bg-blue-50 text-[#102F50]' },
    { title: t('organizationInfo.eligibilityTitle'), subtitle: t('organizationInfo.eligibilitySubtitle'), description: t('organizationInfo.eligibilityDesc'), icon: GraduationCap, borderColor: 'border-t-4 border-t-amber-600', iconBg: 'bg-amber-50 text-amber-700' },
  ];
  return <div className="bg-[#FAF9F5] min-h-screen py-10 sm:py-14 pattern-dots">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#102F50] text-xs font-bold mb-3"><ShieldCheck className="w-4 h-4 text-[#049B70]" /><span>{t('home.intro.regBadge')}</span></div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102F50] font-serif mb-4">{t('org.name')}</h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">{t('home.intro.subtitle')}</p>
      </div>
      <section className="mb-12">
        <div className="text-center mb-8 sm:mb-10"><h2 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] tracking-tight font-serif">{t('organizationInfo.sectionTitle')}</h2><p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-2xl mx-auto mt-3">{t('organizationInfo.sectionSubtitle')}</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">{cards.map((card) => { const Icon = card.icon; return <article key={card.title} className={`h-full bg-white rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow border border-slate-200/80 ${card.borderColor}`}><div className="flex items-start gap-3.5"><div className={`p-2.5 rounded-xl shrink-0 ${card.iconBg}`}><Icon className="w-5 h-5 sm:w-6 sm:h-6" /></div><div className="min-w-0"><h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 font-serif">{card.title}</h3><p className="text-xs font-semibold text-slate-500 mb-2">{card.subtitle}</p><p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{card.description}</p></div></div></article>; })}</div>
      </section>
      <div className="bg-[#102F50] text-white rounded-2xl p-8 text-center relative overflow-hidden shadow-lg"><h3 className="text-2xl font-bold font-serif mb-2 text-amber-300">{t('organizationInfo.joinTitle')}</h3><p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto mb-6">{t('organizationInfo.joinDesc')}</p><Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white font-bold text-sm shadow transition"><span>{t('organizationInfo.joinButton')}</span><ArrowRight className="w-4 h-4" /></Link></div>
    </div>
  </div>;
};
