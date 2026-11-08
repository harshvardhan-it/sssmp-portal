import React, { useRef } from 'react';
import { Download, Printer, ShieldCheck, CheckCircle } from 'lucide-react';
import type { MemberRecord } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface DigitalCardProps {
  member: MemberRecord;
}

export const DigitalCard: React.FC<DigitalCardProps> = ({ member }) => {
  const { language, t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center">
      {/* The Printable Digital ID Card */}
      <div
        ref={cardRef}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-[#102F50] print:shadow-none print:border-black relative text-slate-800"
      >
        {/* Card Header with Navy background & Golden trim */}
        <div className="bg-[#102F50] text-white p-4 relative overflow-hidden border-b-2 border-amber-400">
          <div className="flex items-center gap-3 relative z-10">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-14 h-14 rounded-full bg-white p-0.5 shadow-md object-contain shrink-0"
            />
            <div>
              <h4 className="text-base font-extrabold leading-tight tracking-tight text-white font-serif">
                {t('digitalCard.headerTitle', 'शासकीय शिक्षक संगठन मध्यप्रदेश')}
              </h4>
              <p className="text-[10px] text-amber-300 font-semibold tracking-wide">
                {t('digitalCard.regNo', 'पंजी. क्रमांक: 01/01/01/38865')}
              </p>
              <div className="inline-block mt-0.5 px-2 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider">
                {t('digitalCard.badgeEcard', 'डिजिटल सदस्यता पहचान पत्र (E-CARD)')}
              </div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 pattern-dots-subtle relative">
          {/* Member ID watermark / ribbon */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('digitalCard.regIdLabel', 'Registration ID')}
              </span>
              <span className="text-base font-black text-[#102F50] tracking-wider">
                {member.registrationNumber}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {t('digitalCard.statusLabel', 'Membership Status')}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" />
                {member.status === 'ACTIVE' ? t('digitalCard.activeStatus', 'ACTIVE') : member.status}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.nameLabel', 'Name:')}</span>
              <span className="col-span-2 font-bold text-slate-900">{member.fullName}</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.fatherLabel', 'Father\'s Name:')}</span>
              <span className="col-span-2 font-semibold text-slate-800">{member.fatherHusbandName}</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.roleLabel', 'Designation:')}</span>
              <span className="col-span-2 font-semibold text-[#102F50]">{member.designation}</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.schoolLabel', 'School:')}</span>
              <span className="col-span-2 text-slate-800 leading-tight">{member.schoolName}</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.districtBlockLabel', 'District & Block:')}</span>
              <span className="col-span-2 font-semibold text-slate-800">
                {member.district} ({member.block})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.phoneLabel', 'Phone:')}</span>
              <span className="col-span-2 font-mono text-slate-800">{member.mobile}</span>
            </div>

            {member.employeeId && (
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500 font-medium">{t('digitalCard.empCodeLabel', 'Employee Code:')}</span>
                <span className="col-span-2 font-mono text-slate-800">{member.employeeId}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">{t('digitalCard.planLabel', 'Plan:')}</span>
              <span className="col-span-2 font-bold text-[#049B70]">
                {member.plan === 'office_bearer'
                  ? (language === 'hi' ? 'पदाधिकारी (₹1000)' : 'Office Bearer (₹1000)')
                  : (language === 'hi' ? 'वार्षिक (₹120 / 12 माह)' : 'Yearly (₹120 / 12 Months)')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-medium">{t('digitalCard.validityLabel', 'Validity:')}</span>
              <span className="col-span-2 text-slate-700 text-[11px]">
                {member.joinDate} {language === 'hi' ? 'से' : 'to'} {member.validUntil}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-[#102F50]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {t('digitalCard.certifiedText', 'Certified Digital Membership')}
          </span>
          <span>{t('digitalCard.statutoryText', 'Registered with MP Govt')}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#102F50] hover:bg-[#0c233c] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{t('digitalCard.printBtn', 'Print Card')}</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('digitalCard.downloadBtn', 'Download / Save')}</span>
        </button>
      </div>
    </div>
  );
};
