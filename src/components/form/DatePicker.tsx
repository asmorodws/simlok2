'use client';

import React, { useState, useRef, useEffect } from 'react';
import { getServerDateString } from '@/lib/helpers/serverDate';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  label,
  error,
  required = false,
  placeholder = 'Select date',
  id,
  name,
  className = '',
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value + 'T00:00:00') : new Date()
  );
  const calendarRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Generate year range: 2020 to current year + 5
  const currentYear = new Date().getFullYear();
  const yearRange = Array.from({ length: currentYear - 2020 + 6 }, (_, i) => 2020 + i);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (isOpen && calendarRef.current) {
      const calendar = calendarRef.current;
      calendar.innerHTML = '';

      const header = document.createElement('div');
      header.className =
        'flex items-center justify-between mb-4 text-gray-900 dark:text-gray-100';

      const prevButton = document.createElement('button');
      prevButton.type = 'button';
      prevButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      `;
      prevButton.className =
        'p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded';
      prevButton.onclick = () => {
        setCurrentMonth(
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        );
      };

      // Month and Year Selectors Container
      const monthYearContainer = document.createElement('div');
      monthYearContainer.className = 'flex gap-2';

      // Month Selector
      const monthSelect = document.createElement('select');
      monthSelect.className = 'px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600';
      monthNames.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index.toString();
        option.textContent = month;
        if (index === currentMonth.getMonth()) {
          option.selected = true;
        }
        monthSelect.appendChild(option);
      });
      monthSelect.onchange = (e) => {
        const target = e.target as HTMLSelectElement;
        setCurrentMonth(
          new Date(currentMonth.getFullYear(), parseInt(target.value), 1)
        );
      };

      // Year Selector
      const yearSelect = document.createElement('select');
      yearSelect.className = 'px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600';
      yearRange.forEach((year) => {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        if (year === currentMonth.getFullYear()) {
          option.selected = true;
        }
        yearSelect.appendChild(option);
      });
      yearSelect.onchange = (e) => {
        const target = e.target as HTMLSelectElement;
        setCurrentMonth(
          new Date(parseInt(target.value), currentMonth.getMonth(), 1)
        );
      };

      monthYearContainer.appendChild(monthSelect);
      monthYearContainer.appendChild(yearSelect);

      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      `;
      nextButton.className =
        'p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded';
      nextButton.onclick = () => {
        setCurrentMonth(
          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        );
      };

      header.appendChild(prevButton);
      header.appendChild(monthYearContainer);
      header.appendChild(nextButton);

      const weekdays = document.createElement('div');
      weekdays.className = 'grid grid-cols-7 gap-1 mb-2';
      ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach((day) => {
        const dayElement = document.createElement('div');
        dayElement.className =
          'text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2';
        dayElement.textContent = day;
        weekdays.appendChild(dayElement);
      });

      const daysGrid = document.createElement('div');
      daysGrid.className = 'grid grid-cols-7 gap-1 mb-4';

      const firstDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      );
      const lastDay = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      );
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      for (let i = 0; i < startingDayOfWeek; i++) {
        daysGrid.appendChild(document.createElement('div'));
      }

      const selectedDateStr = value;

      for (let day = 1; day <= daysInMonth; day++) {
        const dayButton = document.createElement('button');
        dayButton.type = 'button';
        dayButton.textContent = day.toString();

        // Format date without timezone issues: YYYY-MM-DD
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const isSelected = dateStr === selectedDateStr;

        dayButton.className = `p-2 text-sm rounded ${
          isSelected
            ? 'bg-blue-500 text-white font-semibold'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
        }`;

        dayButton.onclick = () => {
          onChange(dateStr);
          setIsOpen(false);
        };

        daysGrid.appendChild(dayButton);
      }

      const buttons = document.createElement('div');
      buttons.className = 'flex gap-2';

      const todayButton = document.createElement('button');
      todayButton.type = 'button';
      todayButton.textContent = 'Hari ini';
      todayButton.className =
        'flex-1 px-3 py-2 text-sm border border-blue-500 text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20';
      todayButton.onclick = async () => {
        try {
          const todayDate = await getServerDateString();
          onChange(todayDate);
          setIsOpen(false);
        } catch (error) {
          console.error('Error getting server date:', error);
          // Fallback to client date if server date fails
          const fallbackDate = new Date().toISOString().split('T')[0];
          if (fallbackDate) {
            onChange(fallbackDate);
            setIsOpen(false);
          }
        }
      };

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = 'Reset';
      removeButton.className =
        'flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100';
      removeButton.onclick = () => {
        onChange('');
        setIsOpen(false);
      };

      const doneButton = document.createElement('button');
      doneButton.type = 'button';
      doneButton.textContent = 'Terapkan';
      doneButton.className =
        'flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600';
      doneButton.onclick = () => {
        setIsOpen(false);
      };

      buttons.appendChild(todayButton);
      buttons.appendChild(removeButton);
      buttons.appendChild(doneButton);

      calendar.appendChild(header);
      calendar.appendChild(weekdays);
      calendar.appendChild(daysGrid);
      calendar.appendChild(buttons);
    }
  }, [isOpen, currentMonth, value, onChange]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        id={id}
        name={name}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between ${
          error
            ? 'border-red-500'
            : 'border-gray-300 dark:border-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <span>{value ? formatDisplayDate(value) : placeholder}</span>
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {isOpen && (
        <div 
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 w-70 top-full mt-1"
        >
          <div ref={calendarRef}></div>
        </div>
      )}
    </div>
  );
}
