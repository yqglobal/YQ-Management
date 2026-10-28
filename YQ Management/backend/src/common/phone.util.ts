/**
 * Normalizes phone numbers and generates search variants for robust customer/ticket lookups.
 * Handles:
 * - E.164: +919747808461, +1234567890
 * - Raw digits: 919747808461, 9747808461
 * - National leading zero: 09747808461
 * - Formatting characters: spaces, dashes, parentheses
 */
export function getPhoneVariants(phone: string): {
  variants: string[];
  digits: string;
} {
  const variants = new Set<string>();
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    return { variants: [], digits: '' };
  }

  variants.add(trimmed);
  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
    if (digits.length > 10) {
      const last10 = digits.slice(-10);
      variants.add(last10);
      variants.add(`0${last10}`);
      variants.add(`+91${last10}`);
      variants.add(`91${last10}`);
      variants.add(`+1${last10}`);
      variants.add(`1${last10}`);
    } else if (digits.length === 10) {
      variants.add(`0${digits}`);
      variants.add(`+91${digits}`);
      variants.add(`91${digits}`);
      variants.add(`+1${digits}`);
      variants.add(`1${digits}`);
    }
  }

  return { variants: Array.from(variants), digits };
}
