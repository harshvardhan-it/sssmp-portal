import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserCheck, Lock, Globe, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

export const TopBar: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { currentMember, backendUser, isBackendAuthenticated, isAuthLoading, authRestoreBlocked, logoutMember } = useAuth();
  const isAdmin = isBackendAuthenticated && ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'].includes(backendUser?.role ?? '');

  return (
    <div className="bg-[#102F50] text-slate-100 text-xs py-1.5 border-b border-[#1c456f] w-full">
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-4 md:px-6 lg:px-4 xl:px-8 2xl:px-10 flex flex-row items-center justify-between gap-2">
        {/* Left side slogans */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 text-[11px] sm:text-xs tracking-wide text-slate-200 shrink-0">
          <span className="flex items-center gap-1 font-medium text-emerald-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="shrink-0">{t('org.state', 'मध्य प्रदेश')}</span>
          </span>
          <span className="text-slate-500 shrink-0">|</span>
          <span className="flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="shrink-0">{t('org.teacherHonor', 'शिक्षक सम्मान')}</span>
          </span>
          <span className="text-slate-500 hidden md:inline shrink-0">|</span>
          <span className="hidden md:inline shrink-0">
            {t('org.qualityEducation', 'बेहतर शिक्षा')}
          </span>
          <span className="text-slate-500 hidden xl:inline shrink-0">|</span>
          <span className="hidden xl:inline font-medium text-slate-300 shrink-0">
            {t('org.empoweredMP', 'सशक्त मध्य प्रदेश')}
          </span>
        </div>

        {/* Right side links */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs shrink-0">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#183d63] hover:bg-[#204e7c] text-amber-300 font-medium transition cursor-pointer border border-[#2b5887] shrink-0"
            title={t('common.changeLanguage')} aria-label={t('common.changeLanguage')}
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span>{language === 'hi' ? 'English' : 'हिंदी'}</span>
          </button>

          <span className="text-slate-500">|</span>

          {/* Member Login or Logged in status */}
          {isAuthLoading || authRestoreBlocked ? null : currentMember && isBackendAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-300 font-medium truncate max-w-[120px] sm:max-w-[160px]">
                {currentMember.fullName}
              </span>
              <Link to="/member/payments" className="text-emerald-200 hover:text-white underline">
                {t('payments.open', 'भुगतान')}
              </Link>
              <button
                onClick={logoutMember}
                className="text-slate-400 hover:text-white underline cursor-pointer text-[11px]"
              >
                {t('nav.logout', 'लॉगआउट')}
              </button>
            </div>
          ) : isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-300 font-medium">{backendUser?.email ?? backendUser?.mobile}</span>
              <Link to="/admin/dashboard" className="text-emerald-200 underline">{t('nav.adminDashboard', 'Admin Dashboard')}</Link>
              <button onClick={logoutMember} className="text-slate-300 underline">{t('nav.logout', 'Logout')}</button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 text-slate-200 hover:text-white transition hover:underline"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('nav.login', 'सदस्य लॉगिन / स्थिति')}</span>
            </Link>
          )}

          {!isAuthLoading && !authRestoreBlocked && !isBackendAuthenticated && <>
            <span className="text-slate-500">|</span>
            <Link to="/admin/login" className="flex items-center gap-1 text-slate-300 transition hover:text-amber-300">
              <Lock className="h-3 w-3 text-amber-400" /><span>{t('nav.adminLogin', 'Admin Login')}</span>
            </Link>
          </>}
        </div>
      </div>
    </div>
  );
};
