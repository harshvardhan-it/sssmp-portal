import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import { loginRateLimit } from '../middleware/login-rate-limit.middleware';
import {
  InvalidCredentialsError,
  login,
  toSafeUser,
} from '../services/auth.service';
import { User } from '../models';
import bcrypt from 'bcrypt';
import { AuditLog } from '../models';
import { assertScopeId } from '../services/admin-scope.service';

const router = Router();

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
}).strict();
const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) }).strict();

router.post('/login', loginRateLimit, async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const result = await login(input);
    response.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendError(response, 422, 'VALIDATION_ERROR', 'Request validation failed', error.flatten());
      return;
    }
    if (error instanceof InvalidCredentialsError) {
      sendError(response, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
      return;
    }
    next(error);
  }
});

router.post('/logout', authenticate, async (_request, response, next) => {
  try {
    const result = await User.updateOne(
      { _id: _request.authenticatedUser!.id },
      { $inc: { sessionVersion: 1 } },
    );
    if (result.matchedCount !== 1) {
      sendError(response, 401, 'INVALID_TOKEN', 'Invalid authentication token');
      return;
    }
  } catch (error) {
    next(error);
    return;
  }
  response.status(200).json({
    success: true,
    data: {
      message: 'Logout completed. Discard the bearer token on the client.',
      tokenRevoked: true,
    },
  });
});

router.post('/change-password', authenticate, async (request, response, next) => {
  try {
    const input = changePasswordSchema.parse(request.body);
    if (input.currentPassword === input.newPassword) { sendError(response, 422, 'WEAK_PASSWORD', 'New password must be different'); return; }
    const user = await User.findById(request.authenticatedUser!.id).select('+passwordHash');
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) { sendError(response, 401, 'INVALID_PASSWORD', 'Current password is incorrect'); return; }
    const passwordHash = await User.hashPassword(input.newPassword);
    const currentSessionVersion = user.sessionVersion ?? 0;
    const updateResult = await User.updateOne(
      {
        _id: request.authenticatedUser!.id,
        $or: [
          { sessionVersion: currentSessionVersion },
          ...(currentSessionVersion === 0 ? [{ sessionVersion: { $exists: false } }] : []),
        ],
      },
      { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
    );
    if (updateResult.matchedCount !== 1) { sendError(response, 409, 'PASSWORD_CHANGE_CONFLICT', 'Password change could not be completed; please try again'); return; }
    await AuditLog.create({ actorUserId: assertScopeId(user.id, 'user'), action: 'MEMBER_PASSWORD_CHANGED', targetEntityType: 'USER', targetEntityId: assertScopeId(user.id, 'user') });
    response.json({ success: true, data: { message: 'Password changed successfully', tokenRevoked: true } });
  } catch (error) { if (error instanceof z.ZodError) sendError(response, 422, 'VALIDATION_ERROR', 'Request validation failed', error.flatten()); else next(error); }
});

router.get('/me', authenticate, async (request, response, next) => {
  try {
    const user = await User.findById(request.authenticatedUser?.id);
    if (!user) {
      sendError(response, 401, 'INVALID_TOKEN', 'Invalid authentication token');
      return;
    }
    response.status(200).json({
      success: true,
      data: {
        user: toSafeUser({
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          accountStatus: user.accountStatus,
          districtId: user.districtId,
          blockId: user.blockId,
          lastLoginAt: user.lastLoginAt,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
