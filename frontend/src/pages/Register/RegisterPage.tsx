import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Building,
  CreditCard,
  CheckCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { DESIGNATIONS } from '../../data/districtsAndBlocks';
import type { RegistrationFormData, MemberRecord, PlanType } from '../../types';
import { ApiRequestError, fetchDistrictBlocks, fetchDistricts, submitRegistration } from '../../lib/api';
import type { LocationDistrict } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

function MembershipPlanOptions({
  selectedPlan,
  onChange,
}: {
  selectedPlan: PlanType;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { t } = useLanguage();
  const options: Array<{ value: PlanType; title: string; description: string; amount: string; active: string; titleColor: string }> = [
    { value: 'office_bearer', title: t('plans.officeBearerTitle', 'Office Bearer Membership'), description: t('register.planOfficeBearerSub', 'Office Bearer cadre'), amount: '₹1,000', active: 'border-[#E52528] bg-red-50/40 ring-[#E52528]', titleColor: 'text-[#E52528]' },
    { value: 'yearly', title: t('plans.yearlyTitle', 'Yearly Subscription'), description: t('register.planYearlySub', '12 months (365 days)'), amount: '₹120', active: 'border-[#049B70] bg-emerald-50/40 ring-[#049B70]', titleColor: 'text-[#049B70]' },
  ];
  return <fieldset>
    <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">{t('register.selectedPlan')} <span className="text-red-500">*</span></legend>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {options.map((option) => <label key={option.value} className={`relative flex cursor-pointer flex-col justify-between rounded-xl border-2 p-4 transition ${selectedPlan === option.value ? `${option.active} shadow-xs ring-1` : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <input type="radio" name="selectedPlan" value={option.value} checked={selectedPlan === option.value} onChange={onChange} className="mt-0.5 h-4 w-4" />
            <span><span className={`block text-sm font-bold ${option.titleColor}`}>{option.title}</span><span className="text-[11px] text-slate-500">{option.description}</span></span>
          </div>
          <span className="text-lg font-extrabold text-[#102F50]">{option.amount}</span>
        </div>
      </label>)}
    </div>
  </fieldset>;
}

