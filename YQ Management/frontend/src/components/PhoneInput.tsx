import React, { useEffect, useState } from 'react';
import PhoneInputLib from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { detectCountryCode, getInitialCountryIso } from '../lib/country-codes';
import type { Country } from 'react-phone-number-input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  defaultCountry?: Country;
}

export default function PhoneInput({
  value,
  onChange,
  placeholder = '+1 234 567 8900',
  required = false,
  className = '',
  disabled = false,
  defaultCountry: propDefaultCountry
}: PhoneInputProps) {
  const [defaultCountry, setDefaultCountry] = useState<Country>(
    propDefaultCountry || (getInitialCountryIso() as Country) || 'US'
  );

  useEffect(() => {
    if (propDefaultCountry) {
      setDefaultCountry(propDefaultCountry);
      return;
    }

    // IP-based country detection with fallback to timezone
    let isMounted = true;
    detectCountryCode().then((countryObj) => {
      if (isMounted && countryObj && countryObj.country) {
        setDefaultCountry(countryObj.country as Country);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [propDefaultCountry]);

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
