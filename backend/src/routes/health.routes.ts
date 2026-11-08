import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    message: 'SSSMP Portal API is running',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
