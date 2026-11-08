import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { ensureLocationData } from './services/location-bootstrap.service';

async function start(): Promise<void> {
  try {
    await connectDatabase();
    await ensureLocationData();
    console.log('Location data ready: 55 Madhya Pradesh districts and local block snapshot loaded');
    app.listen(env.port, () => {
      console.log(`API listening at http://localhost:${env.port}`);
      console.log(`Health: http://localhost:${env.port}${env.apiPrefix}/health`);
    });
  } catch (error) {
    console.error('Backend startup failed:', error);
    process.exit(1);
  }
}

void start();
