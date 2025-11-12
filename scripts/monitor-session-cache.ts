/**
 * Session Cache Performance Monitor
 * 
 * Run this script to monitor session validation cache performance
 * Usage: npx tsx scripts/monitor-session-cache.ts
 */

import { SessionService } from '@/services/session.service';

interface CacheStats {
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  avgAge: number | null;
}

async function monitorCache() {
  console.log('🔍 Session Cache Performance Monitor\n');
  console.log('=' .repeat(60));
  
  let iteration = 0;
  const INTERVAL = 5000; // 5 seconds
  
  setInterval(() => {
    iteration++;
    
    // Access cache via reflection (since it's private)
    const cache = (SessionService as any).validationCache as Map<string, { result: any; timestamp: number }>;
    const now = Date.now();
    
    if (cache.size === 0) {
      console.log(`\n[${new Date().toISOString()}] Iteration ${iteration}`);
      console.log('📊 Cache Status: EMPTY (no active sessions)');
      return;
    }
    
    // Calculate stats
    const entries = Array.from(cache.values());
    const ages = entries.map(e => now - e.timestamp);
    const stats: CacheStats = {
      size: cache.size,
      oldestEntry: ages.length > 0 ? Math.max(...ages) : null,
      newestEntry: ages.length > 0 ? Math.min(...ages) : null,
      avgAge: ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : null,
    };
    
    // Count by age buckets
    const buckets = {
      fresh: ages.filter(a => a < 10000).length,        // < 10s
      warm: ages.filter(a => a >= 10000 && a < 20000).length,  // 10-20s
      old: ages.filter(a => a >= 20000 && a < 30000).length,   // 20-30s
      stale: ages.filter(a => a >= 30000).length,       // > 30s (should not exist)
    };
    
    console.log(`\n[${new Date().toISOString()}] Iteration ${iteration}`);
    console.log('─'.repeat(60));
    console.log(`📊 Cache Size: ${stats.size} entries`);
    console.log(`⏱️  Oldest Entry: ${stats.oldestEntry ? Math.round(stats.oldestEntry / 1000) : 0}s ago`);
    console.log(`🆕 Newest Entry: ${stats.newestEntry ? Math.round(stats.newestEntry / 1000) : 0}s ago`);
    console.log(`📈 Average Age: ${stats.avgAge ? Math.round(stats.avgAge / 1000) : 0}s`);
    console.log('\n🗂️  Age Distribution:');
    console.log(`   Fresh (< 10s):  ${buckets.fresh} entries`);
    console.log(`   Warm (10-20s):  ${buckets.warm} entries`);
    console.log(`   Old (20-30s):   ${buckets.old} entries`);
    console.log(`   Stale (> 30s):  ${buckets.stale} entries ${buckets.stale > 0 ? '⚠️  SHOULD BE CLEANED!' : '✅'}`);
    
    // List cached sessions
    console.log('\n📝 Cached Sessions:');
    cache.forEach((value, key) => {
      const age = Math.round((now - value.timestamp) / 1000);
      const email = value.result.user?.email || 'N/A';
      const isValid = value.result.isValid ? '✅' : '❌';
      console.log(`   ${isValid} ${email} - Age: ${age}s - Token: ${key.substring(0, 10)}...`);
    });
    
    // Warnings
    if (buckets.stale > 0) {
      console.log('\n⚠️  WARNING: Stale entries detected! Cache cleanup may not be working properly.');
    }
    
    if (stats.size > 100) {
      console.log('\n⚠️  WARNING: Cache size is large (>100). Consider investigating high session count.');
    }
    
  }, INTERVAL);
  
  console.log('\n✅ Monitor started. Press Ctrl+C to stop.\n');
}

// Run monitor
monitorCache().catch(console.error);
