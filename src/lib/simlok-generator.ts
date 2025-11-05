/**
 * SIMLOK Number Generator with Atomic Operations
 * 
 * This module provides thread-safe, race-condition-free SIMLOK number generation
 * using database sequences with atomic increment operations.
 * 
 * Features:
 * - Atomic number generation (prevents duplicates)
 * - Year-based sequencing
 * - Transaction-based safety
 * - Preview mode for UI display
 * 
 * @module simlok-generator
 */

import { prisma } from '@/lib/singletons';

/**
 * Generates next SIMLOK number atomically using database sequence.
 * This is thread-safe and prevents race conditions even with concurrent approvals.
 * 
 * Format: YYYY/NNNN/SMKT/OPR
 * Example: 2024/0001/SMKT/OPR
 * 
 * @param year - Year for SIMLOK number (e.g., 2024)
 * @returns Generated SIMLOK number
 * 
 * @example
 * ```typescript
 * const simlokNumber = await generateSimlokNumber(2024);
 * // Returns: "2024/0001/SMKT/OPR"
 * ```
 */
export async function generateSimlokNumber(year: number): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    // Find or create sequence for the year
    let sequence = await tx.simlokSequence.findUnique({
      where: { year }
    });

    if (!sequence) {
      // Create new sequence starting from 0
      sequence = await tx.simlokSequence.create({
        data: {
          year,
          last_number: 0
        }
      });
    }

    // CRITICAL: Atomic increment - this is where race condition is prevented
    // Database ensures only one transaction can increment at a time
    const updated = await tx.simlokSequence.update({
      where: { year },
      data: {
        last_number: { increment: 1 },
      },
    });

    // Format number with leading zeros (4 digits)
    const paddedNumber = String(updated.last_number).padStart(4, '0');
    
    return `${year}/${paddedNumber}/SMKT/OPR`;
  }, {
    // Transaction options
    maxWait: 5000, // Maximum time to wait for a transaction slot (ms)
    timeout: 10000, // Maximum time for transaction to complete (ms)
  });
}

/**
 * Preview next SIMLOK number without incrementing sequence.
 * Used for UI display/preview only - does NOT reserve the number.
 * 
 * @param year - Year for SIMLOK number
 * @returns Next SIMLOK number that would be generated
 * 
 * @example
 * ```typescript
 * const preview = await previewNextSimlokNumber(2024);
 * // Returns: "2024/0015/SMKT/OPR" (if current sequence is 14)
 * ```
 */
export async function previewNextSimlokNumber(year: number): Promise<string> {
  const sequence = await prisma.simlokSequence.findUnique({
    where: { year }
  });

  const nextNumber = (sequence?.last_number ?? 0) + 1;
  const paddedNumber = String(nextNumber).padStart(4, '0');
  
  return `${year}/${paddedNumber}/SMKT/OPR`;
}

/**
 * Get current SIMLOK sequence information for a specific year.
 * Useful for admin dashboard and debugging.
 * 
 * @param year - Year to get sequence info for
 * @returns Sequence information including last used number and next number
 * 
 * @example
 * ```typescript
 * const info = await getSimlokSequenceInfo(2024);
 * // Returns: { year: 2024, lastNumber: 14, nextNumber: 15, updatedAt: Date }
 * ```
 */
export async function getSimlokSequenceInfo(year: number) {
  const sequence = await prisma.simlokSequence.findUnique({
    where: { year }
  });

  return {
    year,
    lastNumber: sequence?.last_number ?? 0,
    nextNumber: (sequence?.last_number ?? 0) + 1,
    updatedAt: sequence?.updated_at,
    exists: !!sequence,
  };
}

/**
 * Get all SIMLOK sequences (all years).
 * Useful for admin dashboard to see historical data.
 * 
 * @returns Array of all sequences
 */
export async function getAllSimlokSequences() {
  const sequences = await prisma.simlokSequence.findMany({
    orderBy: {
      year: 'desc'
    }
  });

  return sequences.map(seq => ({
    year: seq.year,
    lastNumber: seq.last_number,
    nextNumber: seq.last_number + 1,
    updatedAt: seq.updated_at,
  }));
}

/**
 * Reset sequence for a specific year (DANGEROUS - admin only).
 * Use with extreme caution - this will cause duplicate numbers if used incorrectly.
 * 
 * @param year - Year to reset
 * @param resetTo - Number to reset to (default: 0)
 * 
 * @example
 * ```typescript
 * await resetSimlokSequence(2024, 0); // Reset 2024 sequence to 0
 * ```
 */
export async function resetSimlokSequence(year: number, resetTo: number = 0): Promise<void> {
  await prisma.simlokSequence.upsert({
    where: { year },
    create: {
      year,
      last_number: resetTo
    },
    update: {
      last_number: resetTo
    }
  });
}
