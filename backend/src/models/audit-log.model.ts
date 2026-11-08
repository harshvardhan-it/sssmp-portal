import { HydratedDocument, Schema, Types, model } from 'mongoose';

export const AUDIT_ACTIONS = [
  'ADMIN_CREATED',
  'ADMIN_UPDATED',
  'ADMIN_ROLE_CHANGED',
  'ADMIN_SCOPE_CHANGED',
  'ADMIN_ACTIVATED',
  'ADMIN_DEACTIVATED',
  'DISTRICT_CREATED',
  'DISTRICT_UPDATED',
  'DISTRICT_ACTIVATED',
  'DISTRICT_DEACTIVATED',
  'BLOCK_CREATED',
  'BLOCK_UPDATED',
  'BLOCK_ACTIVATED',
  'BLOCK_DEACTIVATED',
  'MEMBER_REGISTERED',
  'MEMBER_PROFILE_UPDATED',
  'MEMBER_PASSWORD_CHANGED',
  'MEMBER_LOCATION_ASSIGNED',
  'SUPER_ADMIN_BOOTSTRAPPED',
  'MEMBERSHIP_CREATED',
  'MEMBERSHIP_APPROVED',
  'MEMBERSHIP_REJECTED',
  'MEMBERSHIP_ACTIVATED',
  'MEMBERSHIP_EXPIRED',
  'MEMBERSHIP_SUSPENDED',
  'RENEWAL_REQUESTED',
  'RENEWAL_APPROVED',
  'RENEWAL_REJECTED',
  'RENEWAL_ACTIVATED',
  'PAYMENT_ORDER_CREATED',
  'PAYMENT_AUTHORIZED',
  'PAYMENT_CAPTURED',
  'PAYMENT_FAILED',
  'PAYMENT_VERIFICATION_FAILED',
  'PAYMENT_REFUND_INITIATED',
  'PAYMENT_REFUNDED',
  'PAYMENT_PARTIALLY_REFUNDED',
  'PAYMENT_WEBHOOK_RECEIVED',
  'PAYMENT_WEBHOOK_PROCESSING_FAILED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLog {
  actorUserId: Types.ObjectId;
  action: AuditAction;
  targetEntityType: 'USER' | 'DISTRICT' | 'BLOCK' | 'MEMBER' | 'MEMBERSHIP' | 'RENEWAL' | 'PAYMENT';
  targetEntityId: Types.ObjectId;
  metadata?: Record<string, string | boolean | null>;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const SYSTEM_ACTOR_ID = new Types.ObjectId('000000000000000000000000');

const auditLogSchema = new Schema<AuditLog>(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    targetEntityType: { type: String, enum: ['USER', 'DISTRICT', 'BLOCK', 'MEMBER', 'MEMBERSHIP', 'RENEWAL', 'PAYMENT'], required: true },
    targetEntityId: { type: Schema.Types.ObjectId, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

auditLogSchema.index({ actorUserId: 1, createdAt: -1 });

export const AuditLog = model<AuditLog>('AuditLog', auditLogSchema);
