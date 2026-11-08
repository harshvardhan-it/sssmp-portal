import React from 'react';
import { Navigate, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

// Pages
import { HomePage } from '../pages/Home/HomePage';
import { AboutPage } from '../pages/About/AboutPage';
import { LeadershipPage } from '../pages/Leadership/LeadershipPage';
import { NoticesPage } from '../pages/Notices/NoticesPage';
import { GalleryPage } from '../pages/Gallery/GalleryPage';
import { ContactPage } from '../pages/Contact/ContactPage';
import { RegisterPage } from '../pages/Register/RegisterPage';
import { LoginPage } from '../pages/Login/LoginPage';
import { AdminLoginPage } from '../pages/Admin/AdminLoginPage';
import { AdminDashboardPage } from '../pages/Admin/AdminDashboardPage';
import { MemberPaymentsPage } from '../pages/Payments/MemberPaymentsPage';
import { MemberDashboardPage, MemberProfilePage, MemberCardPage, MemberSettingsPage } from '../pages/Member/MemberPortalPage';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SessionLoading: React.FC = () => <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-[#102F50">Loading…</div>;

const SessionUnavailable: React.FC = () => {
  const { t } = useLanguage();
  return <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center gap-4 px-6 text-center text-[#102F50]" role="alert"><p>{t('auth.sessionRestoreError', 'Your session could not be verified because the service is temporarily unavailable. Retry when the service is available.')}</p><button onClick={() => window.location.reload()} className="rounded-lg bg-[#102F50] px-5 py-2.5 text-sm font-bold text-white">{t('payments.refresh', 'Retry')}</button></div>;
};

const MemberRouteGuard: React.FC = () => {
  const { backendUser, isBackendAuthenticated, isAuthLoading, authRestoreBlocked } = useAuth();
  const location = useLocation();
  if (isAuthLoading) return <SessionLoading />;
  if (authRestoreBlocked) return <SessionUnavailable />;
  if (isBackendAuthenticated && backendUser?.role === 'MEMBER') return <Outlet />;
  return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
};

const AdminRouteGuard: React.FC = () => {
  const { backendUser, isBackendAuthenticated, isAuthLoading, authRestoreBlocked } = useAuth();
  if (isAuthLoading) return <SessionLoading />;
  if (authRestoreBlocked) return <SessionUnavailable />;
  if (isBackendAuthenticated && ['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'].includes(backendUser?.role ?? '')) return <Outlet />;
  return <Navigate to="/admin/login" replace />;
};

// Main Public Layout
const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <TopBar />
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages with TopBar, Navbar, Footer */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/leadership" element={<LeadershipPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<MemberRouteGuard />}>
          <Route path="/member/payments" element={<MemberPaymentsPage />} />
          <Route path="/member/dashboard" element={<MemberDashboardPage />} />
          <Route path="/member/profile" element={<MemberProfilePage />} />
          <Route path="/member/card" element={<MemberCardPage />} />
          <Route path="/member/settings" element={<MemberSettingsPage />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminRouteGuard />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Route>

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
};
