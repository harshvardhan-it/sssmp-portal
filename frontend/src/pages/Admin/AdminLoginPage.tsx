import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { ApiRequestError } from '../../lib/api';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { loginAdmin, authRestoreError, authRestoreBlocked } = useAuth();

  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STATE' | 'DISTRICT' | 'BLOCK'>('STATE');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (await loginAdmin(adminId, password, role)) navigate('/admin/dashboard', { replace: true });
      else setError(t('admin.roleMismatch', 'These credentials are not authorized for the selected administrative scope.'));
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : t('login.errorNotFound', 'Unable to sign in. Check your credentials and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-12 px-4 sm:px-6 lg:px-8 pattern-dots flex flex-col justify-center">
      <div className="max-w-md w-full mx-auto">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#102F50] hover:text-[#049B70] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('login.backHome', 'मुख्य पृष्ठ पर वापस जाएँ')}</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-[#102F50] text-amber-300 flex items-center justify-center mx-auto mb-4 shadow-md">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-center text-[#102F50] font-serif mb-1">
            {t('admin.loginTitle', 'प्रशासक लॉगिन')}
          </h2>
          <p className="text-xs text-center text-slate-500 mb-6">
            {t('admin.loginSubtitle', 'राज्य, ज़िला एवं ब्लॉक स्तरीय प्रबंधन हेतु अधिकृत प्रवेश')}
          </p>

          {authRestoreBlocked && authRestoreError && <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="status">{t('auth.sessionRestoreError', 'Your session could not be verified because the service is temporarily unavailable. Retry sign-in or reload when the service is available.')}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Administrative Level Selection matching Section 9 hierarchy */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                {t('admin.adminRole', 'प्रशासनिक स्तर (Hierarchy Scope)')}
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRole('STATE')}
                  className={`py-2 px-2 rounded-lg font-bold border transition text-center cursor-pointer ${
                    role === 'STATE'
                      ? 'bg-[#102F50] text-white border-[#102F50]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t('admin.stateAdmin', 'राज्य (State)')}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('DISTRICT')}
                  className={`py-2 px-2 rounded-lg font-bold border transition text-center cursor-pointer ${
                    role === 'DISTRICT'
                      ? 'bg-[#102F50] text-white border-[#102F50]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t('admin.districtAdmin', 'ज़िला (District)')}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('BLOCK')}
                  className={`py-2 px-2 rounded-lg font-bold border transition text-center cursor-pointer ${
                    role === 'BLOCK'
                      ? 'bg-[#102F50] text-white border-[#102F50]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t('admin.blockAdmin', 'ब्लॉक (Block)')}
                </button>
              </div>
            </div>

            {/* Admin ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('admin.identifier', 'Administrator email or mobile')}
              </label>
              <input
                type="text"
                autoComplete="username"
                placeholder={t('admin.identifierPlaceholder', 'Email address or registered mobile number')}
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('admin.adminPassword', 'पासवर्ड')}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
              />
            </div>

            {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-lg bg-[#102F50] hover:bg-[#0c233c] text-white font-bold text-sm shadow transition cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? t('login.loggingIn', 'Signing in…') : t('admin.btnAdminLogin', 'Sign in →')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
