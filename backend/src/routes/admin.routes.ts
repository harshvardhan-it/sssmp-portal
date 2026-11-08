import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import { USER_ROLES } from '../models/types';
import { AdminError, createAdmin, getAdmin, listAdmins, updateAdmin, updateAdminStatus } from '../services/admin.service';
import { ScopeError } from '../services/admin-scope.service';

const router = Router();
const adminRoles = USER_ROLES.filter((role) => role !== 'MEMBER');
const adminFields = {
  email: z.string().email().optional(),
  mobile: z.string().regex(/^\d{10}$/).optional(),
  password: z.string().min(8).max(128),
  role: z.enum(adminRoles),
  districtId: z.string().optional(),
  blockId: z.string().optional(),
} as const;
export const createAdminSchema = z.object(adminFields).strict().refine((value) => value.email || value.mobile, { message: 'Email or mobile is required' });
export const updateAdminSchema = z.object(adminFields).partial().strict();
export const adminStatusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) }).strict();

function actor(request: Parameters<typeof authenticate>[0]) {
  const user = request.authenticatedUser!;
  return { id: user.id, role: user.role, districtId: user.districtId, blockId: user.blockId };
}

function handleAdminError(error: unknown, response: Parameters<typeof sendError>[0]): boolean {
  if (error instanceof ScopeError) {
    sendError(response, 403, 'FORBIDDEN', error.message);
    return true;
  }
  if (error instanceof AdminError) {
    const status = error.code === 'ADMIN_NOT_FOUND' ? 404 : error.code === 'DUPLICATE_ADMIN' ? 409 : 422;
    sendError(response, status, error.code, error.message);
    return true;
  }
  return false;
}

router.use(authenticate, requireRoles('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'));
router.get('/', async (request, response, next) => {
  try { response.json({ success: true, data: await listAdmins(actor(request)) }); }
  catch (error) { if (!handleAdminError(error, response)) next(error); }
});
router.post('/', async (request, response, next) => {
  try { response.status(201).json({ success: true, data: await createAdmin(actor(request), createAdminSchema.parse(request.body)) }); }
  catch (error) { if (!handleAdminError(error, response)) next(error); }
});
router.get('/:adminId', async (request, response, next) => {
  try { response.json({ success: true, data: await getAdmin(actor(request), request.params.adminId) }); }
  catch (error) { if (!handleAdminError(error, response)) next(error); }
});
router.patch('/:adminId', async (request, response, next) => {
  try { response.json({ success: true, data: await updateAdmin(actor(request), request.params.adminId, updateAdminSchema.parse(request.body)) }); }
  catch (error) { if (!handleAdminError(error, response)) next(error); }
});
router.patch('/:adminId/status', async (request, response, next) => {
  try { response.json({ success: true, data: await updateAdminStatus(actor(request), request.params.adminId, adminStatusSchema.parse(request.body).status) }); }
  catch (error) { if (!handleAdminError(error, response)) next(error); }
});

export default router;
