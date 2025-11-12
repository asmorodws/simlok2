'use client';

import React, { useState, useEffect, useRef } from "react";

interface TimeRangePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  interval?: number;
}

// Function to generate time options in 24-hour format
const generateTimeOptions = (interval: number) => {
  const options: string[] = [];
  for (let i = 0; i < 24 * 60; i += interval) {
    const hours = Math.floor(i / 60);
    const minutes = i % 60;
    const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    options.push(timeString);
  }
  return options;
};

export default function TimeRangePicker({
  value,
  onChange,
  label,
  error,
  required = false,
  placeholder = "Pilih rentang waktu",
  id,
  name,
  className = '',
  disabled = false,
  interval = 60,
}: TimeRangePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeScrollRef = useRef<HTMLDivElement>(null);
  const endTimeScrollRef = useRef<HTMLDivElement>(null);
  const [times] = useState(generateTimeOptions(interval));

  // Parse value when component mounts or value changes
  useEffect(() => {
    if (value && value.trim()) {
      // Parse format: "08:00 - 17:00" or "08:00 WIB - 17:00 WIB"
      const parts = value.split(' - ');
      if (parts.length === 2 && parts[0] && parts[1]) {
        const start = parts[0].replace(/\s*WIB\s*/gi, '').trim();
        const end = parts[1].replace(/\s*WIB\s*/gi, '').trim();
        setStartTime(start);
        setEndTime(end);
      }
    } else {
      setStartTime("");
      setEndTime("");
    }
  }, [value]);

  // Toggle dropdown visibility
  const toggleDropdownVisibility = () => {
    if (!disabled) {
      setIsVisible(!isVisible);
    }
  };

  // Handle start time selection
  const handleStartTimeSelection = (time: string) => {
    setStartTime(time);
    // Don't clear end time anymore - allow any time selection
  };

  // Handle end time selection
  const handleEndTimeSelection = (time: string) => {
    setEndTime(time);
  };

  // Apply time range
  const handleApply = () => {
    if (startTime && endTime) {
      onChange(`${startTime} - ${endTime}`);
      setIsVisible(false);
    }
  };

  // Reset selection
  const handleReset = () => {
    setStartTime("");
    setEndTime("");
    onChange("");
  };

  // Scroll functions for better UX
  const scrollStartTime = (direction: 'up' | 'down') => {
    if (startTimeScrollRef.current) {
      const scrollAmount = direction === 'up' ? -40 : 40;
      startTimeScrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollEndTime = (direction: 'up' | 'down') => {
    if (endTimeScrollRef.current) {
      const scrollAmount = direction === 'up' ? -40 : 40;
      endTimeScrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  return (
    <>
      <style jsx>{`
        /* Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Input with Icons */}
          <div className="relative flex items-center">
            {/* Clock Icon */}
            <span className="absolute left-0 pl-3 text-gray-500 dark:text-gray-400">
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_3185_947)">
                  <path
                    d="M10.4687 10.3125V5.28125C10.4687 4.90625 10.1562 4.59375 9.78125 4.59375C9.40625 4.59375 9.09375 4.90625 9.09375 5.28125V10.5937C9.09375 10.7812 9.15625 10.9687 9.28125 11.0937L12.75 14.625C12.875 14.75 13.0625 14.8437 13.25 14.8437C13.4375 14.8437 13.5937 14.7812 13.75 14.6562C14.0312 14.375 14.0312 13.9375 13.75 13.6562L10.4687 10.3125Z"
                    fill="currentColor"
                  />
                  <path
                    d="M10 0.46875C4.78125 0.46875 0.5625 4.75 0.5625 10C0.5625 15.25 4.8125 19.5312 10 19.5312C15.1875 19.5312 19.4375 15.25 19.4375 10C19.4375 4.75 15.2188 0.46875 10 0.46875ZM10 18.125C5.5625 18.125 1.9375 14.4688 1.9375 10C1.9375 5.53125 5.5625 1.875 10 1.875C14.4375 1.875 18.0625 5.53125 18.0625 10C18.0625 14.4688 14.4375 18.125 10 18.125Z"
                    fill="currentColor"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_3185_947">
                    <rect width="20" height="20" fill="white" />
                  </clipPath>
                </defs>
              </svg>
            </span>

            <input
              ref={inputRef}
              id={id}
              name={name}
              type="text"
              className={`w-full rounded-md border bg-white dark:bg-gray-700 py-2.5 pl-12 pr-10 text-gray-900 dark:text-gray-100 outline-none transition ${
                error
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
              placeholder={placeholder}
              readOnly
              value={value}
              onClick={toggleDropdownVisibility}
              disabled={disabled}
              required={required}
            />
            <span
              className={`absolute right-0 pr-3 text-gray-500 dark:text-gray-400 ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={toggleDropdownVisibility}
            >
              {/* Arrow Down Icon */}
              <svg
                className="fill-current stroke-current"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.29635 5.15354L2.29632 5.15357L2.30055 5.1577L7.65055 10.3827L8.00157 10.7255L8.35095 10.381L13.701 5.10603L13.701 5.10604L13.7035 5.10354C13.722 5.08499 13.7385 5.08124 13.7499 5.08124C13.7613 5.08124 13.7778 5.08499 13.7963 5.10354C13.8149 5.12209 13.8187 5.13859 13.8187 5.14999C13.8187 5.1612 13.815 5.17734 13.7973 5.19552L8.04946 10.8433L8.04945 10.8433L8.04635 10.8464C8.01594 10.8768 7.99586 10.8921 7.98509 10.8992C7.97746 10.8983 7.97257 10.8968 7.96852 10.8952C7.96226 10.8929 7.94944 10.887 7.92872 10.8721L2.20253 5.2455C2.18478 5.22733 2.18115 5.2112 2.18115 5.19999C2.18115 5.18859 2.18491 5.17209 2.20346 5.15354C2.222 5.13499 2.2385 5.13124 2.2499 5.13124C2.2613 5.13124 2.2778 5.13499 2.29635 5.15354Z"
                  fill="currentColor"
                  stroke="currentColor"
                />
              </svg>
            </span>
          </div>

          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

          {/* Dropdown Container */}
          {isVisible && (
            <div
              ref={dropdownRef}
              className="absolute right-0 z-50 mt-2 w-[320px] rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-lg"
            >
              <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Pilih Rentang Waktu
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Start Time Column */}
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Waktu Mulai
                  </div>
                  <div className="relative">
                    {/* Scroll Up Button */}
                    <button
                      type="button"
                      onClick={() => scrollStartTime('up')}
                      className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white dark:from-gray-800 to-transparent py-2 flex justify-center hover:from-gray-50 dark:hover:from-gray-700 transition"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    <div 
                      ref={startTimeScrollRef}
                      className="no-scrollbar max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded pt-8 pb-8"
                    >
                      {times.map((time, index) => {
                        const isSelected = time === startTime;
                        return (
                          <div
                            key={`start-${index}`}
                            className={`cursor-pointer px-3 py-2 text-sm text-center transition ${
                              isSelected
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => handleStartTimeSelection(time)}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Scroll Down Button */}
                    <button
                      type="button"
                      onClick={() => scrollStartTime('down')}
                      className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white dark:from-gray-800 to-transparent py-2 flex justify-center hover:from-gray-50 dark:hover:from-gray-700 transition"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* End Time Column */}
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Waktu Selesai
                  </div>
                  <div className="relative">
                    {/* Scroll Up Button */}
                    <button
                      type="button"
                      onClick={() => scrollEndTime('up')}
                      className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-white dark:from-gray-800 to-transparent py-2 flex justify-center hover:from-gray-50 dark:hover:from-gray-700 transition"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    
                    <div 
                      ref={endTimeScrollRef}
                      className="no-scrollbar  max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded pt-8 pb-8"
                    >
                      {times.map((time, index) => {
                        const isSelected = time === endTime;
                        return (
                          <div
                            key={`end-${index}`}
                            className={`cursor-pointer px-3 py-2 text-sm text-center transition ${
                              isSelected
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => handleEndTimeSelection(time)}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Scroll Down Button */}
                    <button
                      type="button"
                      onClick={() => scrollEndTime('down')}
                      className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-white dark:from-gray-800 to-transparent py-2 flex justify-center hover:from-gray-50 dark:hover:from-gray-700 transition"
                    >
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {startTime && endTime && (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-center text-blue-800 dark:text-blue-300">
                  <strong>Preview:</strong> {startTime} - {endTime}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Reset
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVisible(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={!startTime || !endTime}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
