import { getCountries, getCountryCallingCode } from 'react-phone-number-input/input';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export const countryCodes = getCountries().map(country => {
  let name = country;
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
      'Asia/Calcutta': 'IN',
    };
    
    // First try the custom map for common ones
    if (tzMap[timezone]) return tzMap[timezone];
    
    // Attempt to extract country from timezone (e.g. 'Europe/Paris')
    return 'US';
  } catch {
    return 'US';
  }
};

export const detectCountryCode = async () => {
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/country.json');
    const data = await res.json();
    if (data && data.country) {
      const countryObj = getCountryByAbbr(data.country);
      if (countryObj) return countryObj;
    }
  } catch (e) {
    // Ignore geojs failure
  }
  const abbr = detectCountryByTimezone();
  const countryObj = getCountryByAbbr(abbr);
  return countryObj || countryCodes[0];
};
