import { Router } from 'express';
import { receiveWebhook } from '../services/payment-webhook.service';

const router = Router();

router.post('/', async (request, response, next) => {
  try {
    const rawBody = request.body;
    if (!Buffer.isBuffer(rawBody)) {
      response.status(400).json({ success: false, error: { code: 'RAW_BODY_REQUIRED', message: 'Raw webhook body is required' } });
      return;
    }
    const signature = request.header('x-razorpay-signature');
    if (!signature) {
      response.status(400).json({ success: false, error: { code: 'SIGNATURE_REQUIRED', message: 'Webhook signature is required' } });
      return;
    }
    await receiveWebhook(rawBody, signature);
    response.status(200).json({ success: true, data: { received: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
