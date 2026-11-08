
import React from 'react';

export const Introduction: React.FC = () => {
  return (
    <section className="pt-8 pb-5 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-[#102F50] text-xs font-semibold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#049B70]" />
          <span>पंजी. क्रमांक: 01/01/01/38865</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#102F50] tracking-tight font-serif mb-3">
          शासकीय शिक्षक संगठन मध्यप्रदेश
        </h1>

        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-[#8292A9] mb-3">
          शिक्षा, शिक्षार्थी, शिक्षालय और शिक्षक का सर्वांगीण विकास
        </h2>

        <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl mx-auto">
          मध्यप्रदेश में शिक्षा की गुणवत्ता, शिक्षार्थियों के उज्ज्वल भविष्य,
          शिक्षालयों के विकास एवं शिक्षकों के सम्मान और सर्वांगीण उन्नति
          के लिए समर्पित संगठन।
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="w-12 h-0.5 bg-[#102F50]/20 rounded-full" />
          <span className="w-2 h-2 rounded-full bg-[#049B70]" />
          <span className="w-12 h-0.5 bg-[#102F50]/20 rounded-full" />
        </div>
      </div>
    </section>
  );
};
