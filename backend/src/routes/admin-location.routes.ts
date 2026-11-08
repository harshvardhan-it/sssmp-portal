import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import {
  createBlock,
  createDistrict,
  getAdminDistrict,
  listAdminBlocks,
  listAdminDistricts,
  LocationAdminError,
  updateBlock,
  updateDistrict,
  assignMemberBlock,
  listUnassignedMembers,
} from '../services/location-admin.service';
import { ScopeError } from '../services/admin-scope.service';

const router = Router();
const code = z.string().regex(/^[A-Z0-9_-]+$/).transform((value) => value.toUpperCase());
export const districtAdminSchema = z.object({
  nameEn: z.string().trim().min(1).max(100),
  nameHi: z.string().trim().min(1).max(100),
  code,
  isActive: z.boolean().optional(),
}).strict();
export const blockAdminSchema = districtAdminSchema.extend({ districtId: z.string().regex(/^[a-f\d]{24}$/i) });
const updateDistrictSchema = districtAdminSchema.partial().strict();
const updateBlockSchema = blockAdminSchema.partial().strict();

function actor(request: Parameters<typeof authenticate>[0]) {
  const user = request.authenticatedUser!;
  return { id: user.id, role: user.role, districtId: user.districtId, blockId: user.blockId };
}

function handleLocationError(error: unknown, response: Parameters<typeof sendError>[0]): boolean {
  if (error instanceof ScopeError) {
    sendError(response, 403, 'FORBIDDEN', error.message);
    return true;
  }
  if (error instanceof LocationAdminError) {
    const status = error.code === 'LOCATION_NOT_FOUND' || error.code === 'MEMBER_NOT_FOUND' ? 404 : error.code === 'DUPLICATE_LOCATION' ? 409 : 422;
    sendError(response, status, error.code, error.message);
    return true;
  }
  return false;
}

router.use(authenticate, requireRoles('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN'));
router.get('/districts', async (request, response, next) => {
  try { response.json({ success: true, data: await listAdminDistricts(actor(request)) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.get('/members/unassigned', async (request, response, next) => {
  try { response.json({ success: true, data: await listUnassignedMembers(actor(request)) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.patch('/members/:memberId/location', async (request, response, next) => {
  try {
    const input = z.object({ blockId: z.string().regex(/^[a-f\d]{24}$/i) }).strict().parse(request.body);
    response.json({ success: true, data: await assignMemberBlock(actor(request), request.params.memberId, input.blockId) });
  } catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.post('/districts', async (request, response, next) => {
  try { response.status(201).json({ success: true, data: await createDistrict(actor(request), districtAdminSchema.parse(request.body)) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.get('/districts/:districtId', async (request, response, next) => {
  try { response.json({ success: true, data: await getAdminDistrict(actor(request), request.params.districtId) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.patch('/districts/:districtId', async (request, response, next) => {
  try { response.json({ success: true, data: await updateDistrict(actor(request), request.params.districtId, updateDistrictSchema.parse(request.body)) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.get('/districts/:districtId/blocks', async (request, response, next) => {
  try { response.json({ success: true, data: await listAdminBlocks(actor(request), request.params.districtId) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.post('/blocks', async (request, response, next) => {
  try { response.status(201).json({ success: true, data: await createBlock(actor(request), blockAdminSchema.parse(request.body)) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});
router.patch('/blocks/:blockId', async (request, response, next) => {
  try { response.json({ success: true, data: await updateBlock(actor(request), request.params.blockId, updateBlockSchema.parse(request.body)) }); }
  catch (error) { if (!handleLocationError(error, response)) next(error); }
});

export default router;
