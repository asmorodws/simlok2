#!/usr/bin/env ts-node
/**
 * Clear PDF Image Cache
 * 
 * This script clears the in-memory image cache used by the PDF generator.
 * Run this if you encounter "Unknown compression method" errors in PDF generation.
 * 
 * Usage:
 *   npx ts-node scripts/clear-pdf-cache.ts
 */

import { clearImageCache } from '../src/utils/pdf/imageLoader';

console.log('🧹 Clearing PDF image cache...');
clearImageCache();
console.log('✅ Image cache cleared successfully!');
console.log('💡 Tip: Restart the server to ensure all caches are cleared.');
