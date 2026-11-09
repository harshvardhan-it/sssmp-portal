import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const QuickInfoSection: React.FC = () => {
  const { t } = useLanguage();
  return <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] border-t border-slate-200">
    <div className="max-w-5xl mx-auto"><div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
      <div className="max-w-3xl mx-auto space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#102F50] text-xs font-semibold"><ShieldCheck className="w-4 h-4 text-[#049B70]" /><span>{t('quickInfo.badge')}</span></div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#102F50] font-serif">{t('org.name')}</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{t('quickInfo.desc')}</p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white text-xs font-bold transition shadow-xs"><UserPlus className="w-3.5 h-3.5" /><span>{t('quickInfo.ctaRegister')}</span></Link>
          <Link to="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#102F50] text-xs font-bold border border-slate-300 transition"><LogIn className="w-3.5 h-3.5" /><span>{t('quickInfo.ctaCheckStatus')}</span></Link>
        </div>
      </div>
    </div></div>
  </section>;
};
