export const USER_ROLES = [
  'SUPER_ADMIN',
  'STATE_ADMIN',
  'DISTRICT_ADMIN',
  'BLOCK_ADMIN',
  'MEMBER',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = [
  'PENDING',
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const MEMBERSHIP_STATUSES = [
  'PENDING',
  'ACTIVE',
  'EXPIRED',
  'INACTIVE',
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const LOCATION_ASSIGNMENT_STATUSES = ['VERIFIED', 'LOCATION_PENDING'] as const;
export type LocationAssignmentStatus = (typeof LOCATION_ASSIGNMENT_STATUSES)[number];

export const APPLICATION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'CANCELLED',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const RENEWAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE'] as const;

export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'CREATED',
  'ORDER_CREATED',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REFUND_STATUSES = ['NONE', 'PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const SUBSCRIPTION_PLANS = ['OFFICE_BEARER', 'YEARLY'] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_AMOUNTS: Record<SubscriptionPlan, number> = {
  OFFICE_BEARER: 1000,
  YEARLY: 120,
};
