import { PrismaClient } from '@prisma/client';

import { config } from '@/lib/utils/env';

/**
 * Global variable for Prisma client to prevent multiple instances in development
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Database client configuration
 */
const createPrismaClient = () =>
  new PrismaClient({
    log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

/**
 * Prisma client instance
 * Uses global variable in development to prevent multiple instances during hot reload
 */
export const db = globalThis.__prisma ?? createPrismaClient();

if (config.isDevelopment) {
  globalThis.__prisma = db;
}

/**
 * Database connection utilities
 */
export const dbUtils = {
  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  },

  /**
   * Gracefully disconnect from database
   */
  async disconnect(): Promise<void> {
    await db.$disconnect();
  },

  /**
   * Execute database transaction
   */
  async transaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    try {
      return await db.$transaction(fn);
    } catch (error) {
      console.error('Transaction error:', error);
      throw new DatabaseError(
        'Transaction failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },
} as const;

/**
 * Type helpers for Prisma
 */
export type DbTransaction = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Database error handling
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public meta?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Handle Prisma errors and convert to user-friendly messages
 */
export function handleDatabaseError(error: unknown): never {
  if (error instanceof Error) {
    // Prisma specific errors
    if ('code' in error) {
      const prismaError = error as { code: string; meta?: unknown };
      
      switch (prismaError.code) {
        case 'P2002':
          throw new DatabaseError('A record with this information already exists', prismaError.code, prismaError.meta);
        case 'P2025':
          throw new DatabaseError('Record not found', prismaError.code, prismaError.meta);
        case 'P2003':
          throw new DatabaseError('Invalid reference to related record', prismaError.code, prismaError.meta);
        default:
          throw new DatabaseError('Database operation failed', prismaError.code, prismaError.meta);
      }
    }
    
    throw new DatabaseError(error.message);
  }
  
  throw new DatabaseError('Unknown database error occurred');
}
