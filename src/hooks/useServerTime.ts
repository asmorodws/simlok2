'use client';

import { useState, useEffect } from 'react';

interface ServerTimeData {
  serverTime: Date;
  jakartaDate: string; // YYYY-MM-DD format
  jakartaDateTime: string; // ISO string
  isLoaded: boolean;
  offset: number; // Difference between server and client in ms
}

let cachedServerTime: ServerTimeData | null = null;
let isFetching = false;
const fetchPromises: Array<(value: ServerTimeData) => void> = [];

/**
 * Hook to get current server time (Jakarta timezone)
 * Fetches once and caches the result
 * Calculates offset between server and client time
 */
export function useServerTime() {
  const [serverTimeData, setServerTimeData] = useState<ServerTimeData>(() => {
    if (cachedServerTime) {
      return cachedServerTime;
    }
    return {
      serverTime: new Date(),
      jakartaDate: '',
      jakartaDateTime: '',
      isLoaded: false,
      offset: 0
    };
  });

  useEffect(() => {
    // If already cached, use it
    if (cachedServerTime) {
      setServerTimeData(cachedServerTime);
      return;
    }

    // If already fetching, wait for the result
    if (isFetching) {
      const promise = new Promise<ServerTimeData>((resolve) => {
        fetchPromises.push(resolve);
      });
      promise.then(setServerTimeData);
      return;
    }

    // Fetch server time
    isFetching = true;
    
    fetch('/api/server-time', { 
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
      .then(res => res.json())
      .then(data => {
        const serverTime = new Date(data.serverTime);
        const clientTime = new Date();
        const offset = serverTime.getTime() - clientTime.getTime();

        const result: ServerTimeData = {
          serverTime,
          jakartaDate: data.jakartaDate,
          jakartaDateTime: data.jakartaDateTime,
          isLoaded: true,
          offset
        };

        cachedServerTime = result;
        setServerTimeData(result);

        // Resolve all pending promises
        fetchPromises.forEach(resolve => resolve(result));
        fetchPromises.length = 0;
        isFetching = false;
      })
      .catch(error => {
        console.error('Failed to fetch server time, falling back to client time:', error);
        
        // Fallback to Jakarta timezone calculated from client
        const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
        const serverTime = new Date(jakartaNow);
        
        const result: ServerTimeData = {
          serverTime,
          jakartaDate: serverTime.toISOString().split('T')[0] || '',
          jakartaDateTime: serverTime.toISOString(),
          isLoaded: true,
          offset: 0 // No offset as we're using client time
        };

        cachedServerTime = result;
        setServerTimeData(result);

        fetchPromises.forEach(resolve => resolve(result));
        fetchPromises.length = 0;
        isFetching = false;
      });
  }, []);

  /**
   * Get current time adjusted with server offset
   */
  const getCurrentServerTime = () => {
    if (serverTimeData.isLoaded) {
      return new Date(Date.now() + serverTimeData.offset);
    }
    // Fallback to Jakarta timezone from client
    const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    return new Date(jakartaNow);
  };

  /**
   * Get current date in YYYY-MM-DD format (Jakarta/Server time)
   */
  const getCurrentDate = () => {
    const serverTime = getCurrentServerTime();
    const year = serverTime.getFullYear();
    const month = String(serverTime.getMonth() + 1).padStart(2, '0');
    const day = String(serverTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    ...serverTimeData,
    getCurrentServerTime,
    getCurrentDate,
    /**
     * Refresh server time (useful for long-running sessions)
     */
    refresh: () => {
      cachedServerTime = null;
      setServerTimeData({
        serverTime: new Date(),
        jakartaDate: '',
        jakartaDateTime: '',
        isLoaded: false,
        offset: 0
      });
    }
  };
}
