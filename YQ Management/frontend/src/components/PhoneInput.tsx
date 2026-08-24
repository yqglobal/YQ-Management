import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { countryCodes, getCountryByCode, getCountryByAbbr, detectCountryByTimezone, detectCountryCode } from '../lib/country-codes';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoDetect?: boolean;
}

export default function PhoneInput({
  value,
  onChange,
  countryCode,
  onCountryCodeChange,
  placeholder = '+1 234 567 8900',
  required = false,
  className = '',
  autoDetect = false,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedCountry = getCountryByCode(countryCode) || countryCodes[0];

  useEffect(() => {
    if (autoDetect) {
      detectCountryCode().then(country => {
        if (country && country.code !== countryCode) {
          onCountryCodeChange(country.code);
        }
      });
    }
  }, [autoDetect]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s-]/g, '');
    onChange(raw);
  };

  return (
    <div className={`flex rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/50 ${className}`}>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-3 bg-gray-50 dark:bg-black/50 border-r border-gray-300 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors min-w-[90px]"
        >
          <span className="text-sm font-medium">{selectedCountry?.code}</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-[9999] max-h-60 overflow-y-auto">
            {countryCodes.map((c) => (
              <button
                key={`${c.code}-${c.name}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCountryCodeChange(c.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between ${c.code === countryCode ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}
              >
                <span>{c.name}</span>
                <span className="text-gray-500 dark:text-zinc-400 font-mono text-xs">{c.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="tel"
        value={value}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        required={required}
        className="flex-1 bg-white dark:bg-black/50 px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all rounded-r-xl"
      />
    </div>
  );
}
