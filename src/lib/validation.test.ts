/**
 * Validation Utils Tests
 * 
 * Tests for input validation and sanitization
 * Critical for security and data integrity
 */

import { ObjectId } from 'mongodb';

describe('Input Validation', () => {
  describe('ObjectId Validation', () => {
    test('should validate correct ObjectId strings', () => {
      const isValidObjectId = (id: string): boolean => {
        if (!id || typeof id !== 'string') return false;
        if (id.length !== 24) return false;
        
        try {
          new ObjectId(id);
          return true;
        } catch {
          return false;
        }
      };

      expect(isValidObjectId(new ObjectId().toString())).toBe(true);
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('507f1f77bcf86cd79943901g')).toBe(false); // Invalid char
      expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false);  // Too short
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId('invalid')).toBe(false);
    });
  });

  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
      expect(isValidEmail('user@subdomain.example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@example')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    test('should detect Appalti internal emails', () => {
      const isAppaltiEmail = (email: string): boolean => {
        return email.toLowerCase().endsWith('@appalti.nl');
      };

      expect(isAppaltiEmail('user@appalti.nl')).toBe(true);
      expect(isAppaltiEmail('USER@APPALTI.NL')).toBe(true);
      expect(isAppaltiEmail('user@appalti.nl.fake.com')).toBe(false);
      expect(isAppaltiEmail('user@example.com')).toBe(false);
    });
  });

  describe('KVK Number Validation', () => {
    test('should validate 8-digit KVK numbers', () => {
      const isValidKvkNumber = (kvk: string): boolean => {
        return /^\d{8}$/.test(kvk);
      };

      expect(isValidKvkNumber('12345678')).toBe(true);
      expect(isValidKvkNumber('00000000')).toBe(true);
      expect(isValidKvkNumber('1234567')).toBe(false);   // Too short
      expect(isValidKvkNumber('123456789')).toBe(false); // Too long
      expect(isValidKvkNumber('1234567a')).toBe(false);  // Contains letter
      expect(isValidKvkNumber('')).toBe(false);
    });
  });

  describe('CPV Code Validation', () => {
    test('should validate CPV code format', () => {
      const isValidCpvCode = (code: string): boolean => {
        // CPV codes are 8 digits, optionally followed by -X (check digit)
        return /^\d{8}(-\d)?$/.test(code);
      };

      expect(isValidCpvCode('72000000')).toBe(true);
      expect(isValidCpvCode('72000000-5')).toBe(true);
      expect(isValidCpvCode('79000000-4')).toBe(true);
      expect(isValidCpvCode('7200000')).toBe(false);     // Too short
      expect(isValidCpvCode('720000000')).toBe(false);   // Too long
      expect(isValidCpvCode('72000000-')).toBe(false);   // Missing check digit
      expect(isValidCpvCode('72000000-55')).toBe(false); // Check digit too long
    });

    test('should validate CPV code array', () => {
      const validateCpvCodes = (codes: string[]): { 
        valid: boolean; 
        invalidCodes: string[] 
      } => {
        const cpvPattern = /^\d{8}(-\d)?$/;
        const invalidCodes = codes.filter(code => !cpvPattern.test(code));
        
        return {
          valid: invalidCodes.length === 0,
          invalidCodes
        };
      };

      expect(validateCpvCodes(['72000000-5', '79000000-4']).valid).toBe(true);
      expect(validateCpvCodes([]).valid).toBe(true);
      
      const result = validateCpvCodes(['72000000-5', 'invalid', '12345']);
      expect(result.valid).toBe(false);
      expect(result.invalidCodes).toEqual(['invalid', '12345']);
    });
  });

  describe('TenantId Validation', () => {
    test('should require non-empty tenantId', () => {
      const isValidTenantId = (tenantId: any): boolean => {
        return typeof tenantId === 'string' && 
               tenantId.trim().length > 0 &&
               tenantId !== 'default';
      };

      expect(isValidTenantId('tenant-abc')).toBe(true);
      expect(isValidTenantId('appalti')).toBe(true);
      expect(isValidTenantId('')).toBe(false);
      expect(isValidTenantId('   ')).toBe(false);
      expect(isValidTenantId('default')).toBe(false);
      expect(isValidTenantId(null)).toBe(false);
      expect(isValidTenantId(undefined)).toBe(false);
      expect(isValidTenantId(123)).toBe(false);
    });

    test('should sanitize tenantId', () => {
      const sanitizeTenantId = (tenantId: string): string => {
        return tenantId.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
      };

      expect(sanitizeTenantId('Tenant-ABC')).toBe('tenant-abc');
      expect(sanitizeTenantId('  tenant  ')).toBe('tenant');
      expect(sanitizeTenantId('tenant@123')).toBe('tenant123');
    });
  });

  describe('URL Validation', () => {
    test('should validate URL format', () => {
      const isValidUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
      expect(isValidUrl('https://example.com:8080/path?query=1')).toBe(true);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    test('should validate TenderNed source URLs', () => {
      const isValidTenderNedUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          // Must be exact tenderned.nl domain (with or without www)
          return parsed.hostname === 'tenderned.nl' || parsed.hostname === 'www.tenderned.nl';
        } catch {
          return false;
        }
      };

      expect(isValidTenderNedUrl('https://www.tenderned.nl/aankondigingen/123')).toBe(true);
      expect(isValidTenderNedUrl('https://tenderned.nl/publicaties')).toBe(true);
      expect(isValidTenderNedUrl('https://fake-tenderned.nl/hack')).toBe(false);
      expect(isValidTenderNedUrl('https://example.com')).toBe(false);
    });
  });

  describe('String Sanitization', () => {
    test('should trim and limit string length', () => {
      const sanitizeString = (input: string, maxLength: number = 255): string => {
        return input.trim().substring(0, maxLength);
      };

      expect(sanitizeString('  hello  ')).toBe('hello');
      expect(sanitizeString('a'.repeat(300), 255)).toHaveLength(255);
    });

    test('should escape HTML entities', () => {
      const escapeHtml = (input: string): string => {
        const escapeMap: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        
        return input.replace(/[&<>"']/g, char => escapeMap[char]);
      };

      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
      expect(escapeHtml("It's a test")).toBe("It&#039;s a test");
    });

    test('should remove control characters', () => {
      const removeControlChars = (input: string): string => {
        // Remove all control characters except newlines and tabs
        return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      };

      expect(removeControlChars('Hello\x00World')).toBe('HelloWorld');
      expect(removeControlChars('Line1\nLine2')).toBe('Line1\nLine2'); // Keep newlines
      expect(removeControlChars('Tab\there')).toBe('Tab\there'); // Keep tabs
    });
  });

  describe('Number Validation', () => {
    test('should validate pagination limit', () => {
      const validateLimit = (limit: any): number => {
        const parsed = parseInt(limit, 10);
        
        if (isNaN(parsed) || parsed < 1) return 20;  // Default
        if (parsed > 100) return 100;                 // Max
        
        return parsed;
      };

      expect(validateLimit(10)).toBe(10);
      expect(validateLimit('50')).toBe(50);
      expect(validateLimit(0)).toBe(20);
      expect(validateLimit(-1)).toBe(20);
      expect(validateLimit(200)).toBe(100);
      expect(validateLimit('invalid')).toBe(20);
      expect(validateLimit(undefined)).toBe(20);
    });

    test('should validate percentage values', () => {
      const isValidPercentage = (value: number): boolean => {
        return typeof value === 'number' && 
               !isNaN(value) && 
               value >= 0 && 
               value <= 100;
      };

      expect(isValidPercentage(0)).toBe(true);
      expect(isValidPercentage(50)).toBe(true);
      expect(isValidPercentage(100)).toBe(true);
      expect(isValidPercentage(-1)).toBe(false);
      expect(isValidPercentage(101)).toBe(false);
      expect(isValidPercentage(NaN)).toBe(false);
    });
  });

  describe('Injection Prevention', () => {
    test('should prevent NoSQL injection in queries', () => {
      const sanitizeQueryValue = (value: any): string | null => {
        // Reject objects that could be operators
        if (typeof value === 'object' && value !== null) {
          return null;
        }
        
        if (typeof value !== 'string') {
          return null;
        }
        
        return value;
      };

      expect(sanitizeQueryValue('normal-value')).toBe('normal-value');
      expect(sanitizeQueryValue({ $gt: '' })).toBeNull(); // NoSQL injection attempt
      expect(sanitizeQueryValue({ $ne: null })).toBeNull();
      expect(sanitizeQueryValue(['array'])).toBeNull();
    });

    test('should prevent tenantId override in filters', () => {
      const secureBuildQuery = (
        userTenantId: string,
        userFilters: Record<string, any>
      ): Record<string, any> => {
        // Remove any tenantId from user filters
        const { tenantId: _, ...safeFilters } = userFilters;
        
        return {
          tenantId: userTenantId,
          ...safeFilters
        };
      };

      const query = secureBuildQuery('real-tenant', {
        tenantId: 'hacker-tenant',
        name: 'Test'
      });

      expect(query.tenantId).toBe('real-tenant');
      expect(query.name).toBe('Test');
    });
  });

  describe('Date Validation', () => {
    test('should validate date strings', () => {
      const isValidDateString = (dateStr: string): boolean => {
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && date.getFullYear() > 1970;
      };

      expect(isValidDateString('2025-03-15')).toBe(true);
      expect(isValidDateString('2025-03-15T12:00:00Z')).toBe(true);
      expect(isValidDateString('invalid')).toBe(false);
      expect(isValidDateString('1970-01-01')).toBe(false); // Epoch
    });

    test('should validate deadline is in future', () => {
      const isFutureDeadline = (deadline: Date): boolean => {
        return deadline.getTime() > Date.now();
      };

      const future = new Date(Date.now() + 86400000);
      const past = new Date(Date.now() - 86400000);

      expect(isFutureDeadline(future)).toBe(true);
      expect(isFutureDeadline(past)).toBe(false);
    });
  });

  describe('File Validation', () => {
    test('should validate allowed file types', () => {
      const isAllowedFileType = (mimeType: string): boolean => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/png'
        ];
        
        return allowedTypes.includes(mimeType);
      };

      expect(isAllowedFileType('application/pdf')).toBe(true);
      expect(isAllowedFileType('text/plain')).toBe(true);
      expect(isAllowedFileType('image/jpeg')).toBe(true);
      expect(isAllowedFileType('application/x-executable')).toBe(false);
      expect(isAllowedFileType('text/html')).toBe(false);
    });

    test('should validate file size', () => {
      const isValidFileSize = (bytes: number, maxMB: number = 10): boolean => {
        const maxBytes = maxMB * 1024 * 1024;
        return bytes > 0 && bytes <= maxBytes;
      };

      expect(isValidFileSize(1024)).toBe(true);                    // 1 KB
      expect(isValidFileSize(5 * 1024 * 1024)).toBe(true);         // 5 MB
      expect(isValidFileSize(10 * 1024 * 1024)).toBe(true);        // 10 MB (max)
      expect(isValidFileSize(11 * 1024 * 1024)).toBe(false);       // 11 MB
      expect(isValidFileSize(0)).toBe(false);                       // Empty
    });

    test('should sanitize filename', () => {
      const sanitizeFilename = (filename: string): string => {
        // Remove path separators and dangerous characters
        return filename
          .replace(/[/\\:*?"<>|]/g, '_')
          .replace(/\.{2,}/g, '.')
          .trim();
      };

      expect(sanitizeFilename('normal-file.pdf')).toBe('normal-file.pdf');
      // After replacing / with _ and .. with ., result is ._._._etc_passwd
      expect(sanitizeFilename('../../../etc/passwd')).toBe('._._._etc_passwd');
      expect(sanitizeFilename('file:name.pdf')).toBe('file_name.pdf');
      expect(sanitizeFilename('file<script>.pdf')).toBe('file_script_.pdf');
    });
  });

  describe('IKP Data Validation', () => {
    test('should validate IKP weight totals', () => {
      const validateIkpWeights = (weights: Record<string, number>): {
        valid: boolean;
        total: number;
        error?: string;
      } => {
        const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
        
        // Total should be 100% (allow small floating point tolerance)
        if (Math.abs(total - 100) > 0.01) {
          return {
            valid: false,
            total,
            error: `Weights must sum to 100%, got ${total}%`
          };
        }
        
        return { valid: true, total };
      };

      expect(validateIkpWeights({ a: 50, b: 30, c: 20 }).valid).toBe(true);
      expect(validateIkpWeights({ a: 60, b: 40 }).valid).toBe(true);
      expect(validateIkpWeights({ a: 50, b: 30 }).valid).toBe(false);
    });

    test('should validate CKV fields are complete', () => {
      const validateCkvComplete = (ikpData: Record<string, any>): {
        complete: boolean;
        missingFields: string[];
      } => {
        const ckvFields = [
          'geografischeScope',
          'omvangMedewerkers',
          'opdrachtgevers',
          'branche',
          'kredietwaardigheid'
        ];
        
        const missingFields = ckvFields.filter(
          field => !ikpData[field] || ikpData[field].length === 0
        );
        
        return {
          complete: missingFields.length === 0,
          missingFields
        };
      };

      const completeData = {
        geografischeScope: ['NL'],
        omvangMedewerkers: '50-100',
        opdrachtgevers: ['Overheid'],
        branche: ['ICT'],
        kredietwaardigheid: 'A'
      };
      
      expect(validateCkvComplete(completeData).complete).toBe(true);

      const incompleteData = {
        geografischeScope: ['NL'],
        omvangMedewerkers: '50-100'
      };
      
      const result = validateCkvComplete(incompleteData);
      expect(result.complete).toBe(false);
      expect(result.missingFields).toContain('opdrachtgevers');
    });
  });
});

