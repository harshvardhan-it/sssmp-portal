import assert from 'node:assert/strict';
import { test, beforeEach, after } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/sssmp_auth_tests';
process.env.JWT_SECRET = 'test-secret-that-is-only-used-by-isolated-tests';
process.env.JWT_EXPIRES_IN = '1h';

// Require after test configuration is set because the runtime config is loaded at import time.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { default: app } = require('./app') as { default: import('express').Express };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { User, AuditLog } = require('./models') as typeof import('./models');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authenticate, requireRoles } = require('./middleware/auth.middleware') as typeof import('./middleware/auth.middleware');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resetLoginRateLimit } = require('./middleware/login-rate-limit.middleware') as typeof import('./middleware/login-rate-limit.middleware');

interface FakeUser {
  id: string;
  email: string;
  mobile: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'STATE_ADMIN' | 'DISTRICT_ADMIN' | 'BLOCK_ADMIN' | 'MEMBER';
  accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  lastLoginAt?: Date;
  sessionVersion: number;
}

const passwordHash = '$2b$04$5WvcZEt9StsZsaJaX3NpCOqLoXlMqd7sXRREGwSO5YE1srNN5e89i';
let currentUser: FakeUser | null;

function query(value: FakeUser | null) {
  const promise = Promise.resolve(value);
  return {
    select: () => promise,
    then: promise.then.bind(promise),
  };
}

const userModel = User as unknown as {
  findOne: () => ReturnType<typeof query>;
  findById: () => ReturnType<typeof query>;
  updateOne: () => Promise<{ matchedCount: number }>;
};
const auditModel = AuditLog as unknown as { create: (...args: unknown[]) => Promise<unknown> };
const originalAuditCreate = auditModel.create;

userModel.findOne = () => query(currentUser);
userModel.findById = () => query(currentUser);
userModel.updateOne = async (_filter?: unknown, update?: unknown) => {
  const change = update as { $inc?: { sessionVersion?: number }; $set?: { passwordHash?: string } } | undefined;
  if (change?.$inc?.sessionVersion) currentUser!.sessionVersion += change.$inc.sessionVersion;
  if (change?.$set?.passwordHash) currentUser!.passwordHash = change.$set.passwordHash;
  return { matchedCount: 1 };
};

app.get('/role-test', authenticate, requireRoles('SUPER_ADMIN'), (_request, response) => {
  response.json({ success: true });
});

beforeEach(() => {
  resetLoginRateLimit();
  currentUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'member@example.com',
    mobile: '9876543210',
    passwordHash,
    role: 'MEMBER',
    accountStatus: 'ACTIVE',
    sessionVersion: 0,
  };
  auditModel.create = async () => ({});
});

after(() => {
  auditModel.create = originalAuditCreate;
  delete process.env.MONGODB_URI;
  delete process.env.JWT_SECRET;
  delete process.env.JWT_EXPIRES_IN;
});

test('logs in with valid credentials and never exposes passwordHash', async () => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: 'member@example.com', password: 'password123' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.email, 'member@example.com');
  assert.equal(response.body.data.user.passwordHash, undefined);
  assert.equal(typeof response.body.data.token, 'string');
  const tokenPayload = jwt.decode(response.body.data.token) as jwt.JwtPayload;
  assert.equal(tokenPayload.sub, currentUser!.id);
  assert.equal(tokenPayload.role, 'MEMBER');
  assert.equal(tokenPayload.sessionVersion, currentUser!.sessionVersion);
});

test('issues the normal verified JWT contract for an administrator login too', async () => {
  currentUser!.role = 'DISTRICT_ADMIN';
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: 'member@example.com', password: 'password123' });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.role, 'DISTRICT_ADMIN');
  assert.equal(response.body.data.user.passwordHash, undefined);
  const claims = jwt.decode(response.body.data.token) as jwt.JwtPayload;
  assert.equal(claims.sub, currentUser!.id);
  assert.equal(claims.role, 'DISTRICT_ADMIN');
  assert.equal(claims.sessionVersion, currentUser!.sessionVersion);
});

