import React from 'react';

interface PhoneInputProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  minLength?: number; // Minimum karakter (default: 9)
  maxLength?: number; // Maximum karakter (default: 13)
}

/**
 * PhoneInput component dengan prefix +62 otomatis
 * User mengetik langsung tanpa 0 (misal: 81234567890)
 * Disimpan sebagai 6281234567890 (tanpa +)
 */
export default function PhoneInput({
  id,
  name,
  value,
  onChange,
  placeholder = "81234567890",
  required = false,
  disabled = false,
  error = "",
  className = "",
  minLength = 9,  // Minimal 9 digit (contoh: 812345678)
  maxLength = 13, // Maksimal 13 digit (contoh: 8123456789012)
}: PhoneInputProps) {
  // Parse value untuk display - hilangkan +62 atau 0 di depan
  const getDisplayValue = (phoneValue: string): string => {
    if (!phoneValue) return '';
    
    // Hapus semua karakter non-digit
    const cleaned = phoneValue.replace(/\D/g, '');
    
    // Jika dimulai dengan 62, hapus 62
    if (cleaned.startsWith('62')) {
      return cleaned.substring(2);
    }
    
    // Jika dimulai dengan 0, hapus 0
    if (cleaned.startsWith('0')) {
      return cleaned.substring(1);
    }
    
    return cleaned;
  };

  const displayValue = getDisplayValue(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Hanya izinkan angka
    inputValue = inputValue.replace(/\D/g, '');
    
    // Batasi panjang maksimal
    if (inputValue.length > maxLength) {
      inputValue = inputValue.substring(0, maxLength);
    }
    
    // Buat event baru dengan value yang sudah diformat
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: inputValue, // Simpan tanpa 0 di depan
      },
    };
    
    onChange(newEvent as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className={className}>
      <div className="flex items-stretch">
        {/* Prefix Badge */}
        <span className="inline-flex items-center px-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg">
          +62
        </span>
        
        {/* Input Field */}
        <input
          id={id || name}
          name={name}
          type="tel"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          minLength={minLength}
          maxLength={maxLength}
          className={`
            flex-1 h-11 px-4 text-sm w-full
            border border-gray-200 rounded-r-lg
            focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          `}
        />
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    
    </div>
  );
}
