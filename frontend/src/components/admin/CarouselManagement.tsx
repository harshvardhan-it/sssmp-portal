import React, { useState } from 'react';
import {
  Image,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  CheckCircle,
  XCircle,
  RotateCcw,
  Plus,
  AlertCircle,
  Link as LinkIcon,
} from 'lucide-react';
import { useCarousel } from '../../contexts/CarouselContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { CarouselSlide } from '../../types';

export const CarouselManagement: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    slides,
    activeSlides,
    addSlide,
    toggleSlideActive,
    deleteSlide,
    moveSlide,
    resetToDefault,
  } = useCarousel();

  const [previewSlide, setPreviewSlide] = useState<CarouselSlide | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New slide form state
  const [newTitleHi, setNewTitleHi] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newCaptionHi, setNewCaptionHi] = useState('');
  const [newCaptionEn, setNewCaptionEn] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [filePreview, setFilePreview] = useState<string>('');
  const [formError, setFormError] = useState('');

  // Handle local file selection with FileReader preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFilePreview(reader.result);
        setNewImageUrl(reader.result);
        if (!newTitleHi) {
          setNewTitleHi(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Add slide submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalImage = filePreview || newImageUrl.trim();
    if (!finalImage) {
      setFormError(t('admin.carousel.errorFile'));
      return;
    }
    if (!newTitleHi.trim()) {
      setFormError(t('admin.carousel.errorTitle'));
      return;
    }

    addSlide({
      imageUrl: finalImage,
      titleHi: newTitleHi.trim(),
      titleEn: newTitleEn.trim() || newTitleHi.trim(),
      captionHi: newCaptionHi.trim(),
      captionEn: newCaptionEn.trim(),
    });

    // Reset form
    setNewTitleHi('');
    setNewTitleEn('');
    setNewCaptionHi('');
    setNewCaptionEn('');
    setNewImageUrl('');
    setFilePreview('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Image className="w-5 h-5 text-[#102F50]" />
            <h2 className="text-lg font-bold text-slate-900 font-serif">
              {t('admin.carousel.title')}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {t('admin.carousel.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? t('admin.carousel.hideFormBtn') : t('admin.carousel.addBtn')}</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm(t('admin.carousel.resetConfirm'))) {
                resetToDefault();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition cursor-pointer"
            title={t('admin.carousel.resetBtn')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('admin.carousel.resetBtn')}</span>
          </button>
        </div>
      </div>

      {/* Prototype Disclaimer Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t('admin.carousel.notice')}
        </p>
      </div>

      {/* Active Slides Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">{t('admin.carousel.statTotal')}</span>
          <div className="text-2xl font-bold text-[#102F50] mt-1">{slides.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">{t('admin.carousel.statActive')}</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeSlides.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">{t('admin.carousel.statInactive')}</span>
          <div className="text-2xl font-bold text-slate-400 mt-1">
            {slides.length - activeSlides.length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">{t('admin.carousel.statInterval')}</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">4.5s</div>
        </div>
      </div>

      {/* Add New Slide Form Modal/Card */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white rounded-xl p-6 border-2 border-emerald-500/40 shadow-md space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>{t('admin.carousel.formTitle')}</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {t('admin.carousel.formClose')}
            </button>
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* File Upload with preview */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                {t('admin.carousel.uploadFileLabel')}
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#102F50] bg-slate-50 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-600 font-medium">{t('admin.carousel.browseFile')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Direct Image URL */}
              <div className="mt-2.5">
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('admin.carousel.orUrlLabel')}
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => {
                      setNewImageUrl(e.target.value);
                      setFilePreview(e.target.value);
                    }}
                    placeholder={t('admin.carousel.urlPlaceholder')}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50]"
                  />
                </div>
              </div>

              {/* Preview Box */}
              {(filePreview || newImageUrl) && (
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    {t('admin.carousel.previewLabel')}
                  </span>
                  <div className="w-full aspect-16/9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={filePreview || newImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Title & Caption Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('admin.carousel.titleHiLabel')}
                </label>
                <input
                  type="text"
                  required
                  value={newTitleHi}
                  onChange={(e) => setNewTitleHi(e.target.value)}
                  placeholder={t('admin.carousel.titleHiPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('admin.carousel.titleEnLabel')}
                </label>
                <input
                  type="text"
                  value={newTitleEn}
                  onChange={(e) => setNewTitleEn(e.target.value)}
                  placeholder={t('admin.carousel.titleEnPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('admin.carousel.captionHiLabel')}
                </label>
                <textarea
                  rows={2}
                  value={newCaptionHi}
                  onChange={(e) => setNewCaptionHi(e.target.value)}
                  placeholder={t('admin.carousel.captionHiPlaceholder')}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {t('admin.carousel.captionEnLabel')}
                </label>
                <textarea
                  rows={2}
                  value={newCaptionEn}
                  onChange={(e) => setNewCaptionEn(e.target.value)}
                  placeholder={t('admin.carousel.captionEnPlaceholder')}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50]"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              {t('admin.carousel.cancelBtn')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white font-bold transition shadow-2xs cursor-pointer"
            >
              {t('admin.carousel.saveBtn')}
            </button>
          </div>
        </form>
      )}

      {/* Slide Management Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {t('admin.carousel.tableTitle')}
          </h3>
          <span className="text-[11px] text-slate-500">
            {t('admin.carousel.tableSubtitle')}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                slide.isActive ? 'hover:bg-slate-50/70' : 'bg-slate-50/50 opacity-60'
              }`}
            >
              {/* Left: Thumbnail & Details */}
              <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                {/* Order Badge */}
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {slide.order}
                </div>

                {/* Thumbnail */}
                <div className="w-20 sm:w-24 aspect-16/9 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={slide.imageUrl}
                    alt={slide.titleHi}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-serif">
                      {language === 'hi' ? slide.titleHi : (slide.titleEn || slide.titleHi)}
                    </h4>
                    {slide.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {t('admin.carousel.activeBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 shrink-0">
                        {t('admin.carousel.inactiveBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {(language === 'hi' ? slide.captionHi : (slide.captionEn || slide.captionHi)) || t('admin.carousel.noCaption')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {language === 'hi' ? slide.titleEn : slide.titleHi}
                  </p>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                {/* Move Up */}
                <button
                  disabled={index === 0}
                  onClick={() => moveSlide(index, 'up')}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                  title={t('admin.carousel.moveUp')}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                {/* Move Down */}
                <button
                  disabled={index === slides.length - 1}
                  onClick={() => moveSlide(index, 'down')}
                  className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                  title={t('admin.carousel.moveDown')}
                >
                  <ArrowDown className="w-4 h-4" />
                </button>

                {/* Preview */}
                <button
                  onClick={() => setPreviewSlide(slide)}
                  className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 cursor-pointer"
                  title={t('admin.carousel.previewBtn')}
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Toggle Active / Inactive */}
                <button
                  onClick={() => toggleSlideActive(slide.id)}
                  className={`p-1.5 rounded-md cursor-pointer ${
                    slide.isActive
                      ? 'hover:bg-amber-50 text-amber-600'
                      : 'hover:bg-emerald-50 text-emerald-600'
                  }`}
                  title={slide.isActive ? t('admin.carousel.toggleActive') : t('admin.carousel.toggleInactive')}
                >
                  {slide.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => {
                    if (window.confirm(t('admin.carousel.deleteConfirm'))) {
                      deleteSlide(slide.id);
                    }
                  }}
                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600 cursor-pointer"
                  title={t('admin.carousel.deleteBtn')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview Modal */}
      {previewSlide && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => setPreviewSlide(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-16/9 bg-black">
              <img
                src={previewSlide.imageUrl}
                alt={previewSlide.titleHi}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                <h4 className="text-base font-bold font-serif">
                  {language === 'hi' ? previewSlide.titleHi : (previewSlide.titleEn || previewSlide.titleHi)}
                </h4>
                <p className="text-xs text-slate-200 mt-1">
                  {language === 'hi' ? previewSlide.captionHi : (previewSlide.captionEn || previewSlide.captionHi)}
                </p>
              </div>
            </div>
            <div className="p-4 bg-white flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500">
                {t('admin.carousel.modalOrder')} {previewSlide.order} • {t('admin.carousel.modalStatus')} {previewSlide.isActive ? t('admin.carousel.activeBadge') : t('admin.carousel.inactiveBadge')}
              </span>
              <button
                onClick={() => setPreviewSlide(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
