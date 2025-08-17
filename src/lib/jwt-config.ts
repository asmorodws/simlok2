// JWT Configuration
export const JWT_CONFIG = {
  // 6 hours in seconds (default)
  EXPIRE_TIME: parseInt(process.env.JWT_EXPIRE_TIME || '21600'),
  
  // Session max age - 6 hours (default)
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '21600'),
  
  // Update session every 30 minutes (default)
  SESSION_UPDATE_AGE: parseInt(process.env.SESSION_UPDATE_AGE || '1800'),
  
  // Warning before expiry in minutes (default 5 minutes)
  WARNING_BEFORE_EXPIRY: parseInt(process.env.JWT_WARNING_MINUTES || '5'),
  
  // Auto refresh interval in minutes (default 30 minutes)
  AUTO_REFRESH_INTERVAL: parseInt(process.env.JWT_REFRESH_INTERVAL || '30'),
};

// Helper function to get remaining time until expiry
export function getTimeUntilExpiry(issuedAt: number): number {
  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = issuedAt + JWT_CONFIG.EXPIRE_TIME;
  return Math.max(0, expiryTime - currentTime);
}

// Helper function to check if token is expired
export function isTokenExpired(issuedAt: number): boolean {
  return getTimeUntilExpiry(issuedAt) === 0;
}

// Helper function to check if token needs refresh
export function shouldRefreshToken(issuedAt: number): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  const timeSinceIssued = currentTime - issuedAt;
  return timeSinceIssued >= JWT_CONFIG.SESSION_UPDATE_AGE;
}

// Helper function to format time for display
export function formatExpiryTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
