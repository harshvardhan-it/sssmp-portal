import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';
import { UserRole } from '../models/types';
import { sendError } from './error-response';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  accountStatus: string;
  districtId?: string;
  blockId?: string;
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

function extractBearerToken(request: Request): string | undefined {
  const header = request.header('authorization');
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme.toLowerCase() === 'bearer' && token ? token : undefined;
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(request);
  if (!token) {
    sendError(response, 401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      sendError(response, 401, 'INVALID_TOKEN', 'Invalid authentication token');
      return;
    }

    if (typeof payload.sessionVersion !== 'number') {
      sendError(response, 401, 'INVALID_TOKEN', 'Invalid authentication token');
      return;
    }

    const user = await User.findById(payload.sub);
    if (!user || user.accountStatus !== 'ACTIVE' || (user.sessionVersion ?? 0) !== payload.sessionVersion) {
      sendError(response, 401, 'INVALID_TOKEN', 'Invalid authentication token');
      return;
    }

    request.authenticatedUser = {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      accountStatus: user.accountStatus,
      districtId: user.districtId?.toString(),
      blockId: user.blockId?.toString(),
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(response, 401, 'TOKEN_EXPIRED', 'Authentication token has expired');
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(response, 401, 'INVALID_TOKEN', 'Invalid authentication token');
      return;
    }
    next(error);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (!request.authenticatedUser) {
      sendError(response, 401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
      return;
    }
    if (!roles.includes(request.authenticatedUser.role)) {
      sendError(response, 403, 'FORBIDDEN', 'You are not authorized for this resource');
      return;
    }
    next();
  };
}
