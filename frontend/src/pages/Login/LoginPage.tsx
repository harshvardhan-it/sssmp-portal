import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LogIn,
  FileText,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  UserCheck,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { DigitalCard } from '../../components/registration/DigitalCard';
import { ApiRequestError } from '../../lib/api';

export const LoginPage: React.FC = () => {
  const { t } = useLanguage();
  const { currentMember, backendUser, isBackendAuthenticated, isAuthLoading, authRestoreError, authRestoreBlocked, loginMember, logoutMember } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { returnTo?: unknown; identifier?: unknown } | null;
  const requestedReturn = typeof routeState?.returnTo === 'string' && routeState.returnTo.startsWith('/member/')
    ? routeState.returnTo
    : '/member/payments';

  const [regId, setRegId] = useState(typeof routeState?.identifier === 'string' ? routeState.identifier : '');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regId.trim() && !mobile.trim()) {
      setErrorMsg(t('login.errorMissing', 'कृपया ईमेल अथवा 10-अंकीय मोबाइल नंबर दर्ज करें।'));
      return;
    }

    setIsLoading(true);
    try {
      const ok = await loginMember(regId.trim() || mobile.trim(), mobile, password);
      if (!ok) {
        setErrorMsg(t('login.errorNotFound', 'सिर्फ वास्तविक सदस्य खाते से लॉगिन करें।'));
      } else {
        navigate(requestedReturn, { replace: true });
      }
    } catch (error) {
      setErrorMsg(error instanceof ApiRequestError
        ? error.message
        : t('login.errorNotFound', 'लॉगिन नहीं हो सका। कृपया विवरण जाँचें।'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-[#102F50]">{t('common.loading', 'Loading…')}</div>;
  if (isBackendAuthenticated && backendUser?.role === 'MEMBER') return <Navigate to={requestedReturn} replace />;
  if (isBackendAuthenticated && backendUser?.role !== 'MEMBER') return <Navigate to="/admin/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 pattern-dots watermark-book flex flex-col justify-center relative">
      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Back to Home Link */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#102F50] hover:text-[#049B70] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('login.backHome', 'Back to Home')}</span>
          </Link>
        </div>

        {/* If already logged in, show Member Portal view with Digital Card */}
        {currentMember && isBackendAuthenticated ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#049B70] flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#102F50]">{currentMember.fullName}</h2>
                  <p className="text-xs text-slate-500 font-mono">{currentMember.registrationNumber}</p>
                </div>
              </div>
              <button
                onClick={logoutMember}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-xs text-slate-600 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('nav.logout', 'लॉगआउट')}</span>
              </button>
            </div>

            <div className="mb-6">
              <div className="text-center mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {t('login.yourCardTitle', 'आपका आधिकारिक डिजिटल सदस्यता कार्ड')}
                </span>
              </div>
              <DigitalCard member={currentMember} />
            </div>

            <div className="pt-4 border-t border-slate-200 text-center">
              <Link
                to="/"
                className="text-xs font-semibold text-[#102F50] hover:underline"
              >
                ← {t('login.backHome', 'मुख्य पृष्ठ पर वापस जाएँ')}
              </Link>
              <Link
                to="/member/payments"
                className="mt-3 block text-xs font-semibold text-[#049B70] hover:underline"
              >
                {t('payments.open', 'सदस्यता भुगतान खोलें')} →
              </Link>
            </div>
          </div>
        ) : (
          /* Faithful recreation of Member Login Screenshot 1 */
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
            {/* Top Icon Badge matching screenshot 1 */}
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#102F50] flex items-center justify-center mx-auto mb-3 shadow-xs border border-blue-100">
              <LogIn className="w-6 h-6" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-center text-[#102F50] font-serif mb-1">
              {t('login.title', 'Member Login')}
            </h2>
            <p className="text-xs text-center text-slate-500 mb-6 leading-relaxed">
              {t('login.subtitle', 'Log in to view your membership status and digital membership card.')}
            </p>

            {authRestoreBlocked && authRestoreError && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="status">{t('auth.sessionRestoreError', 'Your session could not be verified because the service is temporarily unavailable. Retry sign-in or reload when the service is available.')}</div>}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Registration ID Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('login.regId', 'ईमेल या मोबाइल नंबर')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    placeholder={t('login.regIdPlaceholder', 'ईमेल या 10-अंकीय मोबाइल नंबर')}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Registered Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('login.mobile', 'Registered Mobile Number')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder={t('login.mobilePlaceholder', 'वैकल्पिक, यदि ऊपर ईमेल भरा है')}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t('login.password', 'Password')} <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert(t('login.forgotPasswordAlert', 'डेमो पासवर्ड रीसेट: अपने पंजीकृत मोबाइल नंबर पर ओटीपी प्राप्त करें।'))}
                    className="text-[11px] text-[#102F50] hover:underline font-medium"
                  >
                    {t('login.forgotPassword', 'Forgot Password?')}
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder', 'Enter your password')}
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#102F50] focus:ring-[#102F50] border-slate-300"
                />
                <label htmlFor="rememberMe" className="ml-2 text-xs text-slate-600 cursor-pointer">
                  {t('login.rememberMe', 'Remember me')}
                </label>
              </div>

              {/* Login Button matching screenshot 1: → Login */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#102F50] hover:bg-[#0c233c] text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <span>→</span>
                <span>{isLoading ? t('login.loggingIn', 'सत्यापन हो रहा है...') : t('login.btnLogin', 'Login')}</span>
              </button>

              {/* Session Security Warning Box matching screenshot 1 */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong className="text-slate-800">{t('login.securityNoticeTitle', 'Session Security (10 Minutes):')}</strong>{' '}
                  {t(
                    'login.securityNoticeDesc',
                    'For your security, your session will automatically expire after 10 minutes of inactivity, or as configured by the existing session policy.'
                  )}
                </p>
              </div>

              {/* Not Registered Link */}
              <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-600">
                <span>{t('login.notRegistered', 'Not registered yet?')} </span>
                <Link to="/register" className="font-bold text-[#102F50] hover:underline">
                  {t('login.registerNow', 'Register Now')}
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
