/**
 * Hook to detect and warn about weekend dates in submission forms
 */

import { useEffect, useState } from 'react';

interface UseWeekendDetectionReturn {
  hasWeekend: boolean;
  weekendWarning: string;
}

export function useWeekendDetection(
  dateFrom: string,
  dateTo: string
): UseWeekendDetectionReturn {
  const [hasWeekend, setHasWeekend] = useState(false);
  const [weekendWarning, setWeekendWarning] = useState('');

  useEffect(() => {
    if (!dateFrom || !dateTo) {
      setHasWeekend(false);
      setWeekendWarning('');
      return;
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      setHasWeekend(false);
      setWeekendWarning('');
      return;
    }

    let foundWeekend = false;
    const current = new Date(from);

    while (current <= to) {
      const day = current.getDay();
      if (day === 0 || day === 6) {
        // Sunday = 0, Saturday = 6
        foundWeekend = true;
        break;
      }
      current.setDate(current.getDate() + 1);
    }

    setHasWeekend(foundWeekend);
    
    if (foundWeekend) {
      setWeekendWarning(
        '⚠️ Perhatian: Rentang tanggal pelaksanaan termasuk akhir pekan (Sabtu/Minggu). ' +
        'Pastikan hal ini sudah sesuai dengan rencana kerja.'
      );
    } else {
      setWeekendWarning('');
    }
  }, [dateFrom, dateTo]);

  return {
    hasWeekend,
    weekendWarning
  };
}
