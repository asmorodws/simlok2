/**
 * Base Repository Pattern Implementation
 * 
 * This abstract class provides common CRUD operations for all entities.
 * It follows the Repository pattern to abstract database operations
 * and provides a consistent interface for data access.
 * 
 * Benefits:
 * - Consistent API across all repositories
 * - Easy to mock for testing
 * - Centralizes common database operations
 * - Type-safe database operations
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/singletons';

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected readonly prisma: PrismaClient = prisma;

  /**
   * Get the Prisma model delegate - to be implemented by concrete repositories
   */
  protected abstract getModel(): any;

  /**
   * Create a new record
   */
  async create(data: CreateInput): Promise<T> {
    return this.getModel().create({ data });
  }

  /**
   * Find a record by ID
   */
  async findById(id: string, include?: any): Promise<T | null> {
    return this.getModel().findUnique({ 
      where: { id },
      ...(include && { include })
    });
  }

  /**
   * Find multiple records with optional filtering, sorting, and pagination
   */
  async findMany(params?: {
    where?: any;
    orderBy?: any;
    skip?: number;
    take?: number;
    include?: any;
    select?: any;
  }): Promise<T[]> {
    return this.getModel().findMany(params);
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: UpdateInput): Promise<T> {
    return this.getModel().update({
      where: { id },
      data
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<T> {
    return this.getModel().delete({ where: { id } });
  }

  /**
   * Count records with optional filtering
   */
  async count(where?: any): Promise<number> {
    return this.getModel().count({ where });
  }

  /**
   * Check if a record exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.getModel().count({ 
      where: { id } 
    });
    return count > 0;
  }

  /**
   * Find first record matching criteria
   */
  async findFirst(params?: {
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
  }): Promise<T | null> {
    return this.getModel().findFirst(params);
  }

  /**
   * Batch operations for better performance
   */
  async createMany(data: CreateInput[]): Promise<Prisma.BatchPayload> {
    return this.getModel().createMany({ data });
  }

  async updateMany(where: any, data: Partial<UpdateInput>): Promise<Prisma.BatchPayload> {
    return this.getModel().updateMany({ where, data });
  }

  async deleteMany(where: any): Promise<Prisma.BatchPayload> {
    return this.getModel().deleteMany({ where });
  }

  /**
   * Execute raw database operations (use with caution)
   */
  protected async executeRaw(query: string): Promise<any> {
    return this.prisma.$executeRaw`${query}`;
  }

  protected async queryRaw(query: string): Promise<any> {
    return this.prisma.$queryRaw`${query}`;
  }

  /**
   * Transaction support
   */
  protected async transaction<R>(
    fn: (prisma: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    return this.prisma.$transaction(fn);
  }
}

/**
 * Repository interface for type safety
 */
export interface IRepository<T, CreateInput, UpdateInput> {
  create(data: CreateInput): Promise<T>;
  findById(id: string, include?: any): Promise<T | null>;
  findMany(params?: any): Promise<T[]>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<T>;
  count(where?: any): Promise<number>;
  exists(id: string): Promise<boolean>;
}

/**
 * Common repository error types
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} with ID ${id} not found`, 'NOT_FOUND', 'findById');
  }
}

export class ConflictError extends RepositoryError {
  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} ${value} already exists`, 'CONFLICT', 'create');
  }
}