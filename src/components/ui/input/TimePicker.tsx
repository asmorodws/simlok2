'use client';

import React, { useState, useEffect, useRef } from "react";
import InputWrapper from './InputWrapper';

interface TimePickerProps {
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

export default function TimePicker({
  value,
  onChange,
  label,
  error,
  required = false,
  placeholder = "Pilih waktu",
  id,
  name,
  className = '',
  disabled = false,
  interval = 60,
}: TimePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timepickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [times] = useState(generateTimeOptions(interval));

  // Toggle timepicker visibility
  const toggleTimepickerVisibility = () => {
    if (!disabled) {
      setIsVisible(!isVisible);
    }
  };

  // Handle time selection
  const handleTimeSelection = (time: string) => {
    onChange(time);
    setIsVisible(false);
  };

  // Close timepicker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timepickerRef.current &&
        !timepickerRef.current.contains(event.target as Node) &&
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
    <InputWrapper error={error}>
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
          {/* Timepicker Input with Icons */}
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
              onClick={toggleTimepickerVisibility}
              disabled={disabled}
              required={required}
            />
            <span
              className={`absolute right-0 pr-3 text-gray-500 dark:text-gray-400 ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
              onClick={toggleTimepickerVisibility}
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

          {/* Timepicker Container */}
          {isVisible && (
            <div
              ref={timepickerRef}
              className="no-scrollbar absolute right-0 z-50 mt-2 h-[300px] w-[120px] overflow-hidden overflow-y-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 shadow-lg"
            >
              {times.map((time, index) => {
                const isSelected = time === value;
                return (
                  <div
                    key={index}
                    className={`time-option cursor-pointer rounded-md px-3 py-2 text-center text-sm transition ${
                      isSelected
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => handleTimeSelection(time)}
                  >
                    {time}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </InputWrapper>
  );
}
