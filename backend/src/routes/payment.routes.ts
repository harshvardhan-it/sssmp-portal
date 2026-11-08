import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import {
  createPaymentOrder,
  getOwnPayment,
  listOwnPayments,
  PaymentError,
  verifyPayment,
} from '../services/payment.service';
import { ScopeError } from '../services/admin-scope.service';

const router = Router();
const orderSchema = z.object({
  membershipId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  renewalRequestId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
}).strict();
const verifySchema = z.object({
  cashfreeOrderId: z.string().min(3).max(50),
}).strict();

function routeParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function handleError(error: unknown, response: Parameters<typeof sendError>[0]): boolean {
  if (error instanceof ScopeError) {
    sendError(response, 403, 'FORBIDDEN', error.message);
    return true;
  }
  if (error instanceof PaymentError) {
    const status = error.code === 'PAYMENT_NOT_FOUND' ? 404 :
      error.code === 'PAYMENT_CONFLICT' ? 409 :
        error.code === 'PAYMENT_OWNERSHIP' ? 403 : 422;
    sendError(response, status, error.code, error.message);
    return true;
  }
  return false;
}

function memberActor(request: Parameters<typeof authenticate>[0]) {
  const user = request.authenticatedUser!;
  return {
    id: user.id,
    role: user.role,
    districtId: user.districtId,
    blockId: user.blockId,
  };
}

router.post('/orders', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try {
    const input = orderSchema.parse(request.body);
    response.status(201).json({ success: true, data: await createPaymentOrder(memberActor(request), input) });
  } catch (error) {
    if (!handleError(error, response)) next(error);
  }
});

router.post('/verify', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try {
    const input = verifySchema.parse(request.body);
    response.json({ success: true, data: await verifyPayment(memberActor(request), input) });
  } catch (error) {
    if (!handleError(error, response)) next(error);
  }
});

router.get('/history', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try {
    response.json({ success: true, data: await listOwnPayments(memberActor(request)) });
  } catch (error) {
    if (!handleError(error, response)) next(error);
  }
});

router.get('/:paymentId/receipt', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try {
    const payment = await getOwnPayment(memberActor(request), routeParam(request.params.paymentId));
    if (payment.status !== 'CAPTURED') {
      sendError(response, 422, 'RECEIPT_UNAVAILABLE', 'A receipt is available only for captured payments');
      return;
    }
    response.json({ success: true, data: payment });
  } catch (error) {
    if (!handleError(error, response)) next(error);
  }
});

export default router;
