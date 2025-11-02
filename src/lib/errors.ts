/**
 * Custom Error Classes voor Appalti Platform
 * 
 * Deze errors geven duidelijke feedback aan gebruikers en developers
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public field?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ========================================
// Validation Errors (400)
// ========================================

export class ValidationError extends AppError {
  constructor(message: string, field?: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, field, details);
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'INVALID_INPUT', 400, field);
  }
}

export class MissingFieldError extends AppError {
  constructor(field: string) {
    super(`${field} is required`, 'MISSING_FIELD', 400, field);
  }
}

// ========================================
// Authentication & Authorization Errors (401, 403)
// ========================================

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(requiredRole?: string) {
    const message = requiredRole 
      ? `Requires ${requiredRole} role or higher`
      : 'Insufficient permissions';
    super(message, 'INSUFFICIENT_PERMISSIONS', 403);
  }
}

// ========================================
// Resource Errors (404, 409)
// ========================================

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class DuplicateError extends AppError {
  constructor(field: string, value?: string) {
    const message = value
      ? `${field} '${value}' already exists`
      : `Duplicate ${field}`;
    super(message, 'DUPLICATE', 409, field);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

// ========================================
// Business Logic Errors (400, 422)
// ========================================

export class TenantIsolationError extends AppError {
  constructor(message: string = 'Access denied: Resource belongs to different tenant') {
    super(message, 'TENANT_ISOLATION_VIOLATION', 403);
  }
}

export class IKPValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'IKP_VALIDATION_ERROR', 422, undefined, details);
  }
}

export class KVKValidationError extends AppError {
  constructor(message: string, kvkNumber?: string) {
    super(message, 'KVK_VALIDATION_ERROR', 400, 'kvkNumber', { kvkNumber });
  }
}

export class StageTransitionError extends AppError {
  constructor(currentStage: string, requestedStage: string) {
    super(
      `Cannot transition from ${currentStage} to ${requestedStage}`,
      'INVALID_STAGE_TRANSITION',
      400,
      undefined,
      { currentStage, requestedStage }
    );
  }
}

// ========================================
// External Service Errors (502, 503)
// ========================================

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `${service} service is unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      undefined,
      { service }
    );
  }
}

export class TenderNedError extends AppError {
  constructor(message: string = 'TenderNed API error') {
    super(message, 'TENDERNED_ERROR', 502);
  }
}

export class KVKAPIError extends AppError {
  constructor(message: string = 'KVK API error') {
    super(message, 'KVK_API_ERROR', 502);
  }
}

export class AIServiceError extends AppError {
  constructor(provider: string, message?: string) {
    super(
      message || `AI service (${provider}) error`,
      'AI_SERVICE_ERROR',
      502,
      undefined,
      { provider }
    );
  }
}

// ========================================
// Database Errors (500, 503)
// ========================================

export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', operation?: string) {
    super(message, 'DATABASE_ERROR', 500, undefined, { operation });
  }
}

export class DatabaseConnectionError extends AppError {
  constructor() {
    super('Database connection failed', 'DATABASE_CONNECTION_ERROR', 503);
  }
}

// ========================================
// Rate Limiting (429)
// ========================================

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      429,
      undefined,
      { retryAfter }
    );
  }
}

// ========================================
// Generic Server Error (500)
// ========================================

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_SERVER_ERROR', 500);
  }
}

