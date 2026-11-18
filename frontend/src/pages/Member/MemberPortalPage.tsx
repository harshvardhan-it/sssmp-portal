import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Printer, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ApiRequestError, changePassword, fetchCurrentMember, fetchMembership, fetchPaymentHistory, updateCurrentMember, type BackendMember, type PaymentRecord } from '../../lib/api';
import { MemberLocationSelector } from './MemberLocationSelector';

const label = (hi: string, en: string, language: string) => language === 'hi' ? hi : en;
const statusText = (status: string | undefined, language: string) => ({ ACTIVE: label('सक्रिय', 'Active', language), PENDING: label('भुगतान लंबित', 'Payment pending', language), APPROVED: label('भुगतान लंबित', 'Payment pending', language), EXPIRED: label('समाप्त', 'Expired', language), SUSPENDED: label('निलंबित', 'Suspended', language), REJECTED: label('अस्वीकृत', 'Rejected', language), INACTIVE: label('निष्क्रिय', 'Inactive', language) }[status ?? 'PENDING'] ?? status ?? '—');
const paymentStatusText = (status: string, language: string) => ({ CAPTURED: label('भुगतान सफल', 'Payment captured', language), FAILED: label('भुगतान विफल', 'Payment failed', language), CREATED: label('भुगतान शुरू नहीं हुआ', 'Payment not started', language), ORDER_CREATED: label('भुगतान लंबित', 'Payment pending', language), AUTHORIZED: label('भुगतान पुष्टि लंबित', 'Payment confirmation pending', language) }[status] ?? status);
const profileFieldText = (field: string, language: string) => ({ fullName: label('पूरा नाम', 'Full name', language), fatherHusbandName: label('पिता / पति का नाम', "Father's / Husband's name", language), dob: label('जन्म तिथि', 'Date of birth', language), mobile: label('मोबाइल', 'Mobile', language), email: label('ईमेल', 'Email', language), address: label('पता', 'Address', language), schoolName: label('विद्यालय / संस्था', 'School / Institution', language), designation: label('पदनाम', 'Designation', language), employeeId: label('कर्मचारी कोड / विशिष्ट आईडी', 'Employee Code / Unique ID', language) }[field] ?? field);
function date(value: unknown, language: string) { return value ? new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium' }).format(new Date(String(value))) : '—'; }

function Shell({ children }: { children: React.ReactNode }) { const { currentMember, isBackendAuthenticated, logoutMember } = useAuth(); const { language, toggleLanguage } = useLanguage(); if (!currentMember || !isBackendAuthenticated) return <Navigate to="/login" replace />; return <div className="min-h-screen bg-[#FAF9F5] text-slate-800"><header className="bg-white border-b border-slate-200"><div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between"><Link to="/member/dashboard" className="font-bold text-[#102F50]">SSSMP Member Portal</Link><div className="flex items-center gap-3 text-sm"><button onClick={toggleLanguage} className="text-[#102F50]">{language === 'hi' ? 'English' : 'हिन्दी'}</button><button onClick={logoutMember} className="inline-flex gap-1 items-center text-red-600"><LogOut size={16}/>{label('लॉगआउट','Logout',language)}</button></div></div></header><nav className="bg-[#102F50] text-white"><div className="max-w-6xl mx-auto px-4 py-2 flex gap-4 text-sm overflow-x-auto"><Link to="/member/dashboard">{label('डैशबोर्ड','Dashboard',language)}</Link><Link to="/member/profile">{label('मेरी प्रोफ़ाइल','My profile',language)}</Link><Link to="/member/card">{label('सदस्यता कार्ड','Membership card',language)}</Link><Link to="/member/settings">{label('सेटिंग्स','Settings',language)}</Link></div></nav><main className="max-w-6xl mx-auto px-4 py-8">{children}</main></div> }

export function MemberDashboardPage() { const { currentMember } = useAuth(); const { language } = useLanguage(); const [membership, setMembership] = useState<Record<string, unknown> | null>(null); const [payments, setPayments] = useState<PaymentRecord[]>([]); const [loading, setLoading] = useState(true); useEffect(() => { Promise.all([fetchMembership().catch(() => null), fetchPaymentHistory().catch(() => [])]).then(([m,p]) => { setMembership(m); setPayments(p as PaymentRecord[]); }).finally(() => setLoading(false)); }, []); if (!currentMember) return <Navigate to="/login" replace />; const status = String(membership?.status ?? currentMember.status); const planLabel = membership?.plan === 'OFFICE_BEARER' ? label('पदाधिकारी सदस्यता ₹1,000', 'Office Bearer ₹1,000', language) : label('वार्षिक सदस्यता ₹120', 'Yearly ₹120', language); return <Shell><h1 className="text-3xl font-bold text-[#102F50]">{label(`नमस्ते, ${currentMember.fullName}`, `Welcome, ${currentMember.fullName}`, language)}</h1><p className="mt-1 text-slate-600">{label('आपकी वास्तविक सदस्यता जानकारी', 'Your verified membership information', language)}</p>{loading ? <div className="py-16 text-center">{label('लोड हो रहा है…','Loading…',language)}</div> : <><div className="grid md:grid-cols-4 gap-4 mt-8">{[[label('स्थिति','Status',language),statusText(status,language)], [label('योजना','Plan',language), planLabel], [label('सदस्यता आईडी','Membership ID',language),String(membership?.membershipNumber ?? '—')], [label('वैधता','Validity',language),date(membership?.validityEnd,language)]].map(([a,b]) => <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm" key={a}><p className="text-xs text-slate-500">{a}</p><p className="mt-2 font-bold text-[#102F50]">{b}</p></div>)}</div><div className="grid md:grid-cols-2 gap-5 mt-6"><section className="bg-white rounded-xl border p-5"><h2 className="font-bold text-[#102F50]">{label('स्थान सत्यापन','Location verification',language)}</h2><p className="mt-3">{currentMember.locationStatus === 'LOCATION_PENDING' ? label('स्थान सत्यापन लंबित है। ब्लॉक प्रशासनिक अधिकार प्रदान नहीं करता।','Location verification is pending. No Block Admin authorization is granted.',language) : label('स्थान सत्यापित','Location verified',language)}</p></section><section className="bg-white rounded-xl border p-5"><h2 className="font-bold text-[#102F50]">{label('हालिया भुगतान','Recent payments',language)}</h2>{payments.length ? payments.slice(0,4).map(p => <div className="flex justify-between py-2 border-b text-sm" key={p.id}><span>{p.internalReceipt}</span><span className={p.status === 'CAPTURED' ? 'text-emerald-700' : p.status === 'FAILED' ? 'text-red-700' : 'text-amber-700'}>{paymentStatusText(p.status,language)}</span></div>) : <p className="mt-3 text-slate-500">{label('अभी कोई भुगतान नहीं','No payment activity yet',language)}</p>}<Link className="inline-block mt-4 text-[#049B70]" to="/member/payments">{label('भुगतान इतिहास देखें','View payment history',language)} →</Link></section></div></>}</Shell> }

export function MemberProfilePage() {
  const { language } = useLanguage();
  const [member, setMember] = useState<BackendMember | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    fetchCurrentMember().then((current) => {
      setMember(current);
      setForm({
        fullName: current.fullName,
        fatherHusbandName: current.fatherHusbandName ?? '',
        dob: current.dob?.slice(0, 10) ?? '',
        mobile: current.mobile,
        email: current.email ?? '',
        address: current.address ?? '',
        district: current.district?.id ?? '',
        block: current.block?.id ?? '',
        schoolName: current.schoolName ?? '',
        designation: current.designation ?? '',
        employeeId: current.employeeId ?? '',
      });
    }).catch((error) => setLoadError(error instanceof ApiRequestError ? error.message : label('प्रोफ़ाइल लोड नहीं हो सकी।', 'Profile could not be loaded.', language)));
  }, [language]);
  if (loadError) return <Shell><p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">{loadError}</p></Shell>;
  if (!member) return <Shell><p>{label('लोड हो रहा है…', 'Loading…', language)}</p></Shell>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    try {
      await updateCurrentMember(form);
      setMessage(label('प्रोफ़ाइल सहेजी गई', 'Profile saved', language));
    } catch (error) {
      setMessage(error instanceof ApiRequestError ? error.message : label('प्रोफ़ाइल सहेजी नहीं जा सकी।', 'Profile could not be saved.', language));
    }
  };
  return <Shell><h1 className="text-2xl font-bold text-[#102F50]">{label('मेरी प्रोफ़ाइल', 'My profile', language)}</h1><form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border bg-white p-6 md:grid-cols-2"><MemberLocationSelector districtId={form.district ?? ''} blockId={form.block ?? ''} onChange={(field, value) => setForm((previous) => ({ ...previous, [field]: value }))} language={language} />{Object.entries(form).filter(([key]) => key !== 'district' && key !== 'block').map(([key, value]) => <label className="text-sm" key={key}>{profileFieldText(key, language)}<input value={value} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} type={key === 'dob' ? 'date' : 'text'} className="mt-1 w-full rounded border p-2" /></label>)}<button className="inline-flex justify-center gap-2 rounded bg-[#049B70] px-4 py-2 text-white md:col-span-2"><Save size={17} />{label('सहेजें', 'Save', language)}</button>{message && <p className="md:col-span-2" role="status">{message}</p>}</form></Shell>;
}

export function MemberCardPage() {
  const { currentMember } = useAuth();
  const { language } = useLanguage();
  const [membership, setMembership] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembership().then(setMembership).catch(() => setMembership(null)).finally(() => setLoading(false));
  }, []);

  if (!currentMember) return <Navigate to="/login" replace />;

  const status = String(membership?.status ?? currentMember.status);
  const active = status === 'ACTIVE';
  const plan = membership?.plan === 'OFFICE_BEARER'
    ? label('पदाधिकारी सदस्यता', 'Office Bearer Membership', language)
    : label('वार्षिक सदस्यता', 'Annual Membership', language);
  const issuedOn = date(membership?.validityStart ?? membership?.activatedAt, language);
  const validUntil = date(membership?.validityEnd, language);

  return (
    <Shell>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 18mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .membership-print-area, .membership-print-area * { visibility: visible !important; }
          .membership-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; }
          .membership-card { box-shadow: none !important; break-inside: avoid; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-[#102F50]">{label('डिजिटल सदस्यता कार्ड', 'Digital Membership Card', language)}</h1>
          <p className="mt-1 text-sm text-slate-500">{label('भुगतान सत्यापन के बाद जारी डिजिटल पहचान पत्र', 'Digital identity card issued after verified payment', language)}</p>
        </div>
        {active && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#102F50] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0B2038]">
          <Printer size={17} />{label('प्रिंट / PDF सेव करें', 'Print / Save as PDF', language)}
        </button>}
      </div>

      {loading ? (
        <div className="mt-8 rounded-xl border bg-white p-8 text-center text-slate-500">{label('सदस्यता विवरण लोड हो रहा है…', 'Loading membership details…', language)}</div>
      ) : active ? (
        <div className="membership-print-area mt-7">
          <article className="membership-card mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl">
            <header className="relative overflow-hidden bg-[#102F50] px-6 py-5 text-white">
              <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border-[22px] border-white/5" />
              <div className="relative flex items-center gap-4">
                <img src="/logo.jpg" alt={label('संगठन का लोगो', 'Organization logo', language)} className="h-16 w-16 shrink-0 rounded-full border-2 border-white/80 bg-white object-contain p-1" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">{label('आधिकारिक सदस्य पहचान पत्र', 'Official Membership Identity Card', language)}</p>
                  <h2 className="mt-1 text-lg font-extrabold leading-snug">शासकीय शिक्षक संगठन मध्यप्रदेश</h2>
                  <p className="text-xs text-slate-200">Shasakiya Shikshak Sangathan Madhya Pradesh</p>
                </div>
              </div>
            </header>

            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label('सदस्य का नाम', 'Member Name', language)}</p>
                  <h3 className="mt-1 text-2xl font-extrabold text-[#102F50]">{currentMember.fullName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{label('पंजीकरण संख्या', 'Registration No.', language)}: {currentMember.registrationNumber || '—'}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />{label('सक्रिय सदस्य', 'ACTIVE MEMBER', language)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                {[
                  [label('सदस्यता क्रमांक', 'Membership ID', language), String(membership?.membershipNumber ?? '—')],
                  [label('पिता / पति का नाम', "Father's / Husband's Name", language), currentMember.fatherHusbandName || '—'],
                  [label('पदनाम', 'Designation', language), currentMember.designation || '—'],
                  [label('विद्यालय / संस्था', 'School / Institution', language), currentMember.schoolName || '—'],
                  [label('कर्मचारी आईडी', 'Employee ID', language), currentMember.employeeId || '—'],
                  [label('मोबाइल नंबर', 'Mobile Number', language), currentMember.mobile || '—'],
                  [label('जिला', 'District', language), currentMember.district || '—'],
                  [label('विकासखंड', 'Block', language), currentMember.block || '—'],
                  [label('सदस्यता योजना', 'Membership Plan', language), plan],
                  [label('जारी होने की तिथि', 'Issued On', language), issuedOn],
                  [label('वैधता समाप्ति', 'Valid Until', language), validUntil],
                ].map(([heading, value]) => (
                  <div key={heading} className="min-w-0 border-b border-slate-100 pb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{heading}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>

              <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-slate-300 pt-4">
                <div>
                  <p className="text-xs font-bold text-[#102F50]">{label('शिक्षक एकता • शिक्षक सम्मान', 'Teacher Unity • Teacher Dignity', language)}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{label('यह कार्ड संगठन के डिजिटल सदस्यता रिकॉर्ड के आधार पर जारी किया गया है।', 'Issued against the organization’s digital membership record.', language)}</p>
                </div>
                <p className="rounded-md bg-slate-100 px-3 py-2 text-[10px] font-bold tracking-wider text-slate-600">SSSMP • {new Date().getFullYear()}</p>
              </footer>
            </div>
          </article>
          <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-slate-500 print:hidden">
            {label('PDF के लिए “प्रिंट / PDF सेव करें” दबाएँ और प्रिंटर में “Save as PDF” चुनें।', 'To download a PDF, choose “Save as PDF” in the print destination.', language)}
          </p>
        </div>
      ) : (
        <div className="mt-7 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-bold text-[#102F50]">{statusText(status, language)}</h2>
          <p className="mt-2 text-sm text-slate-700">
            {status === 'PENDING' || status === 'APPROVED'
              ? label('सदस्यता भुगतान सत्यापन के बाद सक्रिय होगी। सक्रिय होने पर कार्ड यहाँ उपलब्ध होगा।', 'Membership activates after payment verification. Your card will be available here once active.', language)
              : label('इस स्थिति में सक्रिय सदस्यता कार्ड उपलब्ध नहीं है।', 'An active membership card is not available for this status.', language)}
          </p>
          <Link to="/member/payments" className="mt-4 inline-flex text-sm font-bold text-[#049B70]">{label('सदस्यता / भुगतान देखें', 'View membership / payment', language)} →</Link>
        </div>
      )}
    </Shell>
  );
}

export function MemberSettingsPage(){const {language}=useLanguage();const {logoutMember}=useAuth();const nav=useNavigate();const [current,setCurrent]=useState('');const [next,setNext]=useState('');const [confirm,setConfirm]=useState('');const [message,setMessage]=useState('');const submit=async(e:React.FormEvent)=>{e.preventDefault();if(next.length<8||next!==confirm){setMessage(label('पासवर्ड कम से कम 8 अक्षरों का और समान होना चाहिए','Password must be 8+ characters and match',language));return}try{await changePassword(current,next);setMessage(label('पासवर्ड बदला गया। कृपया दोबारा लॉगिन करें।','Password changed. Please log in again.',language));logoutMember();setTimeout(()=>nav('/login'),500)}catch(error){setMessage(error instanceof ApiRequestError?error.message:label('पासवर्ड नहीं बदला जा सका।','Unable to change password.',language))}};return <Shell><h1 className="text-2xl font-bold text-[#102F50]">{label('खाता सेटिंग्स','Account settings',language)}</h1><form onSubmit={submit} className="max-w-lg mt-6 bg-white border rounded-xl p-6 space-y-4"><label>{label('वर्तमान पासवर्ड','Current password',language)}<input required type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} className="mt-1 w-full border rounded p-2"/></label><label>{label('नया पासवर्ड','New password',language)}<input required type="password" autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} className="mt-1 w-full border rounded p-2"/></label><label>{label('पुष्टि','Confirm password',language)}<input required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full border rounded p-2"/></label><button className="bg-[#102F50] text-white rounded px-4 py-2 inline-flex gap-2"><KeyRound size={17}/>{label('पासवर्ड बदलें','Change password',language)}</button>{message&&<p role="status">{message}</p>}</form></Shell>}
