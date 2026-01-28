// src/utils/jwt-config.ts

/**
 * JWT Configuration utilities
 * Allows customization of JWT expiry times through environment variables
 */

export const JWT_CONFIG = {
  // Default: 24 hours (86400 seconds) - JWT token expiry
  JWT_EXPIRE_TIME: parseInt(process.env.JWT_EXPIRE_TIME || '86400'),
  
  // Default: 24 hours (86400 seconds) - Database session max age  
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '86400'),
  
  // Default: 2 hours (7200 seconds) - How often session gets updated when user is active
  SESSION_UPDATE_AGE: parseInt(process.env.SESSION_UPDATE_AGE || '7200'),
  
  // Default: 2 hours (7200 seconds) - Idle timeout before auto-logout
  SESSION_IDLE_TIMEOUT: parseInt(process.env.SESSION_IDLE_TIMEOUT || '7200'),
  
  // Default: 7 days (604800 seconds) - Absolute session timeout
  SESSION_ABSOLUTE_TIMEOUT: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT || '604800'),
  
  // Client-side warning time (in minutes before expiry)
  WARNING_BEFORE_EXPIRY: parseInt(process.env.WARNING_BEFORE_EXPIRY || '10'),
  
  // Auto refresh interval (in minutes)
  AUTO_REFRESH_INTERVAL: parseInt(process.env.AUTO_REFRESH_INTERVAL || '15'),
} as const;

export const formatExpiryTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const getExpiryDate = (fromNow: number = JWT_CONFIG.JWT_EXPIRE_TIME): Date => {
  return new Date(Date.now() + (fromNow * 1000));
};

export const isTokenExpired = (exp: number): boolean => {
  const now = Date.now() / 1000;
  return now >= exp;
};

export const getTimeUntilExpiry = (exp: number): number => {
  const now = Date.now() / 1000;
  return Math.max(0, exp - now);
};
