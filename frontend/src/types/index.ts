export type Language = 'hi' | 'en';

export type PlanType = 'office_bearer' | 'yearly';

export interface PlanInfo {
  id: PlanType;
  titleHi: string;
  titleEn: string;
  price: number;
  durationHi: string;
  durationEn: string;
  popular?: boolean;
  featuresHi: string[];
  featuresEn: string[];
}

export interface RegistrationFormData {
  // Step 1: Personal Information
  fullName: string;
  fatherHusbandName: string;
  dob: string;
  gender: string;
  mobile: string;
  email: string;
  address: string;

  // Step 2: Posting and Institution Details
  district: string; // MongoDB District _id
  block: string; // MongoDB Block _id, optional while verified block data is unavailable
  schoolName: string;
  designation: string;
  employeeId: string;

  // Step 3: Subscription & Account
  selectedPlan: PlanType;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export interface MemberRecord {
  id: string;
  registrationNumber: string;
  fullName: string;
  fatherHusbandName: string;
  mobile: string;
  email: string;
  gender: string;
  district: string;
  block: string;
  schoolName: string;
  designation: string;
  employeeId: string;
  plan: PlanType;
  status: 'ACTIVE' | 'PENDING' | 'APPROVED' | 'EXPIRED' | 'SUSPENDED' | 'REJECTED' | 'INACTIVE';
  joinDate: string;
  validUntil: string;
  amount: number;
  locationStatus?: 'VERIFIED' | 'LOCATION_PENDING';
}

export interface NoticeItem {
  id: string;
  title: string;
  titleHi: string;
  date: string;
  department: string;
  departmentHi: string;
  fileSize: string;
  isNew?: boolean;
  category: 'circular' | 'order' | 'press' | 'event';
  description?: string;
  descriptionHi?: string;
}

export interface LeaderItem {
  id: string;
  name: string;
  nameHi: string;
  role: string;
  roleHi: string;
  level: 'state' | 'division' | 'district';
  region: string;
  regionHi: string;
  contact?: string;
  bioHi: string;
  bioEn: string;
  image?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  titleHi: string;
  date: string;
  location: string;
  locationHi: string;
  category: string;
  imageUrl: string;
}

export interface CarouselSlide {
  id: string;
  imageUrl: string;
  titleHi: string;
  titleEn: string;
  captionHi: string;
  captionEn: string;
  isActive: boolean;
  order: number;
}
