import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, LogIn, Menu, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const { backendUser, isBackendAuthenticated, isAuthLoading, authRestoreBlocked } = useAuth();
  const isMember = isBackendAuthenticated && backendUser?.role === 'MEMBER';
  const isAdmin = isBackendAuthenticated && ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'].includes(backendUser?.role ?? '');

  const publicLinks = [
    { path: '/', label: t('nav.home', 'Home') },
    { path: '/about', label: t('nav.about', 'About Sangathan') },
    { path: '/leadership', label: t('nav.leadership', 'Leadership') },
    
  ];
  const memberLinks = [
    { path: '/member/dashboard', label: t('nav.dashboard', 'Member Dashboard') },
    { path: '/member/payments', label: t('nav.membershipPayments', 'Membership / Payment') },
    { path: '/member/profile', label: t('nav.profile', 'Profile') },
  ];
  const authenticatedLinks = isMember
    ? memberLinks
    : isAdmin
      ? [{ path: '/admin/dashboard', label: t('nav.adminDashboard', 'Admin Dashboard') }]
      : [];
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1720px] px-3 sm:px-4 md:px-6 lg:px-4 xl:px-8 2xl:px-10">
        <div className="flex items-center justify-between gap-2 py-2 sm:py-2.5">
          <Link to="/" className="group flex shrink-0 items-center gap-2 sm:gap-2.5 xl:gap-3">
            <img src="/logo.jpg" alt={t('org.name', 'Shasakiya Shikshak Sangathan Madhya Pradesh')} className="h-9 w-9 shrink-0 rounded-full object-contain ring-1 ring-amber-400/50 sm:h-10 sm:w-10 xl:h-12 xl:w-12" />
            <div className="flex flex-col justify-center whitespace-nowrap">
              <h1 className="font-serif text-[12px] font-bold leading-tight tracking-tight text-[#102F50] sm:text-sm xl:text-[14.5px] 2xl:text-[17px]">{t('org.name', 'Shasakiya Shikshak Sangathan Madhya Pradesh')}</h1>
              <span className="text-[8.5px] font-medium leading-tight text-slate-600 sm:text-[9.5px] xl:text-[10px]">{t('org.portalTitle', 'Digital Membership Registration & Management Portal')}</span>
              <span className="text-[8px] font-semibold leading-tight tracking-wider text-amber-700 sm:text-[9px]">{t('org.regNo', 'Reg. No.: 01/01/01/38865')}</span>
            </div>
          </Link>

          <nav className="hidden shrink-0 items-center gap-0.5 font-medium lg:flex xl:gap-1 2xl:gap-2">
            {publicLinks.map((link) => <Link key={link.path} to={link.path} className={`whitespace-nowrap rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors xl:px-2 xl:py-1.5 xl:text-[12.5px] 2xl:px-3 2xl:text-sm ${isActive(link.path) ? 'bg-slate-100 font-bold text-[#102F50]' : 'text-slate-700 hover:bg-slate-50 hover:text-[#102F50]'}`}>{link.label}</Link>)}
          </nav>

          <div className="hidden shrink-0 items-center gap-1.5 lg:flex xl:gap-2">
            {isAuthLoading ? <span aria-label={t('common.loading', 'Loading')} className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" /> : authRestoreBlocked ? null : isBackendAuthenticated ? authenticatedLinks.map((link) => <Link key={link.path} to={link.path} className="whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-[#102F50] hover:bg-slate-100 xl:px-3">{link.label}</Link>) : <>
              <Link to="/register" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#049B70] px-2 py-1.5 text-xs font-bold text-white transition hover:bg-[#037d5a] xl:px-3"><UserPlus className="h-3.5 w-3.5" />{t('nav.register', 'Membership Registration')}</Link>
              <Link to="/login" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-[#102F50] transition hover:bg-slate-200"><LogIn className="h-3.5 w-3.5" />{t('nav.login', 'Member Login')}</Link>
              <Link to="/admin/login" className="whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">{t('nav.adminLogin', 'Admin Login')}</Link>
            </>}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {!isAuthLoading && !authRestoreBlocked && !isBackendAuthenticated && <Link to="/register" className="flex items-center gap-1 rounded-md bg-[#049B70] px-2.5 py-1 text-xs font-semibold text-white sm:hidden">{t('nav.register', 'Register')}</Link>}
            {!isAuthLoading && isMember && <Link to="/member/payments" className="flex items-center gap-1 rounded-md bg-[#049B70] px-2.5 py-1 text-xs font-semibold text-white sm:hidden">{t('nav.membershipPayments', 'Payment')}</Link>}
            <button onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100 sm:p-2" aria-label={t('nav.toggle', 'Toggle navigation menu')} aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && <div className="border-t border-slate-200 bg-white shadow-xl lg:hidden">
        <div className="space-y-2 px-4 pb-6 pt-3">
          {(isAuthLoading ? publicLinks : [...publicLinks, ...authenticatedLinks]).map((link) => <Link key={link.path} to={link.path} onClick={closeMobileMenu} className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${isActive(link.path) ? 'bg-[#102F50] font-semibold text-white' : 'text-slate-700 hover:bg-slate-100'}`}><span>{link.label}</span><ChevronRight className="h-4 w-4 opacity-50" /></Link>)}
          {!isAuthLoading && !authRestoreBlocked && !isBackendAuthenticated && <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
            <Link to="/register" onClick={closeMobileMenu} className="flex items-center justify-center gap-1.5 rounded-lg bg-[#049B70] px-3 py-2.5 text-center text-sm font-semibold text-white"><UserPlus className="h-4 w-4" />{t('nav.register', 'Membership Registration')}</Link>
            <Link to="/login" onClick={closeMobileMenu} className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-center text-sm font-semibold text-[#102F50]"><LogIn className="h-4 w-4" />{t('nav.login', 'Member Login')}</Link>
            <Link to="/admin/login" onClick={closeMobileMenu} className="col-span-2 pt-2 text-center text-xs text-slate-500 underline">{t('nav.adminLogin', 'Admin Login')}</Link>
          </div>}
        </div>
      </div>}
    </header>
  );
};
