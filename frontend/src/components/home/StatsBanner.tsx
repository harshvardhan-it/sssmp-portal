import React from 'react';
import { Users, Building2, MapPin, Award } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const StatsBanner: React.FC = () => {
  const { t } = useLanguage();

  const stats = [
    {
      value: '45,000+',
      label: t('home.statsMembers', 'कुल पंजीकृत सदस्य'),
      sublabel: 'समस्त संवर्ग (प्राथमिक, माध्यमिक, उच्च मा.)',
      icon: Users,
    },
    {
      value: '55',
      label: t('home.statsDistricts', 'सक्रिय ज़िले'),
      sublabel: 'मध्य प्रदेश के सभी राजस्व ज़िले',
      icon: MapPin,
    },
    {
      value: '313',
      label: t('home.statsBlocks', 'विकासखंड व्याप्ति'),
      sublabel: 'सक्रिय ब्लॉक स्तरीय कार्यकारिणी',
      icon: Building2,
    },
    {
      value: '100%',
      label: 'पारदर्शी व लोकतांत्रिक',
      sublabel: 'शिक्षकों द्वारा, शिक्षकों के हित में',
      icon: Award,
    },
  ];

  return (
    <div className="bg-[#102F50] text-white py-12 px-4 sm:px-6 lg:px-8 border-y-2 border-[#1c456f]">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="text-center group">
                <div className="inline-flex p-3 rounded-2xl bg-white/10 mb-3 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-300 tracking-tight font-serif">
                  {item.value}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white mt-1">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {item.sublabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
