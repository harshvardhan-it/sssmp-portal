import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { sendError } from './error-response';

const attempts = new Map<string, { count: number; resetAt: number }>();

export function loginRateLimit(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  const key = request.ip ?? 'unknown';
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + env.authRateLimitWindowMs,
    });
    next();
    return;
  }

  if (current.count >= env.authRateLimitMaxAttempts) {
    response.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
    sendError(response, 429, 'RATE_LIMITED', 'Too many login attempts');
    return;
  }

  current.count += 1;
  next();
}

export function resetLoginRateLimit(): void {
  attempts.clear();
}
