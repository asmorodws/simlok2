'use client';

import React, { useState, useEffect } from 'react';
import { getServerDateString } from '@/lib/serverDate';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Sync tempStartDate and tempEndDate with props when they change
  useEffect(() => {
    setTempStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    setTempEndDate(endDate);
  }, [endDate]);

  // Generate year range: 2020 to current year + 5
  const currentYear = new Date().getFullYear();
  const yearRange = Array.from({ length: currentYear - 2020 + 6 }, (_, i) => 2020 + i);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Format date without timezone issues: YYYY-MM-DD
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(formattedDate);
      setTempEndDate('');
    } else if (tempStartDate && !tempEndDate) {
      if (formattedDate < tempStartDate) {
        setTempStartDate(formattedDate);
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(formattedDate);
      }
    }
  };

  const handleApply = () => {
    onStartDateChange(tempStartDate);
    onEndDateChange(tempEndDate);
    setIsOpen(false);
  };

  const handleTodayClick = async () => {
    try {
      const todayDate = await getServerDateString();
      setTempStartDate(todayDate);
      setTempEndDate(todayDate);
      onStartDateChange(todayDate);
      onEndDateChange(todayDate);
      setIsOpen(false);
    } catch (error) {
      console.error('Error getting server date:', error);
      // Fallback to client date if server date fails
      const fallbackDate = new Date().toISOString().split('T')[0];
      if (fallbackDate) {
        setTempStartDate(fallbackDate);
        setTempEndDate(fallbackDate);
        onStartDateChange(fallbackDate);
        onEndDateChange(fallbackDate);
        setIsOpen(false);
      }
    }
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsOpen(false);
  };

  const isDateInRange = (day: number) => {
    if (!tempStartDate || !tempEndDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr >= tempStartDate && dateStr <= tempEndDate;
  };

  const isStartDate = (day: number) => {
    if (!tempStartDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === tempStartDate;
  };

  const isEndDate = (day: number) => {
    if (!tempEndDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === tempEndDate;
  };

  const changeMonth = (delta: number) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1)
    );
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between"
      >
        <span>
          {startDate && endDate
            ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
            : 'Pilih rentang tanggal'}
        </span>
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

      {isOpen && (
        <div 
          className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 top-full mt-1"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            
            <div className="flex gap-2">
              {/* Month Selector */}
              <select
                value={currentMonth.getMonth()}
                onChange={(e) => setCurrentMonth(
                  new Date(currentMonth.getFullYear(), parseInt(e.target.value), 1)
                )}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {monthNames.map((month, index) => (
                  <option key={month} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={currentMonth.getFullYear()}
                onChange={(e) => setCurrentMonth(
                  new Date(parseInt(e.target.value), currentMonth.getMonth(), 1)
                )}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {yearRange.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startingDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const inRange = isDateInRange(day);
              const isStart = isStartDate(day);
              const isEnd = isEndDate(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`
                    p-2 text-sm rounded
                    ${
                      isStart || isEnd
                        ? 'bg-blue-500 text-white font-semibold'
                        : inRange
                        ? 'bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-gray-100'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleTodayClick}
              className="flex-1 px-3 py-2 text-sm border border-blue-500 text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Hari ini
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
