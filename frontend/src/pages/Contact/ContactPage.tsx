import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const ContactPage: React.FC = () => {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    district: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-[#FAF9F5] min-h-screen py-10 sm:py-14 pattern-dots">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#102F50] text-xs font-bold mb-3">
            <Mail className="w-4 h-4 text-[#049B70]" />
            <span>{t('contactPage.badge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#102F50] font-serif mb-3">
            {t('contactPage.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {t('contactPage.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Details Card */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[#102F50] font-serif border-b border-slate-100 pb-3">
                {t('contactPage.hqCardTitle')}
              </h3>

              <div className="flex items-start gap-3 text-xs text-slate-600">
                <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 mb-0.5">{t('contactPage.hqLabel')}</div>
                  <p className="leading-relaxed">
                    {t('contactPage.hqAddress')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-600">
                <Mail className="w-5 h-5 text-[#049B70] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 mb-0.5">{t('contactPage.emailLabel')}</div>
                  <p>contact@sssmp.org</p>
                  <p>helpdesk.sssmp@gmail.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-600">
                <Phone className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 mb-0.5">{t('contactPage.phoneLabel')}</div>
                  <p>0755-240XXXX</p>
                  <p className="text-[11px] text-slate-500">{t('contactPage.phoneHours')}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#102F50] text-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-amber-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>{t('contactPage.helpNoticeTitle')}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {t('contactPage.helpNoticeDesc')}
              </p>
            </div>
          </div>

          {/* Grievance / Inquiry Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            <h3 className="text-lg font-bold text-[#102F50] font-serif mb-2">
              {t('contactPage.formTitle')}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              {t('contactPage.formSubtitle')}
            </p>

            {submitted ? (
              <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle className="w-12 h-12 text-[#049B70] mx-auto mb-3" />
                <h4 className="text-base font-bold text-[#102F50] mb-1">
                  {t('contactPage.successTitle')}
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  {t('contactPage.successDesc')}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-lg bg-[#102F50] text-white text-xs font-semibold cursor-pointer"
                >
                  {t('contactPage.sendAnotherBtn')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t('contactPage.nameLabel')}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('contactPage.namePlaceholder')}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t('contactPage.mobileLabel')}</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder={t('contactPage.mobilePlaceholder')}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t('contactPage.districtLabel')}</label>
                    <input
                      type="text"
                      required
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder={t('contactPage.districtPlaceholder')}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">{t('contactPage.subjectLabel')}</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder={t('contactPage.subjectPlaceholder')}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">{t('contactPage.messageLabel')}</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t('contactPage.messagePlaceholder')}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('contactPage.submitBtn')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
