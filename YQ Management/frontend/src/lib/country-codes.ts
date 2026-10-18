import { getCountries, getCountryCallingCode } from 'react-phone-number-input/input';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const countryCodes = getCountries().map(country => {
  let name: string = country;
  try {
    name = regionNames.of(country) || country;
  } catch (e) {
    // Ignore invalid region codes
  }
  return {
    code: `+${getCountryCallingCode(country)}`,
    country,
    name
  };
});

export const getCountryByCode = (code: string) => {
  return countryCodes.find(c => c.code === code);
};

export const getCountryByAbbr = (abbr: string) => {
  return countryCodes.find(c => c.country === abbr);
};

export const detectCountryByTimezone = (): string => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzMap: Record<string, string> = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
      'America/Denver': 'US',
      'America/Toronto': 'CA',
      'America/Vancouver': 'CA',
      'Europe/London': 'GB',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
      'Europe/Amsterdam': 'NL',
      'Europe/Zurich': 'CH',
      'Europe/Stockholm': 'SE',
      'Europe/Oslo': 'NO',
      'Europe/Copenhagen': 'DK',
      'Europe/Helsinki': 'FI',
      'Europe/Lisbon': 'PT',
      'Europe/Athens': 'GR',
      'Europe/Warsaw': 'PL',
      'Europe/Prague': 'CZ',
      'Europe/Budapest': 'HU',
      'Europe/Bucharest': 'RO',
      'Asia/Kolkata': 'IN',
      'Asia/Calcutta': 'IN',
      'Asia/Dubai': 'AE',
      'Asia/Riyadh': 'SA',
      'Asia/Tel_Aviv': 'IL',
      'Asia/Istanbul': 'TR',
      'Asia/Shanghai': 'CN',
      'Asia/Hong_Kong': 'HK',
      'Asia/Taipei': 'TW',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Asia/Bangkok': 'TH',
      'Asia/Ho_Chi_Minh': 'VN',
      'Asia/Jakarta': 'ID',
      'Asia/Kuala_Lumpur': 'MY',
      'Asia/Manila': 'PH',
      'Asia/Singapore': 'SG',
      'Africa/Cairo': 'EG',
      'Africa/Lagos': 'NG',
      'Africa/Nairobi': 'KE',
      'Africa/Johannesburg': 'ZA',
      'America/Sao_Paulo': 'BR',
      'America/Mexico_City': 'MX',
      'America/Buenos_Aires': 'AR',
      'America/Santiago': 'CL',
      'America/Bogota': 'CO',
      'America/Lima': 'PE',
      'America/Montreal': 'CA',
      'Australia/Sydney': 'AU',
      'Australia/Melbourne': 'AU',
      'Australia/Brisbane': 'AU',
      'Australia/Perth': 'AU',
      'Australia/Adelaide': 'AU',
      'Pacific/Auckland': 'NZ',
      'Europe/Dublin': 'IE',
      'Europe/Vienna': 'AT',
      'Europe/Brussels': 'BE',
      'Europe/Kyiv': 'UA',
      'Europe/Kiev': 'UA',
      'Asia/Karachi': 'PK',
      'Asia/Dhaka': 'BD',
      'Asia/Colombo': 'LK',
      'Asia/Kathmandu': 'NP',
      'Asia/Qatar': 'QA',
      'Asia/Bahrain': 'BH',
      'Asia/Kuwait': 'KW',
      'Asia/Muscat': 'OM',
      'Africa/Harare': 'ZW',
      'Africa/Gaborone': 'BW',
      'Africa/Windhoek': 'NA',
      'Africa/Accra': 'GH',
      'Africa/Casablanca': 'MA',
    };
    
    // First try the custom map for common ones
    if (tzMap[timezone]) return tzMap[timezone];
    
    // Pattern match by continent/region prefix
    if (timezone.startsWith('Australia/')) return 'AU';
    if (timezone.startsWith('Pacific/Auckland') || timezone.startsWith('Pacific/Chatham')) return 'NZ';
    if (timezone.startsWith('America/Argentina/')) return 'AR';
    
    return 'US';
  } catch {
    return 'US';
  }
};

let cachedCountryObj: { code: string; country: string; name: string } | null = null;
let inFlightDetectionPromise: Promise<{ code: string; country: string; name: string }> | null = null;

export const getInitialCountryIso = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const userChoice = localStorage.getItem('qmova_scanner_country');
      if (userChoice) return userChoice;
      const cached = sessionStorage.getItem('yq_detected_country');
      if (cached) return cached;
    } catch {
      // Storage restricted
    }
  }
  return detectCountryByTimezone();
};

export const detectCountryCode = async (): Promise<{ code: string; country: string; name: string }> => {
  if (cachedCountryObj) return cachedCountryObj;
  if (inFlightDetectionPromise) return inFlightDetectionPromise;

  inFlightDetectionPromise = (async () => {
    // 1. Check user choice or session storage
    if (typeof window !== 'undefined') {
      try {
        const userChoice = localStorage.getItem('qmova_scanner_country');
        if (userChoice) {
          const found = getCountryByAbbr(userChoice);
          if (found) {
            cachedCountryObj = found;
            return found;
          }
        }
        const cached = sessionStorage.getItem('yq_detected_country');
        if (cached) {
          const found = getCountryByAbbr(cached);
          if (found) {
            cachedCountryObj = found;
            return found;
          }
        }
      } catch {
        // Storage restricted
      }
    }

    // 2. Fetch IP with a strict 2500ms timeout
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://get.geojs.io/v1/ip/country.json', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.country) {
          const countryObj = getCountryByAbbr(data.country);
          if (countryObj) {
            cachedCountryObj = countryObj;
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem('yq_detected_country', countryObj.country);
              } catch {}
            }
            return countryObj;
          }
        }
      }
    } catch {
      // GeoJS network failure, adblocker, or timeout
    }

    // 3. Fallback to timezone
    const abbr = detectCountryByTimezone();
    const countryObj = getCountryByAbbr(abbr) || countryCodes[0];
    cachedCountryObj = countryObj;
    return countryObj;
  })();

  try {
    const result = await inFlightDetectionPromise;
    return result;
  } finally {
    inFlightDetectionPromise = null;
  }
};

