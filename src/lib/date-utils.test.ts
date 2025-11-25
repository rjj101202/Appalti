/**
 * Date Utils Tests
 * 
 * Tests for date formatting and deadline calculations
 * Important for tender deadline handling
 */

import { formatDateOnly, formatDateNL, daysUntilDeadline } from './date-utils';

describe('Date Utils', () => {
  describe('formatDateOnly', () => {
    test('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2025-03-15T14:30:00Z');
      const result = formatDateOnly(date);
      
      expect(result).toBe('2025-03-15');
    });

    test('should format ISO string to YYYY-MM-DD', () => {
      const result = formatDateOnly('2025-03-15T14:30:00+02:00');
      
      expect(result).toBe('2025-03-15');
    });

    test('should extract date from partial ISO string', () => {
      const result = formatDateOnly('2025-03-15');
      
      expect(result).toBe('2025-03-15');
    });

    test('should return dash for null/undefined', () => {
      expect(formatDateOnly(null)).toBe('–');
      expect(formatDateOnly(undefined)).toBe('–');
      expect(formatDateOnly('')).toBe('–');
    });

    test('should return dash for invalid date', () => {
      expect(formatDateOnly('not-a-date')).toBe('–');
      expect(formatDateOnly('invalid')).toBe('–');
    });

    test('should return dash for epoch date (1970-01-01)', () => {
      const epochDate = new Date(0);
      expect(formatDateOnly(epochDate)).toBe('–');
    });

    test('should handle dates with timezone offsets', () => {
      // Date with positive offset
      const result1 = formatDateOnly('2025-03-15T23:30:00+05:30');
      expect(result1).toBe('2025-03-15');

      // Date with negative offset
      const result2 = formatDateOnly('2025-03-15T01:30:00-08:00');
      expect(result2).toBe('2025-03-15');
    });
  });

  describe('formatDateNL', () => {
    test('should format date to Dutch locale (dd-mm-yyyy)', () => {
      const date = new Date('2025-03-15T12:00:00Z');
      const result = formatDateNL(date);
      
      // Dutch format: 15-3-2025 or 15-03-2025 depending on locale settings
      expect(result).toMatch(/15[-./]0?3[-./]2025/);
    });

    test('should return dash for null/undefined', () => {
      expect(formatDateNL(null)).toBe('–');
      expect(formatDateNL(undefined)).toBe('–');
    });

    test('should return dash for invalid date', () => {
      expect(formatDateNL('invalid-date')).toBe('–');
    });

    test('should return dash for epoch date', () => {
      expect(formatDateNL(new Date(0))).toBe('–');
    });
  });

  describe('daysUntilDeadline', () => {
    test('should return positive days for future deadline', () => {
      // 10 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      
      const result = daysUntilDeadline(futureDate);
      
      expect(result).toBeGreaterThanOrEqual(9);
      expect(result).toBeLessThanOrEqual(11);
    });

    test('should return negative days for past deadline', () => {
      // 5 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      
      const result = daysUntilDeadline(pastDate);
      
      expect(result).toBeLessThan(0);
      expect(result).toBeGreaterThanOrEqual(-6);
    });

    test('should return 0 or 1 for deadline today', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const result = daysUntilDeadline(today);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    test('should return null for null/undefined', () => {
      expect(daysUntilDeadline(null)).toBeNull();
      expect(daysUntilDeadline(undefined)).toBeNull();
    });

    test('should return null for invalid date', () => {
      expect(daysUntilDeadline('not-a-date')).toBeNull();
    });

    test('should return null for epoch date', () => {
      expect(daysUntilDeadline(new Date(0))).toBeNull();
    });

    test('should handle ISO string input', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      const result = daysUntilDeadline(futureDate.toISOString());
      
      expect(result).toBeGreaterThanOrEqual(6);
      expect(result).toBeLessThanOrEqual(8);
    });

    test('should calculate correctly for year-crossing deadlines', () => {
      // Test with a deadline far in the future
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      
      const result = daysUntilDeadline(farFuture);
      
      expect(result).toBeGreaterThan(300);
      expect(result).toBeLessThanOrEqual(366);
    });
  });

  describe('Deadline Urgency Classification', () => {
    // Helper function that could be added to date-utils
    const classifyDeadlineUrgency = (daysRemaining: number | null): string => {
      if (daysRemaining === null) return 'unknown';
      if (daysRemaining < 0) return 'overdue';
      if (daysRemaining <= 3) return 'critical';
      if (daysRemaining <= 7) return 'urgent';
      if (daysRemaining <= 14) return 'soon';
      return 'normal';
    };

    test('should classify overdue deadlines', () => {
      expect(classifyDeadlineUrgency(-1)).toBe('overdue');
      expect(classifyDeadlineUrgency(-10)).toBe('overdue');
    });

    test('should classify critical deadlines (0-3 days)', () => {
      expect(classifyDeadlineUrgency(0)).toBe('critical');
      expect(classifyDeadlineUrgency(1)).toBe('critical');
      expect(classifyDeadlineUrgency(3)).toBe('critical');
    });

    test('should classify urgent deadlines (4-7 days)', () => {
      expect(classifyDeadlineUrgency(4)).toBe('urgent');
      expect(classifyDeadlineUrgency(7)).toBe('urgent');
    });

    test('should classify soon deadlines (8-14 days)', () => {
      expect(classifyDeadlineUrgency(8)).toBe('soon');
      expect(classifyDeadlineUrgency(14)).toBe('soon');
    });

    test('should classify normal deadlines (15+ days)', () => {
      expect(classifyDeadlineUrgency(15)).toBe('normal');
      expect(classifyDeadlineUrgency(30)).toBe('normal');
    });

    test('should handle unknown (null) deadlines', () => {
      expect(classifyDeadlineUrgency(null)).toBe('unknown');
    });
  });

  describe('TenderNed Deadline Parsing', () => {
    // TenderNed often returns dates in specific formats
    const parseTenderNedDeadline = (dateString: string | null): Date | null => {
      if (!dateString) return null;
      
      try {
        // TenderNed format: "2025-03-15T12:00:00+01:00" or similar
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
          return null;
        }
        
        return date;
      } catch {
        return null;
      }
    };

    test('should parse TenderNed ISO format with timezone', () => {
      const result = parseTenderNedDeadline('2025-03-15T12:00:00+01:00');
      
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2025);
      expect(result!.getMonth()).toBe(2); // March = 2
      expect(result!.getDate()).toBe(15);
    });

    test('should handle null deadline', () => {
      expect(parseTenderNedDeadline(null)).toBeNull();
    });

    test('should handle empty string', () => {
      expect(parseTenderNedDeadline('')).toBeNull();
    });

    test('should handle UTC format', () => {
      const result = parseTenderNedDeadline('2025-03-15T12:00:00Z');
      
      expect(result).toBeInstanceOf(Date);
    });
  });
});

