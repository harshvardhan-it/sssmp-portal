import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import { PaymentError, getPaymentForScope, listPaymentsForScope, refundPayment } from '../services/payment.service';
import { ScopeError } from '../services/admin-scope.service';

const router = Router();
const refundSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
  reason: z.string().trim().min(1).max(500),
}).strict();

function actor(request: Parameters<typeof authenticate>[0]) {
  const user = request.authenticatedUser!;
  return { id: user.id, role: user.role, districtId: user.districtId, blockId: user.blockId };
}

function param(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function handle(error: unknown, response: Parameters<typeof sendError>[0]): boolean {
  if (error instanceof ScopeError) {
    sendError(response, 403, 'FORBIDDEN', error.message);
    return true;
  }
  if (error instanceof PaymentError) {
    const status = error.code === 'PAYMENT_NOT_FOUND' ? 404 : error.code === 'PAYMENT_CONFLICT' ? 409 : 422;
    sendError(response, status, error.code, error.message);
    return true;
  }
  return false;
}

router.use(authenticate, requireRoles('SUPER_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_ADMIN'));

router.get('/', async (request, response, next) => {
  try {
    response.json({ success: true, data: await listPaymentsForScope(actor(request)) });
  } catch (error) {
    if (!handle(error, response)) next(error);
  }
});

router.get('/:paymentId', async (request, response, next) => {
  try {
    response.json({ success: true, data: await getPaymentForScope(actor(request), param(request.params.paymentId)) });
  } catch (error) {
    if (!handle(error, response)) next(error);
  }
});

router.post('/:paymentId/refund', async (request, response, next) => {
  try {
    const input = refundSchema.parse(request.body);
    response.json({
      success: true,
      data: await refundPayment(actor(request), param(request.params.paymentId), input.amountPaise, input.reason),
    });
  } catch (error) {
    if (!handle(error, response)) next(error);
  }
});

export default router;
