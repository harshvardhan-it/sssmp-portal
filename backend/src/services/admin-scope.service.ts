import { Types } from 'mongoose';
import { UserRole } from '../models/types';

export interface AdminScope {
  id: string;
  role: UserRole;
  districtId?: string;
  blockId?: string;
}

export class ScopeError extends Error {
  constructor(message = 'You are not authorized for this scope') {
    super(message);
    this.name = 'ScopeError';
  }
}

export function assertScopeId(id: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ScopeError(`Invalid ${label} identifier`);
  return new Types.ObjectId(id);
}

export function canAccessDistrict(scope: AdminScope, districtId: string): boolean {
  if (scope.role === 'SUPER_ADMIN' || scope.role === 'STATE_ADMIN') return true;
  return scope.role === 'DISTRICT_ADMIN' && scope.districtId === districtId;
}

export function canAccessBlock(scope: AdminScope, districtId: string, blockId?: string): boolean {
  if (scope.role === 'SUPER_ADMIN' || scope.role === 'STATE_ADMIN') return true;
  if (scope.role === 'DISTRICT_ADMIN') return scope.districtId === districtId;
  return scope.role === 'BLOCK_ADMIN' && scope.blockId === blockId;
}

export function assertCanManageRole(actor: AdminScope, targetRole: UserRole): void {
  if (actor.role === 'SUPER_ADMIN') {
    if (targetRole === 'MEMBER') throw new ScopeError('Administrative accounts must use an administrative role');
    return;
  }
  if (actor.role === 'STATE_ADMIN' && ['DISTRICT_ADMIN', 'BLOCK_ADMIN'].includes(targetRole)) return;
  if (actor.role === 'DISTRICT_ADMIN' && targetRole === 'BLOCK_ADMIN') return;
  throw new ScopeError('You are not authorized to manage this role');
}
