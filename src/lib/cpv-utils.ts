/**
 * CPV Code Utilities
 * 
 * Handles CPV code validation, check digit calculation, and formatting
 * for TenderNed API compatibility
 */

/**
 * Calculate CPV check digit using EU algorithm
 * Based on weighted modulo 11 algorithm
 */
export function calculateCPVCheckDigit(code: string): number {
  // Remove any existing check digit and non-digits
  const cleanCode = code.replace(/[^\d]/g, '').substring(0, 8);
  
  if (cleanCode.length !== 8) {
    throw new Error('CPV code must be 8 digits');
  }
  
  // Weights: 2,3,4,5,6,7,8,9 (from left to right)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleanCode[i]) * weights[i];
  }
  
  // Check digit = 11 - (sum mod 11)
  let checkDigit = 11 - (sum % 11);
  
  // If check digit is 10, use 0
  // If check digit is 11, use 0
  if (checkDigit >= 10) {
    checkDigit = 0;
  }
  
  return checkDigit;
}

/**
 * Format CPV code with check digit
 */
export function formatCPVCode(code: string): string {
  const cleanCode = code.replace(/[^\d]/g, '').substring(0, 8);
  
  if (cleanCode.length !== 8) {
    return code; // Return as-is if invalid
  }
  
  const checkDigit = calculateCPVCheckDigit(cleanCode);
  return `${cleanCode}-${checkDigit}`;
}

/**
 * Validate CPV code format and check digit
 */
export function validateCPVCode(code: string): {
  valid: boolean;
  formatted?: string;
  error?: string;
} {
  // Remove spaces and normalize
  const normalized = code.trim().replace(/\s+/g, '');
  
  // Check format: XXXXXXXX or XXXXXXXX-X
  const match = normalized.match(/^(\d{8})(?:-(\d))?$/);
  
  if (!match) {
    return {
      valid: false,
      error: 'Invalid CPV format. Expected 8 digits or XXXXXXXX-X'
    };
  }
  
  const [, coreCode, providedCheckDigit] = match;
  const calculatedCheckDigit = calculateCPVCheckDigit(coreCode);
  
  // If check digit was provided, validate it
  if (providedCheckDigit !== undefined) {
    const provided = parseInt(providedCheckDigit);
    if (provided !== calculatedCheckDigit) {
      return {
        valid: false,
        error: `Invalid check digit. Expected ${calculatedCheckDigit}, got ${provided}`
      };
    }
  }
  
  return {
    valid: true,
    formatted: `${coreCode}-${calculatedCheckDigit}`
  };
}

/**
 * Parse CPV code and extract core code + check digit
 */
export function parseCPVCode(code: string): {
  coreCode: string;
  checkDigit: number;
  formatted: string;
} {
  const normalized = code.trim().replace(/\s+/g, '');
  const match = normalized.match(/^(\d{8})(?:-(\d))?$/);
  
  if (!match) {
    throw new Error('Invalid CPV code format');
  }
  
  const coreCode = match[1];
  const checkDigit = match[2] 
    ? parseInt(match[2]) 
    : calculateCPVCheckDigit(coreCode);
  
  return {
    coreCode,
    checkDigit,
    formatted: `${coreCode}-${checkDigit}`
  };
}

/**
 * Check if CPV code is TenderNed compatible
 * TenderNed accepts Klasse and Categorie level codes
 */
export function isTenderNedCompatible(code: string): {
  compatible: boolean;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  reason?: string;
} {
  const { coreCode } = parseCPVCode(code);
  
  // Divisie: XX000000
  if (coreCode.endsWith('000000')) {
    return {
      compatible: false,
      level: 'Divisie',
      reason: 'Divisie-niveau codes (XX000000) worden niet geaccepteerd door TenderNed'
    };
  }
  
  // Groep: XXXX0000
  if (coreCode.endsWith('0000')) {
    return {
      compatible: false,
      level: 'Groep',
      reason: 'Groep-niveau codes (XXXX0000) worden niet geaccepteerd door TenderNed'
    };
  }
  
  // Klasse: XXXXXX00
  if (coreCode.endsWith('00')) {
    return {
      compatible: true,
      level: 'Klasse'
    };
  }
  
  // Categorie: XXXXXXXX (geen trailing zeros)
  return {
    compatible: true,
    level: 'Categorie'
  };
}

/**
 * Get CPV hierarchy level
 */
export function getCPVLevel(code: string): 'Divisie' | 'Groep' | 'Klasse' | 'Categorie' {
  const { coreCode } = parseCPVCode(code);
  
  if (coreCode.endsWith('000000')) return 'Divisie';
  if (coreCode.endsWith('0000')) return 'Groep';
  if (coreCode.endsWith('00')) return 'Klasse';
  return 'Categorie';
}

/**
 * Batch validate multiple CPV codes
 */
export function validateCPVCodes(codes: string[]): {
  valid: Array<{ code: string; formatted: string }>;
  invalid: Array<{ code: string; error: string }>;
  incompatible: Array<{ code: string; reason: string }>;
} {
  const result = {
    valid: [] as Array<{ code: string; formatted: string }>,
    invalid: [] as Array<{ code: string; error: string }>,
    incompatible: [] as Array<{ code: string; reason: string }>
  };
  
  for (const code of codes) {
    const validation = validateCPVCode(code);
    
    if (!validation.valid) {
      result.invalid.push({
        code,
        error: validation.error || 'Invalid code'
      });
      continue;
    }
    
    const compatibility = isTenderNedCompatible(code);
    
    if (!compatibility.compatible) {
      result.incompatible.push({
        code,
        reason: compatibility.reason || 'Not compatible'
      });
      continue;
    }
    
    result.valid.push({
      code,
      formatted: validation.formatted!
    });
  }
  
  return result;
}

