import { getPhoneVariants } from '../phone.util';

describe('getPhoneVariants', () => {
  it('should return empty variants if phone is empty', () => {
    const { variants, digits } = getPhoneVariants('');
    expect(variants).toEqual([]);
    expect(digits).toBe('');
  });

  it('should generate robust variants for international E.164 phone (+919747808461)', () => {
    const { variants, digits } = getPhoneVariants('+919747808461');
    expect(digits).toBe('919747808461');
    expect(variants).toContain('+919747808461');
    expect(variants).toContain('919747808461');
    expect(variants).toContain('9747808461');
    expect(variants).toContain('09747808461');
  });

  it('should generate robust variants for 10-digit national format (9747808461)', () => {
    const { variants, digits } = getPhoneVariants('9747808461');
    expect(digits).toBe('9747808461');
    expect(variants).toContain('9747808461');
    expect(variants).toContain('+9747808461');
    expect(variants).toContain('+919747808461');
    expect(variants).toContain('919747808461');
    expect(variants).toContain('09747808461');
  });

  it('should handle formatted phone numbers with spaces and dashes', () => {
    const { variants, digits } = getPhoneVariants('+91 97478-08461');
    expect(digits).toBe('919747808461');
    expect(variants).toContain('+919747808461');
    expect(variants).toContain('9747808461');
  });
});
