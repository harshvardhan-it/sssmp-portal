import React from 'react';
import { Link } from 'react-router-dom';
import { Gem, ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export interface PlanConfig {
  officeBearerPrice: number;
  yearlyPrice: number;
}

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  officeBearerPrice: 1000,
  yearlyPrice: 120,
};

interface SubscriptionPlansProps {
  config?: PlanConfig;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  config = DEFAULT_PLAN_CONFIG,
}) => {
  const { t } = useLanguage();

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] pattern-dots relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* Section Heading matching RSSMP reference */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded"></span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] tracking-tight font-serif">
              {t('home.plansTitle', 'सदस्यता योजनाएँ')}
            </h2>
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded"></span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-xl mx-auto font-medium">
            {t('home.plansSubtitle', 'संगठन के सशक्तिकरण एवं डिजिटल सदस्यता हेतु सदस्यता योजनाएँ')}
          </p>
          <div className="mt-1.5 text-[11px] text-amber-800 font-medium">
            {t('home.constitutionNote', '* संगठन के संविधान अनुसार केवल दो आधिकारिक सदस्यता विकल्प निर्धारित हैं')}
          </div>
        </div>

        {/* EXACTLY TWO Subscription Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-3xl mx-auto items-stretch">
          {/* Card 1: Office Bearer (पदाधिकारी सदस्य) */}
          <div className="bg-white rounded-xl shadow-xs hover:shadow-md transition-all duration-300 border border-slate-200/90 overflow-hidden flex flex-col justify-between border-l-4 border-l-[#E52528] p-6 sm:p-7 group">
            {/* Top Row: Icon + Title/Subtitle */}
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#E52528] shrink-0 group-hover:scale-105 transition-transform">
                <Gem className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#E52528] font-serif leading-tight">
                  {t('plans.officeBearerTitle', 'पदाधिकारी सदस्य')}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {t('plans.officeBearerSubtitle', 'Office Bearer')}
                </p>
              </div>
            </div>

            {/* Middle: Price */}
            <div className="py-6 sm:py-8 text-center my-auto">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#102F50] tracking-tight">
                ₹{config.officeBearerPrice}
              </span>
            </div>

            {/* Bottom: Full-Width Red Button */}
            <div className="pt-2">
              <Link
                to="/register?plan=office_bearer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#E52528] hover:bg-[#c91d20] text-white font-bold text-sm shadow-xs hover:shadow transition-all group cursor-pointer"
              >
                <span>{t('plans.registerBtn', 'पंजीयन करें')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Card 2: Yearly Subscription (वार्षिक सदस्यता) */}
          <div className="bg-white rounded-xl shadow-xs hover:shadow-md transition-all duration-300 border border-slate-200/90 overflow-hidden flex flex-col justify-between border-l-4 border-l-[#049B70] p-6 sm:p-7 group">
            {/* Top Row: Icon + Title/Subtitle */}
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-[#049B70] shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#049B70] font-serif leading-tight">
                  {t('plans.yearlyTitle', 'वार्षिक सदस्यता')}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {t('plans.yearlySubtitle', 'Yearly Subscription')}
                </p>
              </div>
            </div>

            {/* Middle: Price */}
            <div className="py-6 sm:py-8 text-center my-auto">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#102F50] tracking-tight">
                ₹{config.yearlyPrice}
              </span>
            </div>

            {/* Bottom: Full-Width Green Button */}
            <div className="pt-2">
              <Link
                to="/register?plan=yearly"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white font-bold text-sm shadow-xs hover:shadow transition-all group cursor-pointer"
              >
                <span>{t('plans.registerBtn', 'पंजीयन करें')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
