import React from 'react';
import { UserCheck, CreditCard, Receipt, IdCard, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const RegistrationProcess: React.FC = () => {
  const { t } = useLanguage();

  const steps = [
    {
      num: '1',
      title: t('process.step1Title', 'जानकारी भरें'),
      desc: t('process.step1Desc', 'व्यक्तिगत, शैक्षणिक एवं पदस्थापना सम्बन्धी आवश्यक जानकारी 3-Step फॉर्म में दर्ज करें।'),
      icon: UserCheck,
      color: 'bg-blue-50 text-[#102F50] border-blue-200',
      badgeColor: 'bg-[#102F50] text-white',
    },
    {
      num: '2',
      title: t('process.step2Title', 'सदस्यता योजना चुनें'),
      desc: t('process.step2Desc', 'मासिक (₹10) अथवा वार्षिक (₹120) सदस्यता योजना का अपनी सुविधानुसार चयन करें।'),
      icon: CreditCard,
      color: 'bg-emerald-50 text-[#049B70] border-emerald-200',
      badgeColor: 'bg-[#049B70] text-white',
    },
    {
      num: '3',
      title: t('process.step3Title', 'Razorpay से भुगतान करें'),
      desc: t('process.step3Desc', 'सुरक्षित Razorpay चेकआउट से भुगतान पूरा करें। सदस्यता backend सत्यापन के बाद ही सक्रिय होगी।'),
      icon: Receipt,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeColor: 'bg-amber-600 text-white',
    },
    {
      num: '4',
      title: t('process.step4Title', 'डिजिटल सदस्यता प्राप्त करें'),
      desc: t('process.step4Desc', 'backend भुगतान सत्यापन के बाद डिजिटल सदस्यता कार्ड उपलब्ध होगा। केवल पंजीयन से सदस्यता सक्रिय नहीं होती।'),
      icon: IdCard,
      color: 'bg-red-50 text-red-600 border-red-200',
      badgeColor: 'bg-red-600 text-white',
    },
  ];

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200">
      <div className="max-w-5xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded"></span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] tracking-tight font-serif">
              {t('home.processTitle', 'सदस्यता पंजीयन प्रक्रिया')}
            </h2>
            <span className="w-8 h-0.5 bg-[#102F50]/40 rounded"></span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm md:text-base max-w-xl mx-auto font-medium">
            {t('home.processSubtitle', 'आधिकारिक डिजिटल सदस्यता प्राप्त करने की सरल एवं सुव्यवस्थित प्रक्रिया')}
          </p>
        </div>

        {/* Process Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative bg-[#FAF9F5] rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shadow-2xs ${step.badgeColor}`}
                    >
                      {step.num}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${step.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-1.5 font-serif">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {idx < 3 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
