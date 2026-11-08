import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, UserPlus, LogIn, Bell, ShieldCheck, Award, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1600&auto=format&fit=crop&q=80',
    titleHi: 'मध्य प्रदेश के शासकीय शिक्षकों का गौरवशाली संगठन',
    titleEn: 'The Prestigious Body of MP Government Teachers',
    captionHi: 'अधिकार, स्वाभिमान और सेवा संवर्ग की सुरक्षा के लिए समर्पित राज्यव्यापी मंच',
    captionEn: 'Dedicated to teachers dignity, service security, and professional solidarity',
  },
  {
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&auto=format&fit=crop&q=80',
    titleHi: 'डिजिटल सदस्यता अभियान 2025',
    titleEn: 'Digital Membership Drive 2025',
    captionHi: 'पारदर्शी एवं आधुनिक प्रणाली से जुड़ें, अपना डिजिटल पहचान पत्र प्राप्त करें',
    captionEn: 'Join transparently and receive your verified official digital membership ID card',
  },
  {
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80',
    titleHi: 'गुणवत्तापूर्ण शिक्षा एवं शिक्षक कल्याण',
    titleEn: 'Quality Education & Teacher Welfare',
    captionHi: 'मध्य प्रदेश के विकासखंड से लेकर राज्य स्तर तक प्रत्येक शिक्षक की सुदृढ़ आवाज',
    captionEn: 'Amplifying every teacher voice from grassroots blocks to state government corridors',
  },
];

export const HeroCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { language, t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  return (
    <section className="relative overflow-hidden bg-slate-900 text-white">
      {/* Latest Notice Ticker */}
      <div className="bg-[#183d63] border-b border-[#2b5887] py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[11px] animate-pulse">
            <Bell className="w-3 h-3" />
            {t('home.heroNoticeBanner', 'नवीन सूचना:')}
          </span>
          <p className="truncate text-slate-200 text-xs sm:text-sm">
            {language === 'hi'
              ? 'आधिकारिक डिजिटल सदस्यता पंजीयन पोर्टल 2025 सक्रिय। सभी शासकीय शिक्षक साथी ऑनलाइन पंजीयन कर डिजिटल कार्ड प्राप्त करें।'
              : 'Official Digital Membership Portal 2025 is live. All government teachers can register and obtain digital ID cards.'}
          </p>
          <Link
            to="/notices"
            className="shrink-0 text-amber-300 hover:text-white underline text-xs hidden sm:inline"
          >
            {language === 'hi' ? 'परिपत्र देखें' : 'View Circular'}
          </Link>
        </div>
      </div>

      {/* Hero Carousel Area */}
      <div className="relative min-h-[440px] sm:min-h-[500px] lg:min-h-[540px] flex items-center">
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background image with dual overlay */}
            <img
              src={slide.image}
              alt={slide.titleHi}
              className="w-full h-full object-cover brightness-[0.38] scale-105 transition-transform duration-10000"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#102F50]/95 via-[#102F50]/80 to-transparent" />
          </div>
        ))}

        {/* Content Overlay */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-300 text-xs sm:text-sm font-semibold mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t('home.welcomeBadge', 'आधिकारिक संगठन पोर्टल')} • पंजी. क्र. 01/01/01/38865</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight sm:leading-snug mb-4 text-white drop-shadow-sm font-serif">
              {HERO_SLIDES[currentSlide].titleHi}
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-slate-200 font-light mb-6 leading-relaxed max-w-2xl drop-shadow">
              {HERO_SLIDES[currentSlide].captionHi}
            </p>

            <p className="text-xs sm:text-sm text-amber-200/90 font-medium mb-8 bg-black/30 backdrop-blur-sm p-3 rounded-lg border-l-4 border-amber-400 max-w-2xl">
              {t('org.motto')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                to="/register"
                className="flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-emerald-900/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
                <span>{t('home.heroCtaRegister', 'ऑनलाइन सदस्यता लें')}</span>
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-white/30 transition-all cursor-pointer"
              >
                <LogIn className="w-5 h-5 text-amber-300" />
                <span>{t('home.heroCtaLogin', 'सदस्य लॉगिन')}</span>
              </Link>
            </div>

            {/* Quick Stat Highlights */}
            <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-3 gap-4 max-w-lg">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">55 ज़िले</div>
                  <div className="text-[11px] text-slate-300">संपूर्ण म.प्र.</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">313 ब्लॉक</div>
                  <div className="text-[11px] text-slate-300">सक्रिय समन्वय</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <div className="text-base sm:text-lg font-bold text-white">100%</div>
                  <div className="text-[11px] text-slate-300">डिजिटल व पारदर्शी</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Prev/Next Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/65 text-white transition backdrop-blur-xs cursor-pointer border border-white/10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/65 text-white transition backdrop-blur-xs cursor-pointer border border-white/10"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Slide Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentSlide ? 'w-8 bg-[#049B70]' : 'w-2.5 bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
