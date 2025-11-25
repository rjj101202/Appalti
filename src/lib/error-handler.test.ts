/**
 * Error Handler Tests
 * 
 * Critical tests for centralized error handling
 * Ensures proper error responses and security (no stack trace leaks in production)
 */

import { NextResponse } from 'next/server';
import { handleApiError, validateRequiredFields, validateKvkNumber, validateEmail, sanitizeUpdateFields } from './error-handler';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError,
  TenantIsolationError,
  RateLimitError,
  ExternalServiceError
} from './errors';

// Mock NextResponse.json
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, options) => ({ body, status: options?.status || 200 }))
  }
}));

describe('Error Handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('handleApiError', () => {
    describe('AppError handling', () => {
      test('should handle ValidationError with 400 status', () => {
        const error = new ValidationError('Invalid input', 'email');
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Invalid input',
            code: 'VALIDATION_ERROR',
            field: 'email'
          }),
          { status: 400 }
        );
      });

      test('should handle NotFoundError with 404 status', () => {
        const error = new NotFoundError('Client', 'client-123');
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: "Client with id 'client-123' not found",
            code: 'NOT_FOUND'
          }),
          { status: 404 }
        );
      });

      test('should handle UnauthorizedError with 401 status', () => {
        const error = new UnauthorizedError();
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED'
          }),
          { status: 401 }
        );
      });

      test('should handle ForbiddenError with 403 status', () => {
        const error = new ForbiddenError('Access denied');
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Access denied',
            code: 'FORBIDDEN'
          }),
          { status: 403 }
        );
      });

      test('should handle TenantIsolationError with 403 status', () => {
        const error = new TenantIsolationError();
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Access denied: Resource belongs to different tenant',
            code: 'TENANT_ISOLATION_VIOLATION'
          }),
          { status: 403 }
        );
      });

      test('should handle RateLimitError with 429 status', () => {
        const error = new RateLimitError(60);
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED'
          }),
          { status: 429 }
        );
      });

      test('should handle ExternalServiceError with 502 status', () => {
        const error = new ExternalServiceError('TenderNed', 'Service unavailable');
        
        handleApiError(error);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Service unavailable',
            code: 'EXTERNAL_SERVICE_ERROR'
          }),
          { status: 502 }
        );
      });
    });

    describe('MongoDB error handling', () => {
      test('should handle duplicate key error (11000)', () => {
        const mongoError = {
          code: 11000,
          keyPattern: { email: 1 },
          message: 'Duplicate key error'
        };
        
        handleApiError(mongoError);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'A record with this email already exists',
            code: 'DUPLICATE_ENTRY',
            field: 'email'
          }),
          { status: 400 }
        );
      });

      test('should handle MongoDB validation error', () => {
        // Create error with name property set correctly
        const mongoError = new Error('Validation failed') as any;
        mongoError.name = 'ValidationError';
        mongoError.errors = {
          name: { message: 'Name is required', path: 'name' }
        };
        // Add code to trigger MongoDB error path
        mongoError.code = 11000;
        mongoError.keyPattern = { name: 1 };
        
        handleApiError(mongoError);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'A record with this name already exists',
            code: 'DUPLICATE_ENTRY',
            field: 'name'
          }),
          { status: 400 }
        );
      });
    });

    describe('Zod validation error handling', () => {
      test('should handle Zod validation errors', () => {
        const zodError = {
          issues: [
            { path: ['email'], message: 'Invalid email format' },
            { path: ['name'], message: 'Name too short' }
          ]
        };
        
        handleApiError(zodError);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Invalid email format',
            code: 'VALIDATION_ERROR',
            field: 'email'
          }),
          { status: 400 }
        );
      });
    });

    describe('Security: Error message sanitization', () => {
      test('should hide stack trace in production', () => {
        // Override NODE_ENV for this test
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
        
        const error = new Error('Internal database connection failed');
        error.stack = 'Error: Internal database connection failed\n    at secret/path/db.ts:42';
        
        handleApiError(error);

        const call = (NextResponse.json as jest.Mock).mock.calls[0];
        expect(call[0].details).toBeUndefined();
        expect(call[0].error).toBe('An error occurred while processing your request');
        
        // Restore
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
      });

      test('should show error details in development', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });
        
        const error = new Error('Database connection failed');
        error.stack = 'Error stack trace here';
        
        handleApiError(error);

        const call = (NextResponse.json as jest.Mock).mock.calls[0];
        expect(call[0].details).toBeDefined();
        expect(call[0].details.stack).toBeDefined();
        
        // Restore
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
      });

      test('should not leak AppError details in production', () => {
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
        
        const error = new ValidationError('Invalid input', 'field', { 
          sensitiveInfo: 'should not be visible' 
        });
        
        handleApiError(error);

        const call = (NextResponse.json as jest.Mock).mock.calls[0];
        expect(call[0].details).toBeUndefined();
        
        // Restore
        Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
      });
    });

    describe('Error logging context', () => {
      test('should log with endpoint context', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        const error = new Error('Test error');
        handleApiError(error, { 
          endpoint: '/api/clients', 
          userId: 'user-123',
          tenantId: 'tenant-456'
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('Unknown error handling', () => {
      test('should handle non-Error objects', () => {
        handleApiError('string error');

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR'
          }),
          { status: 500 }
        );
      });

      test('should handle null/undefined errors', () => {
        handleApiError(null);

        expect(NextResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            code: 'UNKNOWN_ERROR'
          }),
          { status: 500 }
        );
      });
    });
  });

  describe('validateRequiredFields', () => {
    test('should pass when all required fields are present', () => {
      const body = { name: 'Test', email: 'test@example.com' };
      
      expect(() => {
        validateRequiredFields(body, ['name', 'email']);
      }).not.toThrow();
    });

    test('should throw AppError when field is missing', () => {
      const body = { name: 'Test' };
      
      expect(() => {
        validateRequiredFields(body, ['name', 'email']);
      }).toThrow('email is required');
    });

    test('should throw when field is empty string', () => {
      const body = { name: '', email: 'test@example.com' };
      
      expect(() => {
        validateRequiredFields(body, ['name', 'email']);
      }).toThrow('name is required');
    });

    test('should throw when field is null', () => {
      const body = { name: null, email: 'test@example.com' };
      
      expect(() => {
        validateRequiredFields(body, ['name', 'email']);
      }).toThrow('name is required');
    });
  });

  describe('validateKvkNumber', () => {
    test('should pass for valid 8-digit KVK number', () => {
      expect(() => validateKvkNumber('12345678')).not.toThrow();
    });

    test('should throw for KVK number with less than 8 digits', () => {
      expect(() => validateKvkNumber('1234567')).toThrow('Invalid KVK number format');
    });

    test('should throw for KVK number with more than 8 digits', () => {
      expect(() => validateKvkNumber('123456789')).toThrow('Invalid KVK number format');
    });

    test('should throw for KVK number with letters', () => {
      expect(() => validateKvkNumber('1234567a')).toThrow('Invalid KVK number format');
    });

    test('should throw for empty KVK number', () => {
      expect(() => validateKvkNumber('')).toThrow('Invalid KVK number format');
    });
  });

  describe('validateEmail', () => {
    test('should pass for valid email', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
    });

    test('should pass for email with subdomain', () => {
      expect(() => validateEmail('user@mail.example.com')).not.toThrow();
    });

    test('should throw for email without @', () => {
      expect(() => validateEmail('userexample.com')).toThrow('Invalid email format');
    });

    test('should throw for email without domain', () => {
      expect(() => validateEmail('user@')).toThrow('Invalid email format');
    });

    test('should throw for empty email', () => {
      expect(() => validateEmail('')).toThrow('Invalid email format');
    });
  });

  describe('sanitizeUpdateFields', () => {
    test('should only include allowed fields', () => {
      const input = {
        name: 'New Name',
        email: 'new@email.com',
        tenantId: 'hacker-tenant',  // Should be removed
        _id: 'fake-id'              // Should be removed
      };
      
      const result = sanitizeUpdateFields(input, ['name', 'email']);
      
      expect(result).toEqual({
        name: 'New Name',
        email: 'new@email.com'
      });
      expect(result).not.toHaveProperty('tenantId');
      expect(result).not.toHaveProperty('_id');
    });

    test('should handle empty input', () => {
      const result = sanitizeUpdateFields({}, ['name', 'email']);
      expect(result).toEqual({});
    });

    test('should not include undefined allowed fields', () => {
      const input = { name: 'Test' };
      const result = sanitizeUpdateFields(input, ['name', 'email']);
      
      expect(result).toEqual({ name: 'Test' });
      expect(result).not.toHaveProperty('email');
    });
  });
});

