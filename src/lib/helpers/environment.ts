/**
 * Environment utilities untuk production optimization
 */

export const isProd = process.env.NODE_ENV === 'production';
export const isDev = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Conditional execution berdasarkan environment
 */
export const runInDev = <T>(fn: () => T): T | undefined => {
  if (isDev) {
    return fn();
  }
  return undefined;
};

export const runInProd = <T>(fn: () => T): T | undefined => {
  if (isProd) {
    return fn();
  }
  return undefined;
};

/**
 * Get environment variable dengan fallback
 */
export const getEnv = (key: string, fallback = ''): string => {
  return process.env[key] ?? fallback;
};

/**
 * Check jika feature flag enabled
 */
export const isFeatureEnabled = (feature: string): boolean => {
  const featureFlag = process.env[`FEATURE_${feature.toUpperCase()}`];
  return featureFlag === 'true' || featureFlag === '1';
};

/**
 * Get build time info
 */
export const getBuildInfo = () => {
  return {
    env: process.env.NODE_ENV,
    buildTime: process.env.BUILD_TIME || 'unknown',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
  };
};
