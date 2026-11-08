import assert from 'node:assert/strict';
import express from 'express';
import { test } from 'node:test';
import request from 'supertest';
import type { LoginInput, SafeUser } from './services/auth.service';
import type { RegisterMemberInput, RegistrationResult } from './services/registration.service';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/sssmp_registration_route_tests';
process.env.JWT_SECRET = 'registration-route-tests-only-secret';
process.env.JWT_EXPIRES_IN = '1h';

// Load route dependencies after isolated test configuration; only the route boundary is under test here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createRegistrationHandler } = require('./routes/member.routes') as typeof import('./routes/member.routes');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RegistrationError } = require('./services/registration.service') as typeof import('./services/registration.service');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SUBSCRIPTION_AMOUNTS } = require('./models/types') as typeof import('./models/types');
type RegisterMember = (input: RegisterMemberInput) => Promise<RegistrationResult>;
type Login = (input: LoginInput) => Promise<{ token: string; user: SafeUser }>;

const input = {
  fullName: 'Route Contract Member',
  fatherHusbandName: 'Test Parent',
  dob: '1990-01-01',
  mobile: '9123456780',
  email: 'route-contract@example.test',
  district: '507f1f77bcf86cd799439011',
  block: '507f1f77bcf86cd799439012',
  schoolName: 'Test School',
  designation: 'Primary Teacher',
  employeeId: 'ROUTE-TEST-1',
  selectedPlan: 'yearly',
  password: 'testPassword123',
  confirmPassword: 'testPassword123',
  agreeTerms: true,
};
const registration: RegistrationResult = {
  registrationId: 'SSSMP2026123456',
  membershipStatus: 'PENDING',
  locationStatus: 'LOCATION_PENDING',
  subscriptionPlan: 'YEARLY',
  subscriptionAmount: SUBSCRIPTION_AMOUNTS.YEARLY,
  member: {
    id: '507f1f77bcf86cd799439013',
    registrationNumber: 'SSSMP2026123456',
    fullName: input.fullName,
    fatherHusbandName: input.fatherHusbandName,
    dob: input.dob,
    mobile: input.mobile,
    email: input.email,
    district: 'Datia',
    block: 'BHANDER',
    schoolName: input.schoolName,
    designation: input.designation,
    employeeId: input.employeeId,
    plan: 'yearly',
    status: 'PENDING',
    locationStatus: 'LOCATION_PENDING',
    amount: 120,
  },
};

function appWith(registrationFn: RegisterMember, loginFn: Login) {
  const app = express();
  app.use(express.json());
  app.post('/register', createRegistrationHandler({
    registerMember: registrationFn,
    login: loginFn,
  }));
  return app;
}

test('registration returns pending membership and the existing safe JWT login contract', async () => {
  let registrationCalls = 0;
  let loginCalls = 0;
  const app = appWith(async (_requestInput) => { registrationCalls += 1; return registration; }, async (_loginInput) => {
    loginCalls += 1;
    return {
      token: 'backend-issued-test-token',
      user: { id: '507f1f77bcf86cd799439014', role: 'MEMBER', accountStatus: 'ACTIVE' },
    };
  });
  const response = await request(app).post('/register').send(input);
  assert.equal(response.status, 201);
  assert.equal(registrationCalls, 1);
  assert.equal(loginCalls, 1);
  assert.equal(response.body.data.membershipStatus, 'PENDING');
  assert.equal(response.body.data.member.status, 'PENDING');
  assert.equal(response.body.data.auth.token, 'backend-issued-test-token');
  assert.equal(response.body.data.auth.user.role, 'MEMBER');
  assert.equal(response.body.data.auth.user.passwordHash, undefined);
  assert.equal(JSON.stringify(response.body).includes(input.password), false);
});

test('registration is not repeated when automatic authentication fails after account creation', async () => {
  let registrationCalls = 0;
  let loginCalls = 0;
  const app = appWith(async (_requestInput) => { registrationCalls += 1; return registration; }, async (_loginInput) => {
    loginCalls += 1;
    throw new Error('session backend unavailable');
  });
  const response = await request(app).post('/register').send(input);
  assert.equal(response.status, 201);
  assert.equal(registrationCalls, 1);
  assert.equal(loginCalls, 1);
  assert.equal(response.body.data.member.status, 'PENDING');
  assert.equal(response.body.data.auth, null);
  assert.equal(response.body.data.authenticationRequired, true);
});

test('invalid and duplicate registration requests never trigger automatic login', async () => {
  let loginCalls = 0;
  const validApp = appWith(async (_requestInput) => { throw new RegistrationError('DUPLICATE', 'Duplicate Employee Code'); }, async (_loginInput) => {
    loginCalls += 1;
    return { token: 'unused', user: { id: 'unused', role: 'MEMBER', accountStatus: 'ACTIVE' } };
  });
  const duplicate = await request(validApp).post('/register').send(input);
  assert.equal(duplicate.status, 409);
  assert.equal(loginCalls, 0);

  const invalid = await request(appWith(async (_requestInput) => registration, async (_loginInput) => {
    loginCalls += 1;
    return { token: 'unused', user: { id: 'unused', role: 'MEMBER', accountStatus: 'ACTIVE' } };
  })).post('/register').send({ ...input, employeeId: '' });
  assert.equal(invalid.status, 422);
  assert.equal(loginCalls, 0);
});
