import React from 'react';
import { ShieldCheck, Laptop, GraduationCap, Users2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ObjectivesSection: React.FC = () => {
  const { language, t } = useLanguage();

  const objectives = [
    {
      titleHi: 'अधिकार संरक्षण एवं सेवा सुरक्षा',
      titleEn: 'Service Security & Teacher Rights',
      descHi: 'शिक्षकों की सेवा शर्तें, समयमान-वेतनमान विसंगति, पदोन्नति एवं पेंशन संबंधी संवैधानिक अधिकारों की शासन स्तर पर सशक्त पैरवी।',
      descEn: 'Strong advocacy at government level for teachers service rules, pay scale anomalies, promotions, and pension security.',
      icon: ShieldCheck,
      borderColor: 'border-l-4 border-l-[#102F50]',
      iconBg: 'bg-blue-50 text-[#102F50]',
    },
    {
      titleHi: 'पारदर्शी डिजिटल सदस्यता',
      titleEn: 'Transparent Digital Membership',
      descHi: 'प्रत्येक शिक्षक का पूर्ण डिजिटल रिकॉर्ड, सुरक्षित डेटाबेस, तत्काल ई-पहचान पत्र एवं पारदर्शी लेखा-जोखा प्रणाली।',
      descEn: 'Complete digital records for all member teachers, encrypted database, instant digital ID issuance and open ledger accounts.',
      icon: Laptop,
      borderColor: 'border-l-4 border-l-[#049B70]',
      iconBg: 'bg-emerald-50 text-[#049B70]',
    },
    {
      titleHi: 'शैक्षणिक उन्नयन एवं नवाचार',
      titleEn: 'Academic Upliftment & Innovation',
      descHi: 'मध्य प्रदेश की शालाओं में नवाचारी शिक्षण पद्धतियों, राष्ट्रीय शिक्षा नीति (NEP) कार्यशालाओं एवं शिक्षक सम्मान का संवर्धन।',
      descEn: 'Promoting innovative pedagogical methods, NEP teacher workshops, and recognizing exemplary classroom educators.',
      icon: GraduationCap,
      borderColor: 'border-l-4 border-l-amber-600',
      iconBg: 'bg-amber-50 text-amber-700',
    },
    {
      titleHi: 'संगठन संवाद एवं सहयोग',
      titleEn: 'Solidarity & Mutual Support',
      descHi: 'विकासखंड से लेकर राज्य स्तर तक प्रत्येक शिक्षक साथी की व्यक्तिगत व सेवा संवर्ग समस्याओं में निस्वार्थ सहयोग व विधिक मार्गदर्शन।',
      descEn: 'Selfless assistance, mutual aid, and legal guidance for every teacher companion from block to state headquarters.',
      icon: Users2,
      borderColor: 'border-l-4 border-l-[#E52528]',
      iconBg: 'bg-red-50 text-[#E52528]',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] watermark-book relative">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded"></span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] tracking-tight font-serif">
              {t('home.objectivesTitle', 'संगठन का उद्देश्य एवं निष्ठा')}
            </h2>
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded"></span>
          </div>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto font-medium">
            {t('home.objectivesSubtitle', 'मध्य प्रदेश के सभी शिक्षकों के सम्मान, स्वाभिमान एवं अधिकारों का संवाहक')}
          </p>
        </div>

        {/* Objectives Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {objectives.map((obj, idx) => {
            const Icon = obj.icon;
            return (
              <div
                key={idx}
                className={`bg-white rounded-xl p-6 sm:p-7 shadow-xs hover:shadow-md transition-shadow border border-slate-200/80 ${obj.borderColor}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${obj.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1.5 font-serif">
                      {language === 'hi' ? obj.titleHi : obj.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {language === 'hi' ? obj.descHi : obj.descEn}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
