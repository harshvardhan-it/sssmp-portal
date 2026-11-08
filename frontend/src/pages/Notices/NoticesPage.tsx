import React, { useState } from 'react';
import { Download, Calendar, Search, Filter, Bell } from 'lucide-react';
import { NOTICES_DATA } from '../../data/noticesData';
import { useLanguage } from '../../contexts/LanguageContext';

export const NoticesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = NOTICES_DATA.filter((item) => {
    const matchSearch =
      searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.titleHi.includes(searchTerm) ||
      (item.descriptionHi && item.descriptionHi.includes(searchTerm));

    const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  return (
    <div className="bg-[#FAF9F5] min-h-screen py-10 sm:py-14 pattern-dots">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-3">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>{t('noticesPage.badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102F50] font-serif mb-3">
            {t('noticesPage.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {t('noticesPage.subtitle')}
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('noticesPage.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              {t('noticesPage.filterLabel')}
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#102F50] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('noticesPage.catAll')}
            </button>
            <button
              onClick={() => setSelectedCategory('circular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                selectedCategory === 'circular'
                  ? 'bg-[#102F50] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('noticesPage.catCircular')}
            </button>
            <button
              onClick={() => setSelectedCategory('order')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer ${
                selectedCategory === 'order'
                  ? 'bg-[#102F50] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('noticesPage.catOrder')}
            </button>
          </div>
        </div>

        {/* Notices List */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.date}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-[#102F50]">
                      {language === 'hi' ? item.departmentHi : item.department}
                    </span>
                    {item.isNew && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                        {t('noticesPage.newBadge')}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-bold text-slate-900 leading-snug font-serif">
                    {language === 'hi' ? item.titleHi : item.title}
                  </h2>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {language === 'hi' ? item.descriptionHi : item.description}
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-[11px] text-slate-500">{t('noticesPage.sizeLabel')} {item.fileSize}</span>
                  <button
                    onClick={() =>
                      alert(`${t('noticesPage.downloadingToast')} (${language === 'hi' ? item.titleHi : item.title})`)
                    }
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#102F50] hover:bg-[#0c233c] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('noticesPage.downloadPdf')}</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-8 text-center text-slate-500 text-sm border border-slate-200">
              {t('noticesPage.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
