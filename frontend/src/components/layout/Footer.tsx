import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight, Heart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#102F50] text-slate-300 pt-12 pb-6 border-t-4 border-[#049B70]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Column 1: Organization Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt={t('org.name')}
                className="w-12 h-12 rounded-full bg-white p-0.5 shadow-md"
              />
              <div>
                <h3 className="font-bold text-white text-base leading-snug">
                  {t('org.name', 'शासकीय शिक्षक संगठन मध्यप्रदेश')}
                </h3>
                <p className="text-[10px] text-slate-400">{t('org.regNo', 'पंजी. क्रमांक: 01/01/01/38865')}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t('footer.aboutText')}
            </p>
            <div className="pt-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>{t('footer.certifiedTag', 'पंजीकृत एवं वैधानिक शिक्षक संगठन')}</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">
              {t('footer.quickLinks', 'त्वरित लिंक')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-amber-400 transition flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-[#049B70]" />
                  <span>{t('nav.home', 'मुख्य पृष्ठ')}</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-400 transition flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-[#049B70]" />
                  <span>{t('nav.about', 'संगठन परिचय एवं उद्देश्य')}</span>
                </Link>
              </li>
              <li>
                <Link to="/leadership" className="hover:text-amber-400 transition flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-[#049B70]" />
                  <span>{t('nav.leadership', 'संगठन नेतृत्व')}</span>
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-amber-400 transition flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-[#049B70]" />
                  <span className="font-semibold text-emerald-400">{t('nav.register', 'डिजिटल सदस्यता पंजीयन')}</span>
                </Link>
              </li>
            </ul>
          </div>


        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-700/80 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} {t('org.name')}. {t('footer.rights')}</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>{t('footer.disclaimer')}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              {t('footer.madeWithLove')} <Heart className="w-3 h-3 text-red-400 fill-red-400 inline" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
