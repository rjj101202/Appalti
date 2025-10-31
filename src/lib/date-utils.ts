/**
 * Format a date string or Date object to YYYY-MM-DD format
 * Handles ISO timestamps with timezone offsets and invalid dates
 */
export function formatDateOnly(dateInput: any): string {
  if (!dateInput) return '–';
  
  try {
    // If it's a string, try to extract YYYY-MM-DD part first
    if (typeof dateInput === 'string') {
      // Match YYYY-MM-DD at start of string
      const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    
    // Parse as Date
    const d = new Date(dateInput);
    
    // Check if valid and not epoch (1970-01-01)
    if (isNaN(d.getTime()) || d.getFullYear() === 1970) {
      return '–';
    }
    
    // Return YYYY-MM-DD
    return d.toISOString().split('T')[0];
  } catch {
    return '–';
  }
}

/**
 * Format a date to Dutch locale date string (dd-mm-yyyy)
 */
export function formatDateNL(dateInput: any): string {
  if (!dateInput) return '–';
  
  try {
    const d = new Date(dateInput);
    
    if (isNaN(d.getTime()) || d.getFullYear() === 1970) {
      return '–';
    }
    
    return d.toLocaleDateString('nl-NL');
  } catch {
    return '–';
  }
}

/**
 * Calculate days until a deadline
 * Returns null if invalid date
 */
export function daysUntilDeadline(dateInput: any): number | null {
  if (!dateInput) return null;
  
  try {
    const deadline = new Date(dateInput);
    
    if (isNaN(deadline.getTime()) || deadline.getFullYear() === 1970) {
      return null;
    }
    
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch {
    return null;
  }
}

