import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import {
  getOwnMembership,
  getOwnMembershipHistory,
  getOwnRenewalHistory,
  listMemberships,
  listRenewals,
  MembershipError,
  requestRenewal,
} from '../services/membership.service';
import { ScopeError } from '../services/admin-scope.service';
import { APPLICATION_STATUSES } from '../models/types';

const router = Router();
const statusSchema = z.enum(APPLICATION_STATUSES);

function actor(request: Parameters<typeof authenticate>[0]) {
  const user = request.authenticatedUser!;
  return { id: user.id, role: user.role, districtId: user.districtId, blockId: user.blockId };
}

function handleError(error: unknown, response: Parameters<typeof sendError>[0]): boolean {
  if (error instanceof ScopeError) {
    sendError(response, 403, 'FORBIDDEN', error.message);
    return true;
  }
  if (error instanceof MembershipError) {
    const status = error.code === 'MEMBERSHIP_NOT_FOUND' ? 404 : error.code === 'DUPLICATE_RENEWAL' ? 409 : 422;
    sendError(response, status, error.code, error.message);
    return true;
  }
  return false;
}

router.get('/me/membership', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try { response.json({ success: true, data: await getOwnMembership(actor(request)) }); }
  catch (error) { if (!handleError(error, response)) next(error); }
});

router.get('/me/membership/history', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try { response.json({ success: true, data: await getOwnMembershipHistory(actor(request)) }); }
  catch (error) { if (!handleError(error, response)) next(error); }
});

router.get('/me/membership/renewals', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try { response.json({ success: true, data: await getOwnRenewalHistory(actor(request)) }); }
  catch (error) { if (!handleError(error, response)) next(error); }
});

router.post('/me/membership/renewal', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try {
    const input = z.object({ membershipId: z.string().regex(/^[a-f\d]{24}$/i) }).strict().parse(request.body);
    response.status(201).json({ success: true, data: await requestRenewal(actor(request), input.membershipId) });
  } catch (error) { if (!handleError(error, response)) next(error); }
});

router.get('/', authenticate, requireRoles('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'), async (request, response, next) => {
  try {
    const status = request.query.status ? statusSchema.parse(request.query.status) : undefined;
    response.json({ success: true, data: await listMemberships(actor(request), status) });
  } catch (error) { if (!handleError(error, response)) next(error); }
});

router.get('/renewals', authenticate, requireRoles('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'), async (request, response, next) => {
  try { response.json({ success: true, data: await listRenewals(actor(request)) }); }
  catch (error) { if (!handleError(error, response)) next(error); }
});

export default router;
