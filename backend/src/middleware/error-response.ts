import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const error: ApiError = { code, message };
  if (details !== undefined) error.details = details;
  res.status(status).json({ success: false, error });
}

export function handleError(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', error.flatten());
    return;
  }

  console.error('Unhandled request error:', error);
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred');
}
