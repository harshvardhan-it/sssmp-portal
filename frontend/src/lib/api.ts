import type { MemberRecord, RegistrationFormData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

export interface LocationBlock {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  verificationStatus: 'VERIFIED' | 'PROVISIONAL';
}

export interface LocationDistrict {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  blocks: LocationBlock[];
}

export interface LocationBlocksResponse {
  district: Omit<LocationDistrict, 'blocks'>;
  blocks: LocationBlock[];
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: { fieldErrors?: Record<string, string[]> };
  };
}

export class ApiRequestError extends Error {
  public readonly code?: string;
  public readonly fieldErrors?: Record<string, string[]>;
  public readonly status?: number;

  constructor(message: string, code?: string, fieldErrors?: Record<string, string[]>, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('sssmp_access_token');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(20_000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: ['Bearer', token].join(' ') } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === 'TimeoutError';
    throw new ApiRequestError(
      timeout ? 'The request took too long. Check your account status before trying again.' : 'The server could not be reached. Check your connection and try again.',
      timeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
    );
  }
  let body: T | ApiErrorBody;
  try {
    body = (await response.json()) as T | ApiErrorBody;
  } catch {
    throw new ApiRequestError('The server returned an unreadable response.', 'INVALID_RESPONSE');
  }
  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ApiRequestError(
      errorBody.error?.message ?? 'Request failed',
      errorBody.error?.code,
      errorBody.error?.details?.fieldErrors,
      response.status,
    );
  }
  return body as T;
}

export interface PaymentRecord {
  id: string;
  membershipId: string;
  renewalRequestId?: string;
  plan: 'OFFICE_BEARER' | 'YEARLY';
  amountPaise: number;
  currency: 'INR';
  provider: 'RAZORPAY' | 'CASHFREE';
  providerOrderId?: string;
  providerPaymentId?: string;
  internalReceipt: string;
  status: string;
  capturedAt?: string;
  refundedAmountPaise: number;
  refundStatus: string;
  createdAt: string;
}

export interface BackendUser {
  id: string;
  email?: string;
  mobile?: string;
  role: string;
  accountStatus: string;
  districtId?: string;
  blockId?: string;
}

export interface BackendMember {
  id: string;
  registrationId: string;
  fullName: string;
  fatherHusbandName?: string;
  dob?: string;
  gender?: string;
  mobile: string;
  email?: string;
  address?: string;
  district?: { id?: string; nameEn?: string; nameHi?: string };
  block?: { id?: string; nameEn?: string; nameHi?: string };
  locationStatus?: 'VERIFIED' | 'LOCATION_PENDING';
  schoolName?: string;
  designation?: string;
  employeeId?: string;
  subscriptionPlan?: 'office_bearer' | 'yearly';
  subscriptionAmount?: number;
  membershipStatus?: string;
  createdAt?: string;
}

export async function login(identifier: string, password: string) {
  const response = await request<{ success: true; data: { token: string; user: BackendUser } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await request<{ success: true; data: { user: BackendUser } }>('/auth/me');
  return response.data.user;
}

export async function fetchCurrentMember() {
  const response = await request<{ success: true; data: { member: BackendMember } }>('/members/me');
  return response.data.member;
}

export async function updateCurrentMember(input: Record<string, unknown>) {
  const response = await request<{ success: true; data: { member: BackendMember } }>('/members/me', { method: 'PATCH', body: JSON.stringify(input) });
  return response.data.member;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<{ success: true; data: { message: string; tokenRevoked: boolean } }>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
}

export async function logout() {
  return request<{ success: true; data: { message: string; tokenRevoked: boolean } }>('/auth/logout', { method: 'POST' });
}

export async function fetchMembership() {
  const response = await request<{ success: true; data: Record<string, unknown> }>('/memberships/me/membership');
  return response.data;
}

export async function fetchMembershipHistory() {
  const response = await request<{ success: true; data: Record<string, unknown>[] }>('/memberships/me/membership/history');
  return response.data;
}

export async function fetchRenewals() {
  const response = await request<{ success: true; data: Record<string, unknown>[] }>('/memberships/me/membership/renewals');
  return response.data;
}

export async function requestRenewal(membershipId: string) {
  const response = await request<{ success: true; data: Record<string, unknown> }>('/memberships/me/membership/renewal', {
    method: 'POST',
    body: JSON.stringify({ membershipId }),
  });
  return response.data;
}

export async function fetchPaymentReceipt(paymentId: string) {
  const response = await request<{ success: true; data: PaymentRecord }>(`/payments/${paymentId}/receipt`);
  return response.data;
}

export async function createPaymentOrder(input: { membershipId?: string; renewalRequestId?: string }) {
  const response = await request<{ success: true; data: { paymentSessionId: string; mode: 'sandbox' | 'production'; payment: PaymentRecord } }>('/payments/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function verifyPayment(input: { cashfreeOrderId: string }) {
  const response = await request<{ success: true; data: PaymentRecord }>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function fetchPaymentHistory() {
  const response = await request<{ success: true; data: PaymentRecord[] }>('/payments/history');
  return response.data;
}

export async function fetchDistricts(): Promise<LocationDistrict[]> {
  const response = await request<{ success: true; data: LocationDistrict[] }>('/locations/districts');
  return response.data.map((district) => ({
    ...district,
    id: String(district.id),
    blocks: district.blocks.map((block) => ({ ...block, id: String(block.id) })),
  }));
}

export async function fetchDistrictBlocks(districtId: string): Promise<LocationBlocksResponse> {
  const response = await request<{ success: true; data: LocationBlocksResponse }>(
    `/locations/districts/${encodeURIComponent(districtId)}/blocks`,
  );
  return {
    district: { ...response.data.district, id: String(response.data.district.id) },
    blocks: response.data.blocks.map((block) => ({ ...block, id: String(block.id) })),
  };
}

export async function submitRegistration(
  formData: RegistrationFormData,
): Promise<{ member: MemberRecord; registrationId: string; membershipStatus: string; locationStatus?: 'VERIFIED' | 'LOCATION_PENDING'; auth: { token: string; user: BackendUser } | null; authenticationRequired?: boolean }> {
  const response = await request<{
    success: true;
    data: {
      registrationId: string;
      membershipStatus: string;
      locationStatus?: 'VERIFIED' | 'LOCATION_PENDING';
      member: MemberRecord;
      auth: { token: string; user: BackendUser } | null;
      authenticationRequired?: boolean;
    };
  }>('/members/register', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
  return response.data;
}
