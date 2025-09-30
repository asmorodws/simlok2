'use client';

import { useState, useEffect } from 'react';
import { ClockIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface TimePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function TimePicker({
  id,
  name,
  value,
  onChange,
  placeholder = "Pilih waktu",
  required = false,
  disabled = false,
  className
}: TimePickerProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Generate time options (00:00 to 23:00 with 1 hour intervals)
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      const formattedHour = hour.toString().padStart(2, '0');
      times.push(`${formattedHour}:00`);
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Parse existing value if any
  useEffect(() => {
    if (value) {
      if (value.includes(' - ')) {
        const parts = value.split(' - ');
        if (parts.length >= 2 && parts[0] && parts[1]) {
          setStartTime(parts[0].trim());
          setEndTime(parts[1].replace(' WIB', '').trim());
        }
      } else if (value.includes(' s/d ')) {
        const parts = value.split(' s/d ');
        if (parts.length >= 2 && parts[0] && parts[1]) {
          setStartTime(parts[0].trim());
          setEndTime(parts[1].replace(' WIB', '').trim());
        }
      }
    }
  }, [value]);

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
  };

  const handleApply = () => {
    if (startTime && endTime) {
      const timeRange = `${startTime} WIB - ${endTime} WIB`;
      if (onChange) {
        onChange(timeRange);
      }
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    setStartTime('');
    setEndTime('');
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="relative">
      <div 
        className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
        } ${className || ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          id={id}
          name={name}
          type="text"
          value={value || ''}
          placeholder={placeholder}
          readOnly
          required={required}
          disabled={disabled}
          className="w-full bg-transparent outline-none cursor-pointer"
        />
        <ClockIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>

      {isOpen && !disabled && (
        <>
          {/* Overlay to close dropdown when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-xl min-w-[350px]">
            <div className="p-4 space-y-4">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Pilih Rentang Waktu Kerja
              </div>
              
              {/* Start Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waktu Mulai
                </label>
                <div className="relative">
                  <select
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">-- Pilih Waktu Mulai --</option>
                    {timeOptions.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* End Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waktu Selesai
                </label>
                <div className="relative">
                  <select
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    disabled={!startTime}
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 appearance-none bg-white ${
                      !startTime 
                        ? 'bg-gray-50 cursor-not-allowed text-gray-400'
                        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  >
                    <option value="">
                      {!startTime ? '-- Pilih waktu mulai terlebih dahulu --' : '-- Pilih Waktu Selesai --'}
                    </option>
                    {timeOptions.map((time) => (
                      <option key={`end-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Preview */}
              {startTime && endTime && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="text-sm text-blue-800">
                    <strong>Preview:</strong> {startTime} - {endTime} WIB
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between space-x-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Reset
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!startTime || !endTime}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
