import React, { useEffect, useState } from 'react';
import PhoneInputLib from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { detectCountryByTimezone } from '../lib/country-codes';
import type { CountryCode } from 'react-phone-number-input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = '+1 234 567 8900',
  required = false,
  className = '',
  disabled = false
}: PhoneInputProps) {
  const [defaultCountry, setDefaultCountry] = useState<CountryCode>('US');

  useEffect(() => {
    // Attempt location-based country detection via timezone
    const country = detectCountryByTimezone();
    if (country) {
      setDefaultCountry(country as CountryCode);
    }
  }, []);

  const sanitizedValue = value ? value.replace(/\s+/g, '') : value;

  return (
    <div className={`phone-input-wrapper w-full ${className}`}>
      <PhoneInputLib
        international
        defaultCountry={defaultCountry}
        value={sanitizedValue}
        onChange={(val) => onChange(val || '')}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full"
      />
    </div>
  );
}
