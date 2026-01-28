/**
 * Check if a date range contains weekend days (Saturday or Sunday)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns true if the range contains at least one Saturday or Sunday
 */
export function hasWeekendInRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    // Iterate through each day in the range
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking weekend in range:', error);
    return false;
  }
}

/**
 * Get list of weekend dates in a date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of weekend dates in YYYY-MM-DD format
 */
export function getWeekendsInRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }
    
    const weekends: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        weekends.push(`${year}-${month}-${day}`);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return weekends;
  } catch (error) {
    console.error('Error getting weekends in range:', error);
    return [];
  }
}
