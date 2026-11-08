import { Types } from 'mongoose';
import { AdminScope } from './admin-scope.service';

export function memberScopeFilter(scope: AdminScope): Record<string, unknown> {
  if (scope.role === 'SUPER_ADMIN' || scope.role === 'STATE_ADMIN') return {};
  if (scope.role === 'DISTRICT_ADMIN' && scope.districtId) {
    return { districtId: new Types.ObjectId(scope.districtId) };
  }
  if (scope.role === 'BLOCK_ADMIN' && scope.blockId) {
    return { blockId: new Types.ObjectId(scope.blockId) };
  }
  if (scope.role === 'DISTRICT_ADMIN' || scope.role === 'BLOCK_ADMIN') return { _id: null };
  return { userId: new Types.ObjectId(scope.id) };
}

export function districtScopeFilter(scope: AdminScope): Record<string, unknown> {
  if (scope.role === 'SUPER_ADMIN' || scope.role === 'STATE_ADMIN') return {};
  if (!scope.districtId) return { _id: null };
  return { _id: new Types.ObjectId(scope.districtId) };
}

export function blockScopeFilter(scope: AdminScope): Record<string, unknown> {
  if (scope.role === 'SUPER_ADMIN' || scope.role === 'STATE_ADMIN') return {};
  if (scope.role === 'DISTRICT_ADMIN' && scope.districtId) {
    return { districtId: new Types.ObjectId(scope.districtId) };
  }
  if (scope.role === 'BLOCK_ADMIN' && scope.blockId) {
    return { _id: new Types.ObjectId(scope.blockId) };
  }
  return { _id: null };
}
