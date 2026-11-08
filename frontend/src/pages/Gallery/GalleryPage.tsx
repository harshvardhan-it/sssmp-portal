import React, { useState } from 'react';
import { Image, MapPin, Calendar, Maximize2 } from 'lucide-react';
import { GALLERY_DATA } from '../../data/galleryData';
import { useLanguage } from '../../contexts/LanguageContext';
import type { GalleryItem } from '../../types';

export const GalleryPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<GalleryItem | null>(null);

  return (
    <div className="bg-[#FAF9F5] min-h-screen py-10 sm:py-14 pattern-dots">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#049B70] text-xs font-bold mb-3">
            <Image className="w-4 h-4" />
            <span>{t('galleryPage.badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102F50] font-serif mb-3">
            {t('galleryPage.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {t('galleryPage.subtitle')}
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_DATA.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition-all group flex flex-col justify-between"
            >
              <div className="relative overflow-hidden aspect-4/3 cursor-pointer" onClick={() => setSelectedImage(item)}>
                <img
                  src={item.imageUrl}
                  alt={item.titleHi}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-xs">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 bg-[#102F50]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                  {item.category}
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {item.date}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    {language === 'hi' ? item.locationHi : item.location}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug font-serif">
                  {language === 'hi' ? item.titleHi : item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.imageUrl} alt={selectedImage.titleHi} className="w-full max-h-[70vh] object-cover" />
            <div className="p-4 bg-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-[#102F50] text-sm sm:text-base font-serif">
                  {language === 'hi' ? selectedImage.titleHi : selectedImage.title}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'hi' ? selectedImage.locationHi : selectedImage.location} • {selectedImage.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                {t('galleryPage.closeModal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
