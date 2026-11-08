import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { handleError } from './middleware/error-response';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import locationRoutes from './routes/location.routes';
import memberRoutes from './routes/member.routes';
import adminRoutes from './routes/admin.routes';
import adminLocationRoutes from './routes/admin-location.routes';
import membershipRoutes from './routes/membership.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import adminPaymentRoutes from './routes/admin-payment.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin.split(',').map((value) => value.trim()) }));
app.use(`${env.apiPrefix}/webhooks/razorpay`, express.raw({ type: 'application/json', limit: '256kb' }), webhookRoutes);
app.use(express.json({ limit: '1mb' }));
app.use(`${env.apiPrefix}/health`, healthRoutes);
app.use(`${env.apiPrefix}/auth`, authRoutes);
app.use(`${env.apiPrefix}/locations`, locationRoutes);
app.use(`${env.apiPrefix}/members`, memberRoutes);
app.use(`${env.apiPrefix}/admins`, adminRoutes);
app.use(`${env.apiPrefix}/admin/locations`, adminLocationRoutes);
app.use(`${env.apiPrefix}/memberships`, membershipRoutes);
app.use(`${env.apiPrefix}/payments`, paymentRoutes);
app.use(`${env.apiPrefix}/admin/payments`, adminPaymentRoutes);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'SSSMP Portal API' });
});

app.use(handleError);

export default app;
