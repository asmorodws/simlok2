import { z } from 'zod';

/**
 * Environment variables validation schema
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // NextAuth
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional: File uploads
  UPLOAD_DIR: z.string().default('public/uploads'),
  MAX_FILE_SIZE: z.string().default('5242880').transform(val => parseInt(val, 10)), // 5MB

  // Optional: External services
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(val => parseInt(val, 10)).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

/**
 * Validated environment variables
 * Use this instead of process.env directly for type safety
 */
export const env = envSchema.parse(process.env);

/**
 * Environment-specific configurations
 */
export const config = {
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  // Database
  database: {
    url: env.DATABASE_URL,
  },

  // Authentication
  auth: {
    url: env.NEXTAUTH_URL,
    secret: env.NEXTAUTH_SECRET,
  },

  // File uploads
  uploads: {
    dir: env.UPLOAD_DIR,
    maxFileSize: env.MAX_FILE_SIZE,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },

  // API
  api: {
    baseUrl: env.NEXTAUTH_URL,
    timeout: 30000, // 30 seconds
  },

  // UI
  ui: {
    toastDuration: 5000,
    modalAnimationDuration: 200,
  },
} as const;

export type Config = typeof config;
