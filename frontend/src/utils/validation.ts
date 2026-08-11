/**
 * Centralized Form Validation Utilities
 */

/**
 * Validates Indian & International mobile phone numbers.
 * Allows empty/whitespace if optional.
 * Validates 10-digit numbers (e.g. 9876543210, +91 9876543210, 09876543210).
 */
export const isValidPhone = (phone?: string | null): boolean => {
  if (!phone || !phone.trim()) return true; // Optional field
  const clean = phone.replace(/[\s\-\(\)\+]/g, '');

  // 10 digits starting with 6-9
  if (clean.length === 10 && /^[6-9]\d{9}$/.test(clean)) return true;

  // 12 digits starting with 91 followed by 6-9
  if (clean.length === 12 && clean.startsWith('91') && /^[6-9]\d{9}$/.test(clean.slice(2))) return true;

  // 11 digits starting with 0 followed by 6-9
  if (clean.length === 11 && clean.startsWith('0') && /^[6-9]\d{9}$/.test(clean.slice(1))) return true;

  return false;
};

/**
 * Validates standard email address syntax.
 */
export const isValidEmail = (email?: string | null): boolean => {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Formats phone number into standard 10-digit format for display
 */
export const formatPhone = (phone?: string | null): string => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  if (clean.length === 12 && clean.startsWith('91')) return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  return phone;
};
