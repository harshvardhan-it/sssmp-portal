import { Router } from 'express';
import { verifyCashfreeWebhookSignature } from '../services/cashfree.service';
import { receiveCashfreeWebhook } from '../services/cashfree-webhook.service';

const router = Router();
router.post('/', async (request, response, next) => {
  try {
    if (!Buffer.isBuffer(request.body)) {
      response.status(400).json({ success: false, error: { code: 'RAW_BODY_REQUIRED', message: 'Raw webhook body is required' } });
      return;
    }
    const signature = request.header('x-webhook-signature') ?? '';
    const timestamp = request.header('x-webhook-timestamp') ?? '';
    if (!verifyCashfreeWebhookSignature(request.body, signature, timestamp)) {
      response.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Cashfree webhook signature is invalid' } });
      return;
    }
    const payload = JSON.parse(request.body.toString('utf8')) as Record<string, unknown>;
    await receiveCashfreeWebhook(request.body, payload, signature, timestamp);
    response.status(200).json({ success: true, data: { received: true } });
  } catch (error) { next(error); }
});
export default router;