test('rejects a wrong password with a generic invalid-credentials response', async () => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: 'member@example.com', password: 'wrong-password' });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body.error, {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid credentials',
  });
});

test('rejects an inactive account with the same generic invalid-credentials response', async () => {
  currentUser!.accountStatus = 'INACTIVE';
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: 'member@example.com', password: 'password123' });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
});

test('rejects missing, invalid, and expired bearer tokens', async () => {
  const missing = await request(app).get('/api/v1/auth/me');
  assert.equal(missing.status, 401);
  assert.equal(missing.body.error.code, 'AUTHENTICATION_REQUIRED');

  const invalid = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', 'Bearer not-a-jwt');
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error.code, 'INVALID_TOKEN');

  const expiredToken = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, {
    subject: 'user-1',
    expiresIn: -1,
  });
  const expired = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${expiredToken}`);
  assert.equal(expired.status, 401);
  assert.equal(expired.body.error.code, 'TOKEN_EXPIRED');
});

test('loads the authenticated user and enforces role authorization', async () => {
  const token = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, {
    subject: 'user-1',
    expiresIn: '1h',
  });

  const me = await request(app)
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.data.user.role, 'MEMBER');
  assert.equal(me.body.data.user.passwordHash, undefined);

  const forbidden = await request(app)
    .get('/role-test')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.body.error.code, 'FORBIDDEN');

  currentUser!.role = 'SUPER_ADMIN';
  const allowed = await request(app)
    .get('/role-test')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(allowed.status, 200);
});

test('logout revokes the current user session version', async () => {
  const token = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, {
    subject: 'user-1',
    expiresIn: '1h',
  });

  const response = await request(app)
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.tokenRevoked, true);
});

test('a revoked JWT is rejected after logout', async () => {
  const token = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, { subject: 'user-1', expiresIn: '1h' });
  const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
  assert.equal(logout.status, 200);
  const rejected = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(rejected.status, 401);
  assert.equal(rejected.body.error.code, 'INVALID_TOKEN');
});

test('password change verifies the current password and revokes the old JWT', async () => {
  const token = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, { subject: 'user-1', expiresIn: '1h' });
  const changed = await request(app).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123', newPassword: 'newPassword456' });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.data.tokenRevoked, true);
  const oldSession = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(oldSession.status, 401);
  const login = await request(app).post('/api/v1/auth/login').send({ identifier: 'member@example.com', password: 'newPassword456' });
  assert.equal(login.status, 200);
});

test('password change rejects incorrect, reused, weak, missing, and unauthenticated requests', async () => {
  const unauthenticated = await request(app).post('/api/v1/auth/change-password').send({ currentPassword: 'password123', newPassword: 'newPassword456' });
  assert.equal(unauthenticated.status, 401);
  const token = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, { subject: 'user-1', expiresIn: '1h' });
  const incorrect = await request(app).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'wrong-password', newPassword: 'newPassword456' });
  assert.equal(incorrect.status, 401);
  const reused = await request(app).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123', newPassword: 'password123' });
  assert.equal(reused.status, 422);
  const weak = await request(app).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123', newPassword: 'short' });
  assert.equal(weak.status, 422);
  const missing = await request(app).post('/api/v1/auth/change-password').set('Authorization', `Bearer ${token}`).send({ currentPassword: 'password123' });
  assert.equal(missing.status, 422);
});

test('manual membership approval endpoints are not exposed', async () => {
  const token = jwt.sign({ role: 'MEMBER', sessionVersion: 0 }, process.env.JWT_SECRET!, { subject: 'user-1', expiresIn: '1h' });
  const response = await request(app)
    .patch('/api/v1/memberships/507f1f77bcf86cd799439011/approve')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(response.status, 404);
});

test('rejects unknown login fields and rate limits repeated attempts', async () => {
  const validation = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: 'member@example.com', password: 'password123', role: 'SUPER_ADMIN' });
  assert.equal(validation.status, 422);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'member@example.com', password: 'wrong-password' });
  }
  const limited = await request(app)
    .post('/api/v1/auth/login')
    .send({ identifier: 'member@example.com', password: 'wrong-password' });
  assert.equal(limited.status, 429);
});
