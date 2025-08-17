// src/utils/jwt-config.ts

/**
 * JWT Configuration utilities
 * Allows customization of JWT expiry times through environment variables
 */

export const JWT_CONFIG = {
  // Default: 24 hours (86400 seconds)
  JWT_EXPIRE_TIME: parseInt(process.env.JWT_EXPIRE_TIME || '86400'),
  
  // Default: 24 hours (86400 seconds)
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '86400'),
  
  // Default: 1 hour (3600 seconds) - how often session gets updated when user is active
  SESSION_UPDATE_AGE: parseInt(process.env.SESSION_UPDATE_AGE || '3600'),
  
  // Client-side warning time (in minutes before expiry)
  WARNING_BEFORE_EXPIRY: parseInt(process.env.WARNING_BEFORE_EXPIRY || '5'),
  
  // Auto refresh interval (in minutes)
  AUTO_REFRESH_INTERVAL: parseInt(process.env.AUTO_REFRESH_INTERVAL || '30'),
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