function AccountPasswordFields({
  password,
  confirmPassword,
  showPassword,
  errors,
  onChange,
  onToggle,
}: {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  errors: Record<string, string>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  return <section className="space-y-3 border-t border-slate-100 pt-4">
    <h4 className="text-xs font-bold uppercase tracking-wide text-[#102F50]">{t('register.accountPasswordTitle', 'Account Password')}</h4>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="block text-xs font-semibold text-slate-700">{t('register.password')} <span className="text-red-500">*</span>
        <span className="relative mt-1.5 block">
          <input type={showPassword ? 'text' : 'password'} name="password" value={password} onChange={onChange} autoComplete="new-password" placeholder={t('register.passwordPlaceholder', 'Minimum 6 characters')} className={`w-full rounded-lg border px-3.5 py-2.5 text-sm ${errors.password ? 'border-red-500 bg-red-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-[#102F50]`} />
          <button type="button" onClick={onToggle} aria-label={showPassword ? t('register.hidePassword', 'Hide password') : t('register.showPassword', 'Show password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </span>
        {errors.password && <span className="mt-1 block text-xs text-red-600">{errors.password}</span>}
      </label>
      <label className="block text-xs font-semibold text-slate-700">{t('register.confirmPassword')} <span className="text-red-500">*</span>
        <input type={showPassword ? 'text' : 'password'} name="confirmPassword" value={confirmPassword} onChange={onChange} autoComplete="new-password" placeholder={t('register.confirmPasswordPlaceholder', 'Re-enter password')} className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm ${errors.confirmPassword ? 'border-red-500 bg-red-50/30' : 'border-slate-300'} focus:outline-none focus:ring-2 focus:ring-[#102F50]`} />
        {errors.confirmPassword && <span className="mt-1 block text-xs text-red-600">{errors.confirmPassword}</span>}
      </label>
    </div>
  </section>;
}

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { language, t } = useLanguage();
  const { backendUser, isBackendAuthenticated, isAuthLoading, authRestoreBlocked, establishMemberSession } = useAuth();
  const navigate = useNavigate();
  const initialPlanParam: PlanType = searchParams.get('plan') === 'office_bearer' ? 'office_bearer' : 'yearly';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdMember, setCreatedMember] = useState<MemberRecord | null>(null);
  const [authRecoveryRequired, setAuthRecoveryRequired] = useState(false);
  const [registrationOutcomeUnknown, setRegistrationOutcomeUnknown] = useState(false);
  const [loginRecoveryAvailable, setLoginRecoveryAvailable] = useState(false);
  const submittingRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [districtOptions, setDistrictOptions] = useState<LocationDistrict[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState('');
  const [blocksRetryNonce, setBlocksRetryNonce] = useState(0);
  const [districtsError, setDistrictsError] = useState(false);

  const loadDistricts = () => {
    setDistrictsLoading(true);
    setDistrictsError(false);
    fetchDistricts()
      .then((districts) => {
        setDistrictOptions(districts);
        setDistrictsLoading(false);
        if (districts.length === 0) setDistrictsError(true);
      })
      .catch(() => {
        setDistrictsLoading(false);
        setDistrictsError(true);
        setErrors((prev) => ({ ...prev, locations: 'जिला एवं ब्लॉक सूची लोड नहीं हो सकी। कृपया पुनः प्रयास करें। / Location data could not be loaded. Please try again.' }));
      });
  };

  useEffect(() => {
    if (!isBackendAuthenticated) return;
    if (backendUser?.role === 'MEMBER') navigate('/member/payments', { replace: true });
    else if (backendUser && backendUser.role !== 'MEMBER') navigate('/admin/dashboard', { replace: true });
  }, [backendUser, isBackendAuthenticated, navigate]);

  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    fatherHusbandName: '',
    dob: '',
    gender: 'Male',
    mobile: '',
    email: '',
    address: '',
    district: '',
    block: '',
    schoolName: '',
    designation: 'प्राथमिक शिक्षक',
    employeeId: '',
    selectedPlan: initialPlanParam as PlanType,
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  useEffect(() => {
    loadDistricts();
    return () => {
      // The request helper owns its timeout; the component remains safe on remount.
    };
  }, []);

  const availableDistricts = useMemo(() => districtOptions, [districtOptions]);

  // District selection owns the dependent block list and always clears stale block state.
  useEffect(() => {
    if (!formData.district) return;
    let active = true;
    setBlocksLoading(true);
    setBlocksError('');
    setErrors((prev) => ({ ...prev, locations: '' }));
    setFormData((prev) => ({ ...prev, block: '' }));
    fetchDistrictBlocks(formData.district)
      .then(({ blocks }) => {
        if (!active) return;
        setDistrictOptions((previous) => previous.map((district) => (
          district.id === formData.district ? { ...district, blocks } : district
        )));
        setBlocksLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setBlocksLoading(false);
        setBlocksError(
          'चयनित जिले के शिक्षा विकासखंड लोड नहीं हो सके। कृपया पुनः प्रयास करें। '
          + '/ Education Blocks for the selected district could not be loaded. Please try again.',
        );
      });
    return () => {
      active = false;
    };
  }, [formData.district, blocksRetryNonce]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === 'district') {
      setFormData((prev) => ({ ...prev, district: value, block: '' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = t('register.validation.fullNameReq');
    if (!formData.fatherHusbandName.trim()) newErrors.fatherHusbandName = t('register.validation.fatherReq');
    if (!formData.dob) newErrors.dob = t('register.validation.dobReq');
    if (!formData.mobile.trim() || formData.mobile.trim().length !== 10) {
      newErrors.mobile = t('register.validation.mobileReq');
    }
    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = t('register.validation.emailInvalid');
    }
    if (!formData.password || formData.password.length < 6) newErrors.password = t('register.validation.passwordMin');
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = t('register.validation.passwordMismatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.district) newErrors.district = t('register.validation.districtReq');
    const employeeId = formData.employeeId.trim();
    if (!employeeId) newErrors.employeeId = t('register.validation.employeeIdReq');
    if (employeeId !== formData.employeeId) {
      setFormData((prev) => ({ ...prev, employeeId }));
    }
    if (!formData.schoolName.trim()) newErrors.schoolName = t('register.validation.schoolReq');
    if (!formData.designation) newErrors.designation = t('register.validation.designationReq');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = t('register.validation.termsReq');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBackendAuthenticated) {
      navigate(backendUser?.role === 'MEMBER' ? '/member/payments' : '/admin/dashboard', { replace: true });
      return;
    }
    if (submittingRef.current || createdMember || registrationOutcomeUnknown) return;
    if (!validateStep3()) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: '' }));
    let registrationCompleted = false;
    try {
      const normalizedFormData = { ...formData, employeeId: formData.employeeId.trim() };
      setFormData(normalizedFormData);
      const res = await submitRegistration(normalizedFormData);
      registrationCompleted = true;
      setCreatedMember(res.member);
      if (!res.auth) {
        setAuthRecoveryRequired(true);
        setErrors((prev) => ({
          ...prev,
          submit: t('register.authRecovery', 'Your account was created, but automatic sign-in failed. Sign in to continue to payment.'),
        }));
        return;
      }
      const authenticated = await establishMemberSession(res.auth.token, res.auth.user);
      if (!authenticated) {
        setAuthRecoveryRequired(true);
        setErrors((prev) => ({ ...prev, submit: t('register.authRecovery', 'Your account was created, but automatic sign-in failed. Sign in to continue to payment.') }));
        return;
      }
      navigate('/member/payments', { replace: true });
    } catch (error) {
      if (registrationCompleted) {
        setAuthRecoveryRequired(true);
        setErrors((prev) => ({
          ...prev,
          submit: t('register.authRecovery', 'Your account was created, but automatic sign-in failed. Sign in to continue to payment.'),
        }));
        return;
      }
      if (error instanceof ApiRequestError) {
        const fieldErrors = Object.fromEntries(
          Object.entries(error.fieldErrors ?? {}).map(([field, messages]) => [field, messages[0]]),
        );
        const duplicate = error.code === 'DUPLICATE_REGISTRATION' || error.code === 'DUPLICATE';
        const uncertain = ['REQUEST_TIMEOUT', 'NETWORK_ERROR', 'INVALID_RESPONSE'].includes(error.code ?? '') || (error.status !== undefined && error.status >= 500);
        if (duplicate || uncertain) setLoginRecoveryAvailable(true);
        if (uncertain) setRegistrationOutcomeUnknown(true);
        setErrors((prev) => ({
          ...prev,
          ...fieldErrors,
          submit: duplicate
            ? error.message
            : uncertain
              ? t('register.uncertainRecovery', 'We could not confirm whether registration completed. Sign in first to check before submitting again.')
                : error.code === 'VALIDATION_ERROR'
                  ? t('register.serverValidationError', 'Some registration details are invalid. Review the highlighted fields.')
                  : error.code === 'BLOCK_DISTRICT_MISMATCH'
                    ? t('register.locationMismatch', 'The selected Education Block does not belong to the selected District.')
                    : error.message,
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          submit: t('register.submitError', 'Registration could not be completed. Please check your details and try again.'),
        }));
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const selectedDistrictData = availableDistricts.find((d) => d.id === formData.district);

  if (isAuthLoading) return <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-[#102F50]">{t('common.loading', 'Loading…')}</div>;
  if (authRestoreBlocked) return <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center gap-4 px-6 text-center text-[#102F50]" role="alert"><p>{t('auth.sessionRestoreError', 'Your session could not be verified because the service is temporarily unavailable. Retry when the service is available.')}</p><button onClick={() => window.location.reload()} className="rounded-lg bg-[#102F50] px-5 py-2.5 text-sm font-bold text-white">{t('payments.refresh', 'Retry')}</button></div>;

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 pattern-dots">
      <div className="max-w-3xl mx-auto">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#102F50] hover:text-[#049B70] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('login.backHome', 'मुख्य पृष्ठ पर वापस जाएँ')}</span>
          </Link>
        </div>

        {/* Header Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102F50] font-serif">
            {t('register.title', 'सदस्यता पंजीयन')}
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            {t('register.subtitle', 'शासकीय शिक्षक संगठन मध्यप्रदेश की सदस्यता हेतु ऑनलाइन आवेदन')}
          </p>
        </div>

        {/* If registration is completed, show the pending application confirmation. */}
        {createdMember || registrationOutcomeUnknown ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10 border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#049B70] flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#102F50] font-serif">
                {t('register.successTitle', 'पंजीयन सफलतापूर्वक संपन्न हुआ!')}
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm mt-1">
                {registrationOutcomeUnknown
                  ? t('register.uncertainRecovery', 'We could not confirm whether registration completed. Sign in first to check before submitting again.')
                  : language === 'hi'
                    ? 'आपका खाता सफलतापूर्वक बन गया है। सदस्यता सक्रिय करने के लिए अपना भुगतान पूरा करें।'
                    : 'Your account has been created successfully. Complete your membership payment to activate your membership.'}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <span>{t('register.applicationNumber', 'Application number: ')}</span>
                {createdMember && <span className="font-mono font-bold text-slate-900">{createdMember.registrationNumber}</span>}
              </div>
            </div>

            <div className="my-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              {errors.submit || (language === 'hi' ? 'सदस्यता सक्रिय करने के लिए अपना भुगतान पूरा करें। सदस्यता केवल backend भुगतान सत्यापन के बाद सक्रिय होगी।' : 'Complete your membership payment. Membership activates only after backend payment verification.')}
            </div>

            {/* Next Action Links */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                state={{ returnTo: '/member/payments', identifier: formData.email.trim() || formData.mobile.trim() }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#102F50] text-white text-xs sm:text-sm font-bold hover:bg-[#0c233c] transition shadow"
              >
                <LogIn className="w-4 h-4" />
                <span>{authRecoveryRequired || registrationOutcomeUnknown ? t('register.continueLogin', 'Continue to Member Login') : t('register.btnGoLogin', 'लॉगिन पृष्ठ पर जाएँ')}</span>
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-200 border border-slate-300 transition"
              >
                <span>{t('login.backHome', 'मुख्य पृष्ठ पर वापस जाएँ')}</span>
              </Link>
            </div>
          </div>
        ) : (
          /* 3-Step Registration Form Card */
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Stepper Progress Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-8 py-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 pb-2 border-b-2 font-semibold ${
                    step === 1 ? 'border-[#102F50] text-[#102F50]' : 'border-transparent text-slate-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 1 ? 'bg-[#102F50] text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    1
                  </span>
                  <span>{t('register.step1', 'व्यक्तिगत विवरण')}</span>
                </div>

                <div
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 pb-2 border-b-2 font-semibold ${
                    step === 2 ? 'border-[#102F50] text-[#102F50]' : 'border-transparent text-slate-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 2 ? 'bg-[#102F50] text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    2
                  </span>
                  <span>{t('register.step2', 'पदस्थापना विवरण')}</span>
                </div>

                <div
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 pb-2 border-b-2 font-semibold ${
                    step === 3 ? 'border-[#102F50] text-[#102F50]' : 'border-transparent text-slate-400'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step === 3 ? 'bg-[#102F50] text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    3
                  </span>
                  <span>{t('register.step3', 'सदस्यता व खाता')}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              {/* STEP 1: Personal Information */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 text-[#102F50]">
                    <User className="w-5 h-5" />
                    <h3 className="text-base font-bold font-serif">{t('register.step1Title')}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.fullName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder={t('register.fullNamePlaceholder', 'उदा. राजेश कुमार शर्मा')}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.fullName ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                    </div>

                    {/* Father's / Husband's Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.fatherHusbandName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fatherHusbandName"
                        value={formData.fatherHusbandName}
                        onChange={handleChange}
                        placeholder={t('register.fatherHusbandPlaceholder', 'उदा. श्री रामेश्वर शर्मा')}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.fatherHusbandName ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.fatherHusbandName && (
                        <p className="text-xs text-red-500 mt-1">{errors.fatherHusbandName}</p>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.dob')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.dob ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.dob && <p className="text-xs text-red-500 mt-1">{errors.dob}</p>}
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.gender')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50] bg-white"
                      >
                        <option value="Male">{t('register.genderMale', 'पुरुष (Male)')}</option>
                        <option value="Female">{t('register.genderFemale', 'महिला (Female)')}</option>
                        <option value="Other">{t('register.genderOther', 'अन्य (Other)')}</option>
                      </select>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.mobile')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        maxLength={10}
                        value={formData.mobile}
                        onChange={handleChange}
                        placeholder={t('register.mobilePlaceholder', '10-अंकीय मोबाइल नंबर')}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.mobile ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.email')}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={t('register.emailPlaceholder', 'name@example.com')}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.email ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>

                    {/* Permanent Address */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.address')}
                      </label>
                      <textarea
                        name="address"
                        rows={2}
                        value={formData.address}
                        onChange={handleChange}
                        placeholder={t('register.addressPlaceholder', 'ग्राम / वार्ड, पोस्ट, ज़िला एवं पिनकोड')}
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50]"
                      />
                    </div>
                  </div>

                  <AccountPasswordFields
                    password={formData.password}
                    confirmPassword={formData.confirmPassword}
                    showPassword={showPassword}
                    errors={errors}
                    onChange={handleChange}
                    onToggle={() => setShowPassword((visible) => !visible)}
                  />

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#102F50] hover:bg-[#0c233c] text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer"
                    >
                      <span>{t('register.btnNext', 'अगला चरण')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Posting and Institution Details */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 text-[#102F50]">
                    <Building className="w-5 h-5" />
                    <h3 className="text-base font-bold font-serif">{t('register.step2Title')}</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* District (Dependent Dropdown) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.district')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        disabled={districtsLoading || availableDistricts.length === 0}
                        aria-describedby="locations-status"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50] bg-white"
                      >
                        <option value="">
                          {districtsLoading ? 'जिले लोड हो रहे हैं...' : 'जिला चुनें / Select district'}
                        </option>
                        {availableDistricts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {language === 'hi' ? `${d.nameHi} (${d.nameEn})` : d.nameEn}
                          </option>
                        ))}
                      </select>
                      <p id="locations-status" className="text-xs text-amber-700 mt-1" role={errors.locations ? 'alert' : 'status'}>
                        {errors.locations || (!districtsLoading && availableDistricts.length === 0
                          ? 'स्थान सूची उपलब्ध नहीं है। कृपया प्रशासन से आधिकारिक डेटा उपलब्ध कराने के बाद पुनः प्रयास करें।'
                          : '')}
                      </p>
                      {districtsError && !districtsLoading && <button type="button" onClick={loadDistricts} className="mt-1 text-xs font-semibold text-[#102F50] underline">पुनः प्रयास करें / Retry</button>}
                    </div>

                    {/* Block (Dependent on District) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.block')} <span className="text-slate-500 font-normal">({language === 'hi' ? 'वैकल्पिक' : 'Optional'})</span>
                      </label>
                      <select
                        name="block"
                        value={formData.block}
                        onChange={handleChange}
                        disabled={!formData.district || blocksLoading || !selectedDistrictData || selectedDistrictData.blocks.length === 0}
                        aria-describedby="locations-status"
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.block ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50] bg-white`}
                      >
                        <option value="">
                          {blocksLoading ? 'शिक्षा विकासखंड लोड हो रहे हैं...' : 'ब्लॉक चुनें / Select block'}
                        </option>
                        {selectedDistrictData?.blocks.map((b) => (
                          <option key={b.id} value={b.id}>
                            {language === 'hi' ? `${b.nameHi} (${b.nameEn})` : b.nameEn}
                          </option>
                        ))}
                      </select>
                      {blocksLoading && (
                        <p className="text-xs text-slate-600 mt-1" role="status">
                          शिक्षा विकासखंड लोड हो रहे हैं...
                        </p>
                      )}
                      {blocksError && (
                        <p className="text-xs text-red-600 mt-1" role="alert">{blocksError} <button type="button" onClick={() => setBlocksRetryNonce((value) => value + 1)} className="font-semibold underline">पुनः प्रयास करें / Retry</button></p>
                      )}
                      {!blocksLoading && !blocksError && selectedDistrictData?.blocks.length === 0 && (
                        <p className="text-xs text-amber-700 mt-1" role="status">
                          {language === 'hi'
                            ? 'शिक्षा विकासखंड की सत्यापित सूची शीघ्र उपलब्ध होगी। आपका विकासखंड बाद में प्रशासन द्वारा निर्धारित किया जाएगा।'
                            : 'The verified Education Block list is being prepared. Your block will be assigned by the administration later.'}
                        </p>
                      )}
                      {!blocksLoading && !blocksError && selectedDistrictData?.blocks.some((block) => block.verificationStatus === 'PROVISIONAL') && (
                        <p className="text-xs text-amber-700 mt-1" role="note">
                          उपलब्ध विकासखंड सूची सरकारी 2022-23 दस्तावेज़ पर आधारित है। कृपया अपना सही विकासखंड सुनिश्चित करें। सूची में नाम उपलब्ध न होने पर प्रशासन द्वारा सत्यापन किया जाएगा।
                          {' / The available block list is based on a Government 2022-23 document. Please verify your actual Education Block. If it is unavailable, the administration will verify it later.'}
                        </p>
                      )}
                      {errors.block && <p className="text-xs text-red-500 mt-1">{errors.block}</p>}
                    </div>

                    {/* School / Institution Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.schoolName')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="schoolName"
                        value={formData.schoolName}
                        onChange={handleChange}
                        placeholder={t('register.schoolPlaceholder', 'उदा. शासकीय उच्चतर माध्यमिक विद्यालय...')}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.schoolName ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.schoolName && <p className="text-xs text-red-500 mt-1">{errors.schoolName}</p>}
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.designation')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#102F50] bg-white"
                      >
                        {DESIGNATIONS.map((desig) => (
                          <option key={desig.en} value={desig.hi}>
                            {language === 'hi' ? desig.hi : desig.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Employee ID */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        {t('register.employeeId')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                        placeholder={t('register.employeePlaceholder', 'उदा. EMP-MP-12345')}
                        className={`w-full px-3.5 py-2.5 text-sm rounded-lg border ${
                          errors.employeeId ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                        } focus:outline-none focus:ring-2 focus:ring-[#102F50]`}
                      />
                      {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId}</p>}
                    </div>
                  </div>

                  <MembershipPlanOptions selectedPlan={formData.selectedPlan} onChange={handleChange} />

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('register.btnBack', 'पिछला चरण')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#102F50] hover:bg-[#0c233c] text-white text-xs sm:text-sm font-bold shadow transition cursor-pointer"
                    >
                      <span>{t('register.btnNext', 'अगला चरण')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Subscription & Account Details */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 text-[#102F50]">
                    <CreditCard className="w-5 h-5" />
                    <h3 className="text-base font-bold font-serif">{t('register.step3Title')}</h3>
                  </div>

                  {/* Review Information Box */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-1.5">
                    <div className="font-bold text-[#102F50] uppercase tracking-wider mb-2">
                      {t('register.reviewTitle', 'दर्ज जानकारी की समीक्षा (Quick Review):')}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div><strong className="text-slate-800">{t('register.reviewName', 'नाम:')}</strong> {formData.fullName || '—'}</div>
                      <div><strong className="text-slate-800">{t('register.reviewMobile', 'मोबाइल:')}</strong> {formData.mobile || '—'}</div>
                      <div>
                        <strong className="text-slate-800">{t('register.reviewDistrictBlock', 'ज़िला / ब्लॉक:')}</strong>{' '}
                        {selectedDistrictData?.nameEn || '—'} ({selectedDistrictData?.blocks.find((block) => block.id === formData.block)?.nameEn || (language === 'hi' ? 'बाद में निर्धारित होगा' : 'To be assigned')})
                      </div>
                      <div><strong className="text-slate-800">{t('register.reviewDesignation', 'पदनाम:')}</strong> {formData.designation}</div>
                      <div className="col-span-2">
                        <strong className="text-slate-800">{t('register.reviewPlan', 'चयनित योजना:')}</strong>{' '}
                        <span className="text-emerald-700 font-bold">
                          {formData.selectedPlan === 'yearly'
                            ? (language === 'hi' ? 'वार्षिक (₹120)' : 'Yearly (₹120)')
                            : (language === 'hi' ? 'पदाधिकारी सदस्य (₹1000)' : 'Office Bearer (₹1000)')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Terms and conditions */}
                  <div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="mt-1 w-4 h-4 rounded text-[#102F50] focus:ring-[#102F50]"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        {t('register.agreeTerms')}
                      </span>
                    </label>
                    {errors.agreeTerms && (
                      <p className="text-xs text-red-500 mt-1">{errors.agreeTerms}</p>
                    )}
                  </div>

                  {/* Demo prototype notice banner */}
                  {errors.locations && (
                    <p className="text-xs text-red-600" role="alert">{errors.locations}</p>
                  )}
                  {errors.submit && (
                    <div className="space-y-1" role="alert">
                      <p className="text-xs text-red-600">{errors.submit}</p>
                      {loginRecoveryAvailable && <Link to="/login" state={{ returnTo: '/member/payments', identifier: formData.email.trim() || formData.mobile.trim() }} className="text-xs font-bold text-[#102F50] underline">{t('register.continueLogin', 'Continue to Member Login')}</Link>}
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      आपका खाता तुरंत उपलब्ध होगा। Razorpay भुगतान पूरा करें; सदस्यता सक्रियण और डिजिटल सदस्यता कार्ड भुगतान सत्यापन के बाद जारी होगा।
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 transition cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t('register.btnBack', 'पिछला चरण')}</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-7 py-3 rounded-lg bg-[#049B70] hover:bg-[#037d5a] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {isSubmitting ? t('register.submitting', 'पंजीयन हो रहा है...') : t('register.btnSubmit', 'पंजीयन पूर्ण करें')}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
