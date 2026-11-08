import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, ExternalLink, Loader2, LogIn, Printer, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  ApiRequestError,
  createPaymentOrder,
  fetchMembership,
  fetchPaymentHistory,
  fetchPaymentReceipt,
  fetchRenewals,
  requestRenewal,
  verifyPayment,
  type PaymentRecord,
} from '../../lib/api';
import { loadCashfreeCheckout } from '../../lib/cashfree';

type MembershipRecord = {
  id: string;
  membershipNumber: string;
  plan: 'OFFICE_BEARER' | 'YEARLY';
  amount: number;
  status: string;
  validityStart?: string;
  validityEnd?: string;
};

type RenewalRecord = {
  _id?: string;
  id?: string;
  plan: 'OFFICE_BEARER' | 'YEARLY';
  amount: number;
  status: string;
  newValidityStart?: string;
  newValidityEnd?: string;
};

const planNames: Record<MembershipRecord['plan'], { hi: string; en: string }> = {
  OFFICE_BEARER: { hi: 'ऑफिस बेयरर सदस्यता', en: 'Office Bearer Membership' },
  YEARLY: { hi: 'वार्षिक सदस्यता', en: 'Yearly Subscription' },
};

function formatDate(value: string | undefined, language: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function statusIcon(status: string) {
  if (status === 'CAPTURED' || status === 'ACTIVE') return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
  if (status === 'FAILED' || status === 'REJECTED') return <XCircle className="h-4 w-4 text-red-600" aria-hidden="true" />;
  return <Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" />;
}

function statusLabel(status: string, language: string) {
  const labels: Record<string, { hi: string; en: string }> = {
    PENDING: { hi: 'भुगतान लंबित', en: 'Payment pending' },
    APPROVED: { hi: 'भुगतान लंबित', en: 'Payment pending' },
    ACTIVE: { hi: 'सक्रिय', en: 'Active' },
    EXPIRED: { hi: 'समाप्त', en: 'Expired' },
    SUSPENDED: { hi: 'निलंबित', en: 'Suspended' },
    CANCELLED: { hi: 'रद्द', en: 'Cancelled' },
    CREATED: { hi: 'भुगतान शुरू नहीं हुआ', en: 'Payment not started' },
    ORDER_CREATED: { hi: 'भुगतान लंबित', en: 'Payment pending' },
    AUTHORIZED: { hi: 'भुगतान की पुष्टि लंबित', en: 'Payment confirmation pending' },
    CAPTURED: { hi: 'भुगतान सफल', en: 'Payment captured' },
    FAILED: { hi: 'भुगतान विफल', en: 'Payment failed' },
  };
  return labels[status]?.[language === 'hi' ? 'hi' : 'en'] ?? status;
}

export const MemberPaymentsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { currentMember, isBackendAuthenticated, isAuthLoading } = useAuth();
  const [membership, setMembership] = useState<MembershipRecord | null>(null);
  const [renewals, setRenewals] = useState<RenewalRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!isBackendAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [currentResult, renewalResult, paymentResult] = await Promise.allSettled([
        fetchMembership(),
        fetchRenewals(),
        fetchPaymentHistory(),
      ]);
      if (currentResult.status === 'rejected') throw currentResult.reason;
      setMembership(currentResult.value as MembershipRecord);
      setRenewals(renewalResult.status === 'fulfilled' ? renewalResult.value as RenewalRecord[] : []);
      setPayments(paymentResult.status === 'fulfilled' ? paymentResult.value : []);
      if (renewalResult.status === 'rejected' || paymentResult.status === 'rejected') {
        setNotice({
          type: 'error',
          message: t('payments.historyLoadError', 'Membership loaded, but some payment history could not be loaded. Please refresh and try again.'),
        });
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof ApiRequestError ? error.message : t('payments.loadError', 'सदस्यता विवरण लोड नहीं हो सका।'),
      });
    } finally {
      setLoading(false);
    }
  }, [isBackendAuthenticated, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const cashfreeOrderId = new URLSearchParams(window.location.search).get('cashfree_order_id');
    if (!cashfreeOrderId || !isBackendAuthenticated) return;
    setNotice({ type: 'info', message: t('payments.verifying', 'Cashfree payment is being verified. Please wait.') });
    void verifyPayment({ cashfreeOrderId }).then(async () => {
      setNotice({ type: 'success', message: t('payments.success', 'Payment verified successfully. Your membership status has been updated.') });
      await refresh();
    }).catch((error) => {
      setNotice({ type: 'info', message: error instanceof ApiRequestError ? error.message : t('payments.pending', 'Payment status is not confirmed yet. Please refresh shortly.') });
      void refresh();
    }).finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('cashfree_order_id');
      window.history.replaceState({}, '', url.toString());
    });
  }, [isBackendAuthenticated, refresh, t]);

  const pendingRenewal = useMemo(
    () => renewals.find((renewal) => renewal.status === 'PENDING' || renewal.status === 'APPROVED'),
    [renewals],
  );

  if (isAuthLoading) return <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center text-[#102F50]">Loading…</div>;
  if (!currentMember || !isBackendAuthenticated) return <Navigate to="/login" replace />;

  const startPayment = async (operation: { membershipId?: string; renewalRequestId?: string; label: string }) => {
    setBusy(operation.label);
    setNotice(null);
    try {
      const order = await createPaymentOrder({
        ...(operation.membershipId ? { membershipId: operation.membershipId } : {}),
        ...(operation.renewalRequestId ? { renewalRequestId: operation.renewalRequestId } : {}),
      });
      await loadCashfreeCheckout();
      if (!window.Cashfree) throw new Error('Cashfree Checkout failed to initialize');
      const cashfree = window.Cashfree({ mode: order.mode });
      await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: '_self',
      });
    } catch (error) {
      setBusy(null);
      setNotice({
        type: 'error',
        message: error instanceof ApiRequestError ? error.message : t('payments.checkoutError', 'Unable to start Cashfree checkout. Please try again.'),
      });
    }
  };

  const createRenewal = async () => {
    if (!membership) return;
    setBusy('renewal-request');
    setNotice(null);
    try {
      await requestRenewal(membership.id);
      await refresh();
      setNotice({ type: 'success', message: t('payments.renewalRequested', 'नवीनीकरण अनुरोध तैयार है। सत्यापन के बाद भुगतान करें।') });
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof ApiRequestError ? error.message : t('payments.renewalError', 'नवीनीकरण अनुरोध नहीं भेजा जा सका।') });
    } finally {
      setBusy(null);
    }
  };

  const printReceipt = async (paymentId: string) => {
    setBusy(`receipt-${paymentId}`);
    try {
      const receipt = await fetchPaymentReceipt(paymentId);
      const popup = window.open('', '_blank', 'noopener,noreferrer');
      if (!popup) throw new Error('Popup blocked');
      popup.document.write(`<html><head><title>${receipt.internalReceipt}</title></head><body style="font-family: sans-serif; padding: 32px"><h1>SSSMP Portal</h1><h2>Payment Receipt</h2><p>Receipt: ${receipt.internalReceipt}</p><p>Plan: ${receipt.plan}</p><p>Amount: ₹${(receipt.amountPaise / 100).toFixed(2)}</p><p>Date: ${formatDate(receipt.capturedAt ?? receipt.createdAt, language)}</p></body></html>`);
      popup.document.close();
      popup.focus();
      popup.print();
    } catch (error) {
      setNotice({ type: 'error', message: error instanceof ApiRequestError ? error.message : t('payments.receiptError', 'रसीद उपलब्ध नहीं हो सकी।') });
    } finally {
      setBusy(null);
    }
  };

  if (!isBackendAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] px-4 py-16">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <LogIn className="mx-auto mb-4 h-10 w-10 text-[#102F50]" aria-hidden="true" />
          <h1 className="text-xl font-bold text-[#102F50]">{t('payments.loginRequired', 'सदस्य लॉगिन आवश्यक है')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('payments.loginDescription', 'भुगतान देखने या करने के लिए वास्तविक backend सदस्य खाते से लॉगिन करें।')}</p>
          <Link to="/login" className="mt-6 inline-flex rounded-lg bg-[#102F50] px-5 py-2.5 text-sm font-bold text-white">{t('payments.goLogin', 'लॉगिन करें')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#049B70]">SSSMP Portal</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#102F50] sm:text-3xl">{t('payments.title', 'सदस्यता एवं भुगतान')}</h1>
            <p className="mt-1 text-sm text-slate-600">{currentMember?.fullName}</p>
          </div>
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-[#102F50]" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> {t('payments.refresh', 'ताज़ा करें')}
          </button>
        </div>

        {notice && (
          <div role="status" className={`mb-6 flex items-start gap-3 rounded-lg border p-4 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> <span>{notice.message}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600" aria-busy="true"><Loader2 className="mx-auto h-6 w-6 animate-spin" aria-hidden="true" /></div>
        ) : (
          <>
            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label={t('payments.plans', 'सदस्यता योजनाएं')}>
              {(['OFFICE_BEARER', 'YEARLY'] as const).map((plan) => (
                <div key={plan} className={`rounded-xl border bg-white p-5 ${membership?.plan === plan ? 'border-[#049B70] ring-1 ring-[#049B70]' : 'border-slate-200'}`}>
                  <p className="text-sm font-bold text-[#102F50]">{planNames[plan][language]}</p>
                  <p className="mt-2 text-2xl font-extrabold text-[#102F50]">₹{plan === 'OFFICE_BEARER' ? '1,000' : '120'}</p>
                  <p className="mt-1 text-xs text-slate-500">{plan === 'OFFICE_BEARER' ? t('payments.officeValidity', 'वैधता संगठन की नीति के अनुसार') : t('payments.yearlyValidity', '365 दिनों की सदस्यता')}</p>
                </div>
              ))}
            </section>
            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('payments.statusLabel', 'वर्तमान सदस्यता स्थिति')}</p>
                  <h2 className="mt-1 text-xl font-bold text-[#102F50]">{membership ? planNames[membership.plan][language] : t('payments.noMembership', 'सदस्यता रिकॉर्ड उपलब्ध नहीं है')}</h2>
                  {membership && <p className="mt-1 text-sm text-slate-600">{t('payments.applicationStatus', 'स्थिति')}: <strong>{statusLabel(membership.status, language)}</strong> · {membership.membershipNumber}</p>}
                </div>
                {membership && <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{statusIcon(membership.status)} {statusLabel(membership.status, language)}</span>}
              </div>
              {membership?.validityEnd && <p className="mt-4 text-sm text-slate-600">{t('payments.validUntil', 'वैधता समाप्ति')}: <strong>{formatDate(membership.validityEnd, language)}</strong></p>}
              {membership && (membership.status === 'PENDING' || membership.status === 'APPROVED') && (
                <button type="button" onClick={() => void startPayment({ membershipId: membership.id, label: planNames[membership.plan][language] })} disabled={Boolean(busy)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#049B70] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />} {t('payments.payNow', 'Pay Now')} · ₹{membership.amount.toLocaleString('en-IN')}
                </button>
              )}
              {membership && (membership.status === 'ACTIVE' || membership.status === 'EXPIRED') && !pendingRenewal && (
                <button type="button" onClick={() => void createRenewal()} disabled={Boolean(busy)} className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#102F50] px-5 py-2.5 text-sm font-bold text-[#102F50] disabled:opacity-60">
                  {busy === 'renewal-request' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />} {t('payments.requestRenewal', 'नवीनीकरण अनुरोध')}
                </button>
              )}
            </section>

            {pendingRenewal && (
              <section className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="font-bold text-[#102F50]">{t('payments.renewalReady', 'नवीनीकरण के लिए भुगतान')}</h2>
                <p className="mt-1 text-sm text-slate-700">{planNames[pendingRenewal.plan][language]} · ₹{pendingRenewal.amount.toLocaleString('en-IN')}</p>
                <button type="button" onClick={() => void startPayment({ renewalRequestId: pendingRenewal.id ?? pendingRenewal._id, label: t('payments.renewalPayment', 'सदस्यता नवीनीकरण') })} disabled={Boolean(busy)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#102F50] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  <CreditCard className="h-4 w-4" aria-hidden="true" /> {t('payments.payRenewal', 'नवीनीकरण का भुगतान करें')}
                </button>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 p-5"><ShieldCheck className="h-5 w-5 text-[#049B70]" aria-hidden="true" /><h2 className="font-bold text-[#102F50]">{t('payments.history', 'भुगतान इतिहास')}</h2></div>
              {payments.length === 0 ? <p className="p-6 text-sm text-slate-600">{t('payments.noHistory', 'अभी कोई भुगतान रिकॉर्ड नहीं है।')}</p> : (
                <div className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#102F50]">{statusIcon(payment.status)} {planNames[payment.plan][language]} <span className={`rounded-full px-2 py-0.5 text-[10px] ${payment.status === 'CAPTURED' ? 'bg-emerald-50 text-emerald-800' : payment.status === 'FAILED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{statusLabel(payment.status, language)}</span></div>
                        <p className="mt-1 text-xs text-slate-600">{payment.internalReceipt} · {formatDate(payment.capturedAt ?? payment.createdAt, language)}</p>
                        <p className="mt-1 text-xs text-slate-500">{t('payments.refundStatus', 'रिफंड स्थिति')}: {payment.refundStatus}</p>
                        {payment.status === 'FAILED' && <p className="mt-1 text-xs text-red-700">{t('payments.failedNoActivation', 'This payment did not activate your membership. You may retry payment.')}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <strong className="text-[#102F50]">₹{(payment.amountPaise / 100).toLocaleString('en-IN')}</strong>
                        {payment.status === 'CAPTURED' && <button type="button" onClick={() => void printReceipt(payment.id)} className="inline-flex items-center gap-1 text-xs font-bold text-[#049B70]"><Printer className="h-4 w-4" aria-hidden="true" /> {t('payments.receipt', 'रसीद')}</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> {t('payments.securityNote', 'भुगतान और सदस्यता स्थिति केवल backend सत्यापन के बाद अपडेट होती है।')}</p>
          </>
        )}
      </div>
    </div>
  );
};
