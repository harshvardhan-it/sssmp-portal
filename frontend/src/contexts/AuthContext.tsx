import React, { createContext, startTransition, useContext, useState, useEffect } from 'react';
import type { MemberRecord } from '../types';
import { INITIAL_MOCK_MEMBERS } from '../data/mockMembers';
import { ApiRequestError, fetchCurrentMember, fetchCurrentUser, login as loginApi, logout as logoutApi, type BackendUser } from '../lib/api';

interface AuthContextType {
  currentMember: MemberRecord | null;
  backendUser: BackendUser | null;
  isBackendAuthenticated: boolean;
  isAuthLoading: boolean;
  authRestoreError: string | null;
  authRestoreBlocked: boolean;
  allMembers: MemberRecord[];
  loginMember: (identifier: string, _mobile: string, password?: string) => Promise<boolean>;
  establishMemberSession: (token: string, user: BackendUser) => Promise<boolean>;
  logoutMember: () => void;
  loginAdmin: (identifier: string, password: string, role: 'STATE' | 'DISTRICT' | 'BLOCK') => Promise<boolean>;
  logoutAdmin: () => void;
  updateMemberStatus: (id: string, status: 'ACTIVE' | 'PENDING' | 'EXPIRED') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allMembers, setAllMembers] = useState<MemberRecord[]>(() => {
    const saved = localStorage.getItem('sssmp_members');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MOCK_MEMBERS;
      }
    }
    return INITIAL_MOCK_MEMBERS;
  });

  const [currentMember, setCurrentMember] = useState<MemberRecord | null>(null);
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(localStorage.getItem('sssmp_access_token')));
  const [authRestoreError, setAuthRestoreError] = useState<string | null>(null);
  const [authRestoreBlocked, setAuthRestoreBlocked] = useState(false);

  const handleRestoreFailure = (error: unknown) => {
    const rejected = error instanceof ApiRequestError && (error.status === 401 || error.status === 403);
    if (rejected) localStorage.removeItem('sssmp_access_token');
    startTransition(() => {
      setBackendUser(null);
      setCurrentMember(null);
      setAuthRestoreBlocked(!rejected);
      setAuthRestoreError(rejected ? null : error instanceof ApiRequestError ? error.message : 'Your session could not be verified. Please try again.');
    });
  };

  async function restoreAuthenticatedSession(deferStateUpdates = false): Promise<BackendUser> {
    const user = await fetchCurrentUser();
    if (user.accountStatus !== 'ACTIVE') throw new Error('This account is not active');
    let memberRecord: MemberRecord | null = null;
    if (user.role === 'MEMBER') {
      const member = await fetchCurrentMember();
      memberRecord = {
        id: member.id,
        registrationNumber: member.registrationId,
        fullName: member.fullName,
        fatherHusbandName: member.fatherHusbandName ?? '',
        mobile: member.mobile,
        email: member.email ?? '',
        gender: member.gender ?? '',
        district: member.district?.nameEn ?? member.district?.nameHi ?? '',
        block: member.block?.nameEn ?? member.block?.nameHi ?? '',
        schoolName: member.schoolName ?? '',
        designation: member.designation ?? '',
        employeeId: member.employeeId ?? '',
        plan: member.subscriptionPlan ?? 'yearly',
        status: (member.membershipStatus as MemberRecord['status']) ?? 'PENDING',
        joinDate: member.createdAt?.slice(0, 10) ?? '',
        validUntil: '',
        amount: member.subscriptionAmount ?? 120,
      };
    } else if (!['SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'].includes(user.role)) {
      throw new Error('This account cannot access the portal');
    }
    const commitSession = () => {
      setCurrentMember(memberRecord);
      setBackendUser(user);
      setAuthRestoreError(null);
      setAuthRestoreBlocked(false);
    };
    if (deferStateUpdates) startTransition(commitSession);
    else commitSession();
    return user;
  }

  useEffect(() => {
    localStorage.setItem('sssmp_members', JSON.stringify(allMembers));
  }, [allMembers]);

  useEffect(() => {
    const token = localStorage.getItem('sssmp_access_token');
    if (!token) return;
    restoreAuthenticatedSession(true)
      .catch(handleRestoreFailure)
      .finally(() => startTransition(() => setIsAuthLoading(false)));
  }, []);

  const loginMember = async (identifier: string, _mobile: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    const result = await loginApi(identifier.trim(), password);
    if (result.user.role !== 'MEMBER') return false;
    return establishMemberSession(result.token, result.user);
  };

  const establishMemberSession = async (token: string, user: BackendUser): Promise<boolean> => {
    if (user.role !== 'MEMBER') return false;
    localStorage.setItem('sssmp_access_token', token);
    try {
      const restoredUser = await restoreAuthenticatedSession();
      if (restoredUser.role !== 'MEMBER') throw new Error('Member authentication required');
      return true;
    } catch (error) {
      handleRestoreFailure(error);
      throw error;
    }
  };

  const logoutMember = () => {
    void logoutApi().catch(() => undefined);
    setCurrentMember(null);
    setBackendUser(null);
    setAuthRestoreError(null);
    setAuthRestoreBlocked(false);
    setIsAuthLoading(false);
    localStorage.removeItem('sssmp_access_token');
    localStorage.removeItem('sssmp_active_member');
    localStorage.removeItem('sssmp_admin_user');
  };

  const loginAdmin = async (identifier: string, password: string, scope: 'STATE' | 'DISTRICT' | 'BLOCK'): Promise<boolean> => {
    const result = await loginApi(identifier.trim(), password);
    const allowedRoles: Record<typeof scope, string[]> = {
      STATE: ['SUPER_ADMIN', 'STATE_ADMIN'],
      DISTRICT: ['SUPER_ADMIN', 'DISTRICT_ADMIN'],
      BLOCK: ['SUPER_ADMIN', 'BLOCK_ADMIN'],
    };
    if (!allowedRoles[scope].includes(result.user.role)) return false;
    localStorage.setItem('sssmp_access_token', result.token);
    try {
      const user = await restoreAuthenticatedSession();
      return allowedRoles[scope].includes(user.role);
    } catch (error) {
      handleRestoreFailure(error);
      throw error;
    }
  };

  const logoutAdmin = logoutMember;

  const updateMemberStatus = (id: string, status: 'ACTIVE' | 'PENDING' | 'EXPIRED') => {
    setAllMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status } : m))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentMember,
        backendUser,
        isBackendAuthenticated: Boolean(backendUser && localStorage.getItem('sssmp_access_token')),
        isAuthLoading,
        authRestoreError,
        authRestoreBlocked,
        allMembers,
        loginMember,
        establishMemberSession,
        logoutMember,
        loginAdmin,
        logoutAdmin,
        updateMemberStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
