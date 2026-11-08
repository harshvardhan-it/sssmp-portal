import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Download } from 'lucide-react';
import { NOTICES_DATA } from '../../data/noticesData';
import { useLanguage } from '../../contexts/LanguageContext';

export const RecentNotices: React.FC = () => {
  const { language } = useLanguage();
  const latestNotices = NOTICES_DATA.slice(0, 3);

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#049B70] uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-[#049B70]"></span>
              {language === 'hi' ? 'आधिकारिक सूचना पटल' : 'Official Notice Board'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] font-serif">
              {language === 'hi' ? 'महत्वपूर्ण सूचनाएँ एवं परिपत्र' : 'Important Notices & Orders'}
            </h2>
          </div>
          <Link
            to="/notices"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#102F50] hover:text-[#049B70] transition"
          >
            <span>{language === 'hi' ? 'सभी परिपत्र देखें' : 'View All Notices'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestNotices.map((notice) => (
            <div
              key={notice.id}
              className="bg-[#FAF9F5] rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {notice.date}
                  </span>
                  {notice.isNew && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                      {language === 'hi' ? 'नवीन' : 'NEW'}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-800 leading-snug mb-2 font-serif line-clamp-2">
                  {language === 'hi' ? notice.titleHi : notice.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                  {language === 'hi' ? notice.descriptionHi : notice.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-medium">
                  {language === 'hi' ? notice.departmentHi : notice.department}
                </span>
                <Link
                  to="/notices"
                  className="flex items-center gap-1 text-[#102F50] font-semibold hover:text-[#049B70]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF ({notice.fileSize})</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
