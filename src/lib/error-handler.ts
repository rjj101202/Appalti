/**
 * Error Handler voor API Routes
 * 
 * Centralized error handling met logging en user-friendly responses
 */

import { NextResponse } from 'next/server';
import { AppError } from './errors';
import type { ErrorResponse } from '@/types/api';

interface ErrorLogEntry {
  timestamp: string;
  endpoint?: string;
  error: {
    name: string;
    message: string;
    code?: string;
    statusCode?: number;
    stack?: string;
  };
  userId?: string;
  tenantId?: string;
}

/**
 * Log error details voor debugging (in productie naar monitoring service)
 */
function logError(entry: ErrorLogEntry): void {
  // In development: log naar console
  if (process.env.NODE_ENV === 'development') {
    console.error('[API Error]', JSON.stringify(entry, null, 2));
  } else {
    // In production: zou naar monitoring service gaan (Sentry, DataDog, etc.)
    console.error('[API Error]', {
      timestamp: entry.timestamp,
      endpoint: entry.endpoint,
      error: entry.error.message,
      code: entry.error.code,
      userId: entry.userId,
      tenantId: entry.tenantId
    });
  }
}

/**
 * Handle MongoDB duplicate key errors
 */
function handleMongoError(error: any): { message: string; code: string; field?: string } {
  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return {
      message: `A record with this ${field} already exists`,
      code: 'DUPLICATE_ENTRY',
      field
    };
  }

  // Validation error
  if (error.name === 'ValidationError') {
    const firstError = Object.values(error.errors)[0] as any;
    return {
      message: firstError?.message || 'Validation failed',
      code: 'VALIDATION_ERROR',
      field: firstError?.path
    };
  }

  return {
    message: 'Database operation failed',
    code: 'DATABASE_ERROR'
  };
}

/**
 * Sanitize error message for production (don't expose internal details)
 */
function sanitizeErrorMessage(error: any, isDevelopment: boolean): string {
  if (isDevelopment) {
    return error.message || 'An error occurred';
  }

  // In production, use generic messages for non-AppErrors
  if (error instanceof AppError) {
    return error.message;
  }

  // Generic message for unknown errors
  return 'An error occurred while processing your request';
}

/**
 * Main error handler - converts errors naar user-friendly API responses
 */
export function handleApiError(
  error: unknown,
  context?: {
    endpoint?: string;
    userId?: string;
    tenantId?: string;
  }
): NextResponse<ErrorResponse> {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error details
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    endpoint: context?.endpoint,
    error: {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    },
    userId: context?.userId,
    tenantId: context?.tenantId
  };

  // AppError - our custom errors
  if (error instanceof AppError) {
    logEntry.error.code = error.code;
    logEntry.error.statusCode = error.statusCode;
    logError(logEntry);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        field: error.field,
        details: isDevelopment ? error.details : undefined
      },
      { status: error.statusCode }
    );
  }

  // MongoDB errors
  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'number') {
    const mongoError = handleMongoError(error);
    logEntry.error.code = mongoError.code;
    logError(logEntry);

    return NextResponse.json(
      {
        success: false,
        error: mongoError.message,
        code: mongoError.code,
        field: mongoError.field
      },
      { status: 400 }
    );
  }

  // Zod validation errors (van schema validatie)
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: string[]; message: string }> };
    const firstIssue = zodError.issues[0];
    
    logEntry.error.code = 'VALIDATION_ERROR';
    logError(logEntry);

    return NextResponse.json(
      {
        success: false,
        error: firstIssue?.message || 'Validation failed',
        code: 'VALIDATION_ERROR',
        field: firstIssue?.path?.join('.'),
        details: isDevelopment ? { issues: zodError.issues } : undefined
      },
      { status: 400 }
    );
  }

  // Generic Error
  if (error instanceof Error) {
    logEntry.error.code = 'INTERNAL_ERROR';
    logError(logEntry);

    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(error, isDevelopment),
        code: 'INTERNAL_ERROR',
        details: isDevelopment ? { stack: error.stack } : undefined
      },
      { status: 500 }
    );
  }

  // Unknown error type
  logEntry.error.code = 'UNKNOWN_ERROR';
  logError(logEntry);

  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  );
}

/**
 * Wrapper voor async API route handlers met automatic error handling
 */
export function withErrorHandler<T = any>(
  handler: (request: Request, context?: any) => Promise<NextResponse<T>>,
  endpoint?: string
) {
  return async (request: Request, context?: any): Promise<NextResponse<T | ErrorResponse>> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, { endpoint });
    }
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw new AppError(
        `${field} is required`,
        'MISSING_FIELD',
        400,
        field
      );
    }
  }
}

/**
 * Validate KVK number format
 */
export function validateKvkNumber(kvkNumber: string): void {
  if (!/^\d{8}$/.test(kvkNumber)) {
    throw new AppError(
      'Invalid KVK number format. Must be 8 digits',
      'INVALID_KVK_FORMAT',
      400,
      'kvkNumber'
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(
      'Invalid email format',
      'INVALID_EMAIL',
      400,
      'email'
    );
  }
}

/**
 * Sanitize object - remove fields that shouldn't be updated
 */
export function sanitizeUpdateFields<T extends Record<string, any>>(
  input: T,
  allowedFields: string[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (input[field] !== undefined) {
      sanitized[field as keyof T] = input[field];
    }
  }
  
  return sanitized;
}

