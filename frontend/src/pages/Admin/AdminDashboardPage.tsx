import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  Building,
  MapPin,
  ShieldAlert,
  Settings,
  FileSpreadsheet,
  LogOut,
  Search,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Layers,
  TrendingUp,
  Image,
  Globe,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { MP_DISTRICTS } from '../../data/districtsAndBlocks';
import { CarouselManagement } from '../../components/admin/CarouselManagement';
import type { MemberRecord } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { backendUser, logoutAdmin, allMembers } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedPlan, setSelectedPlan] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMemberModal, setSelectedMemberModal] = useState<MemberRecord | null>(null);

  const pageSize = 5;

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return allMembers.filter((m) => {
      const matchSearch =
        searchTerm === '' ||
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mobile.includes(searchTerm);

      const matchDistrict = selectedDistrict === 'ALL' || m.district === selectedDistrict;
      const matchPlan = selectedPlan === 'ALL' || m.plan === selectedPlan;
      const matchStatus = selectedStatus === 'ALL' || m.status === selectedStatus;

      return matchSearch && matchDistrict && matchPlan && matchStatus;
    });
  }, [allMembers, searchTerm, selectedDistrict, selectedPlan, selectedStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredMembers.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMembers.slice(start, start + pageSize);
  }, [filteredMembers, currentPage, pageSize]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = allMembers.length;
    const officeBearer = allMembers.filter((m) => m.plan === 'office_bearer').length;
    const yearly = allMembers.filter((m) => m.plan === 'yearly').length;
    const active = allMembers.filter((m) => m.status === 'ACTIVE').length;
    const pending = allMembers.filter((m) => m.status === 'PENDING').length;
    const totalDemoRevenue = allMembers.reduce((acc, cur) => acc + cur.amount, 0);

    return { total, officeBearer, yearly, active, pending, totalDemoRevenue };
  }, [allMembers]);

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  const sidebarItems = [
    { id: 'dashboard', label: t('admin.sidebar.dashboard', 'डैशबोर्ड'), icon: LayoutDashboard },
    { id: 'carousel', label: t('admin.sidebar.carousel', 'कैरोसेल व चित्र प्रबंधन'), icon: Image },
    { id: 'members', label: t('admin.sidebar.members', 'सदस्य सूची'), icon: Users },
    { id: 'registrations', label: t('admin.sidebar.registrations', 'नवीन पंजीयन'), icon: UserCheck },
    { id: 'subscriptions', label: t('admin.sidebar.subscriptions', 'सदस्यता योजनाएँ'), icon: CreditCard },
    { id: 'payments', label: t('admin.sidebar.payments', 'भुगतान रिकॉर्ड'), icon: TrendingUp },
    { id: 'districts', label: t('admin.sidebar.districts', 'ज़िला इकाइयाँ (55)'), icon: MapPin },
    { id: 'blocks', label: t('admin.sidebar.blocks', 'ब्लॉक समितियाँ (313)'), icon: Building },
    { id: 'administrators', label: t('admin.sidebar.administrators', 'व्यवस्थापक दल'), icon: ShieldAlert },
    { id: 'reports', label: t('admin.sidebar.reports', 'रिपोर्ट्स व ऑडिट'), icon: FileSpreadsheet },
    { id: 'settings', label: t('admin.sidebar.settings', 'पोर्टल सेटिंग्स'), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-[#102F50] text-white px-4 sm:px-6 py-3 flex items-center justify-between border-b border-[#1c456f] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Logo" className="w-9 h-9 rounded-full bg-white p-0.5 object-contain" />
            <div>
              <div className="font-bold text-sm tracking-tight">{t('org.name')}</div>
              <div className="text-[10px] text-amber-300 font-mono">{t('admin.controlRoom')}</div>
            </div>
          </Link>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
            {t('admin.demoDataBadge', 'DEMO PROTOTYPE DATA')}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <div className="hidden md:flex flex-col text-right">
            <span className="font-semibold text-slate-200">
              {backendUser?.email ?? backendUser?.mobile ?? backendUser?.id ?? (language === 'hi' ? 'प्रशासक' : 'Administrator')}
            </span>
            <span className="text-[10px] text-emerald-400">
              {t('admin.adminRoleLabel')} {backendUser?.role ?? '—'}
            </span>
          </div>

          <Link
            to="/"
            className="hidden sm:inline-block px-3 py-1.5 rounded-lg bg-[#183d63] hover:bg-[#204e7c] text-slate-200 text-xs transition"
          >
            {t('admin.viewMainSite')}
          </Link>

          {/* Admin Header Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#183d63] hover:bg-[#204e7c] text-white text-xs font-medium transition cursor-pointer"
            title={language === 'hi' ? 'Switch to English' : 'हिंदी में देखें'}
          >
            <Globe className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'hi' ? 'English' : 'हिंदी'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-700 text-white font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('admin.sidebar.logout', 'लॉगआउट')}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 shrink-0">
          <div className="p-4 border-b border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t('admin.hierarchyTitle')}
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
              <div className="font-bold text-[#102F50]">STATE (म.प्र.)</div>
              <div className="pl-3 text-slate-600">└── DISTRICT (55)</div>
              <div className="pl-6 text-slate-600">└── BLOCK (313)</div>
              <div className="pl-9 text-emerald-700 font-bold">└── MEMBER</div>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#102F50] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'carousel' ? (
            <CarouselManagement />
          ) : (
            <>
              {/* Header banner */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                    {t('admin.dashboardTitle', 'प्रबंधन डैशबोर्ड')}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {t('admin.dashboardSubtitle', 'शासकीय शिक्षक संगठन मध्यप्रदेश — केंद्रीय प्रबंधन प्रणाली')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('carousel')}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Image className="w-3.5 h-3.5" />
                    <span>{t('admin.manageCarouselBtn')}</span>
                  </button>
                  <button
                    onClick={() => alert(t('admin.table.exportAlert'))}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t('admin.table.export', 'एक्सेल निर्यात')}</span>
                  </button>
                </div>
              </div>

          {/* 6 Key Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            {/* Total Members */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">{t('admin.stats.totalMembers')}</span>
                <Users className="w-4 h-4 text-[#102F50]" />
              </div>
              <div className="text-2xl font-bold text-[#102F50]">{stats.total}</div>
              <div className="text-[10px] text-emerald-600 font-medium mt-1">{t('admin.stats.totalMembersSub')}</div>
            </div>

            {/* Office Bearer Subscriptions */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">{t('admin.stats.officeBearerSub', 'पदाधिकारी सदस्यताएँ')}</span>
                <CreditCard className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-700">{stats.officeBearer}</div>
              <div className="text-[10px] text-slate-500 mt-1">{t('admin.stats.officeBearerSubLabel', '₹1000 प्रति सदस्य')}</div>
            </div>

            {/* Yearly Subscriptions */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">{t('admin.stats.yearlySub')}</span>
                <CheckCircle className="w-4 h-4 text-[#049B70]" />
              </div>
              <div className="text-2xl font-bold text-[#049B70]">{stats.yearly}</div>
              <div className="text-[10px] text-slate-500 mt-1">{t('admin.stats.yearlySubLabel')}</div>
            </div>

            {/* Active Members */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">{t('admin.stats.activeMembers')}</span>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
              <div className="text-[10px] text-emerald-700 mt-1">{t('admin.stats.activeMembersSub')}</div>
            </div>

            {/* Pending Registrations */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">{t('admin.stats.pendingReg')}</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
              <div className="text-[10px] text-amber-700 mt-1">{t('admin.stats.pendingRegSub')}</div>
            </div>

            {/* Revenue Demo */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold">{t('admin.stats.revenue')}</span>
                <TrendingUp className="w-4 h-4 text-[#102F50]" />
              </div>
              <div className="text-2xl font-bold text-slate-900">₹{stats.totalDemoRevenue}</div>
              <div className="text-[10px] text-slate-500 mt-1">{t('admin.stats.revenueSub')}</div>
            </div>
          </div>

          {/* Organizational Hierarchy Scope Bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#102F50]" />
                <span className="font-bold text-slate-800">{t('admin.hierarchyTitle')}:</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-[#102F50] font-semibold">
                  STATE: MP
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  55 DISTRICTS
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  313 BLOCKS
                </span>
                <span>→</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#049B70] font-bold">
                  MEMBERS
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {t('admin.hierarchyNote')}
              </div>
            </div>
          </div>

          {/* Member Records Table Card with Search & Filters */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            {/* Table Header & Controls */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  {t('admin.table.title', 'सदस्य रिकॉर्ड एवं सत्यापन सूची')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('admin.table.subtitle', { count: filteredMembers.length })}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('admin.table.searchPlaceholder')}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50] w-48 sm:w-60"
                  />
                </div>

                {/* District Filter */}
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50] bg-white"
                >
                  <option value="ALL">{t('admin.table.allDistricts')}</option>
                  {MP_DISTRICTS.map((d) => (
                    <option key={d.district} value={d.district}>
                      {language === 'hi' ? d.districtHi : d.district} ({language === 'hi' ? d.district : d.districtHi})
                    </option>
                  ))}
                </select>

                {/* Plan Filter */}
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50] bg-white"
                >
                  <option value="ALL">{t('admin.table.allPlans')}</option>
                  <option value="office_bearer">{t('admin.table.officeBearer', 'पदाधिकारी (₹1000)')}</option>
                  <option value="yearly">{t('admin.table.yearly', 'वार्षिक (₹120)')}</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#102F50] bg-white"
                >
                  <option value="ALL">{t('admin.table.allStatus')}</option>
                  <option value="ACTIVE">{t('admin.table.active')}</option>
                  <option value="PENDING">{t('admin.table.pending')}</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">{t('admin.table.regNo', 'पंजीयन क्र.')}</th>
                    <th className="px-4 py-3">{t('admin.table.name', 'शिक्षक का नाम')}</th>
                    <th className="px-4 py-3">{t('admin.table.district', 'ज़िला / ब्लॉक')}</th>
                    <th className="px-4 py-3">{t('admin.table.school', 'संस्था / शाला')}</th>
                    <th className="px-4 py-3">{t('admin.table.plan', 'योजना')}</th>
                    <th className="px-4 py-3">{t('admin.table.status', 'स्थिति')}</th>
                    <th className="px-4 py-3 text-right">{t('admin.table.action', 'कार्यवाही')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMembers.length > 0 ? (
                    paginatedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-mono font-bold text-[#102F50]">
                          {member.registrationNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{member.fullName}</div>
                          <div className="text-[11px] text-slate-500">{member.designation}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{member.district}</div>
                          <div className="text-[11px] text-slate-500">{member.block}</div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={member.schoolName}>
                          {member.schoolName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              member.plan === 'yearly'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {member.plan === 'yearly'
                              ? (language === 'hi' ? 'वार्षिक (₹120)' : 'Yearly (₹120)')
                              : (language === 'hi' ? 'पदाधिकारी (₹1000)' : 'Office Bearer (₹1000)')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {member.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              {t('common.active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {t('common.pending')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedMemberModal(member)}
                              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600 hover:text-[#102F50] transition cursor-pointer"
                              title={t('admin.table.view')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                        {t('admin.table.empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                {t('admin.table.paginationText', { page: currentPage, total: totalPages, count: filteredMembers.length })}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
                      currentPage === i + 1
                        ? 'bg-[#102F50] text-white'
                        : 'border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
      </div>

      {/* Member Details Modal */}
      {selectedMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-[#102F50] font-serif">
                {t('admin.modal.title')}
              </h3>
              <button
                onClick={() => setSelectedMemberModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 mb-6">
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.regNo')}</span>
                <span className="col-span-2 font-mono font-bold text-[#102F50]">
                  {selectedMemberModal.registrationNumber}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.name')}</span>
                <span className="col-span-2 font-bold">{selectedMemberModal.fullName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.fatherName')}</span>
                <span className="col-span-2">{selectedMemberModal.fatherHusbandName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.mobile')}</span>
                <span className="col-span-2 font-mono">{selectedMemberModal.mobile}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.email')}</span>
                <span className="col-span-2">{selectedMemberModal.email || '—'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.designation')}</span>
                <span className="col-span-2 font-semibold text-emerald-700">
                  {selectedMemberModal.designation}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.school')}</span>
                <span className="col-span-2">{selectedMemberModal.schoolName}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.districtBlock')}</span>
                <span className="col-span-2">
                  {selectedMemberModal.district} ({selectedMemberModal.block})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.empCode')}</span>
                <span className="col-span-2 font-mono">{selectedMemberModal.employeeId || '—'}</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.plan')}</span>
                <span className="col-span-2 font-bold text-[#049B70]">
                  {selectedMemberModal.plan === 'yearly'
                    ? (language === 'hi' ? 'वार्षिक (₹120)' : 'Yearly (₹120)')
                    : (language === 'hi' ? 'पदाधिकारी (₹1000)' : 'Office Bearer (₹1000)')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="font-semibold text-slate-500">{t('admin.modal.status')}</span>
                <span className="col-span-2 font-bold">
                  {selectedMemberModal.status === 'ACTIVE' ? t('common.active') : t('common.pending')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedMemberModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                {t('admin.modal.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
