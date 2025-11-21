# Testing Concurrent Approvals for SIMLOK Number Generation

## 🎯 Purpose

This test suite verifies that the SIMLOK number generation is:
1. ✅ **No Duplicates** - Each submission gets a unique number
2. ✅ **Sequential** - Numbers are generated in order without gaps
3. ✅ **Thread-Safe** - Works correctly under concurrent load
4. ✅ **Transaction-Safe** - Database locks prevent race conditions

## 🚀 Quick Start

### Basic Test (20 submissions, 10 concurrent)
```bash
npx ts-node scripts/test-concurrent-approvals.ts
```

### Custom Test
```bash
# Test with 50 submissions, 20 concurrent approvals
npx ts-node scripts/test-concurrent-approvals.ts -s 50 -c 20
```

### Stress Test
```bash
# Extreme test: 100 submissions, 50 concurrent
npx ts-node scripts/test-concurrent-approvals.ts -s 100 -c 50
```

## 📋 Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--submissions` | `-s` | Number of test submissions to create | 20 |
| `--concurrent` | `-c` | Number of concurrent approvals per batch | 10 |
| `--help` | `-h` | Show help message | - |

## 🔍 What the Test Does

### 1. **Setup Phase**
```
📝 Creating test submissions...
......................
✅ Created 20 test submissions
```
- Creates test submissions in PENDING_APPROVAL status
- All submissions are already reviewed (MEETS_REQUIREMENTS)
- Ready for immediate approval

### 2. **Concurrent Approval Phase**
```
⚡ Approving 20 submissions with concurrency: 10...

📦 Processing batch 1 (10 submissions)...
✓✓✓✓✓✓✓✓✓✓

📦 Processing batch 2 (10 submissions)...
✓✓✓✓✓✓✓✓✓✓
```
- Approves submissions in concurrent batches
- Each `✓` = successful approval with unique SIMLOK
- Each `✗` = failed approval (should not happen)

### 3. **Analysis Phase**
```
📊 ANALYSIS RESULTS:

✅ NO DUPLICATES: All SIMLOK numbers are unique!
✅ SEQUENTIAL: Numbers are perfectly sequential (1 to 20)

📈 PERFORMANCE:
   Average approval time: 85ms
   Min: 42ms
   Max: 234ms
   Total: 20 approvals

📋 ALL SIMLOK NUMBERS (sorted):
     1. 1/S00330/2025-S0 (42ms)
     2. 2/S00330/2025-S0 (56ms)
     3. 3/S00330/2025-S0 (73ms)
     ...
    20. 20/S00330/2025-S0 (89ms)

================================================================================
✅✅✅ TEST PASSED: Sequential numbering works perfectly! ✅✅✅
================================================================================
```

## 🧪 Test Scenarios

### Scenario 1: Low Concurrency (Safe)
```bash
npx ts-node scripts/test-concurrent-approvals.ts -s 10 -c 2
```
**Expected:** All approvals succeed, perfect sequence

### Scenario 2: Medium Concurrency (Normal)
```bash
npx ts-node scripts/test-concurrent-approvals.ts -s 20 -c 10
```
**Expected:** Some serialization, all unique, all sequential

### Scenario 3: High Concurrency (Stress)
```bash
npx ts-node scripts/test-concurrent-approvals.ts -s 50 -c 25
```
**Expected:** 
- Longer wait times (lock contention)
- All still unique and sequential
- Some requests may take 500-1000ms

### Scenario 4: Extreme Concurrency (Breaking Point)
```bash
npx ts-node scripts/test-concurrent-approvals.ts -s 100 -c 50
```
**Expected:**
- High lock contention
- Possible timeouts (5s maxWait)
- But NO duplicates - either success or timeout error

## 📊 Success Criteria

### ✅ Test PASSES if:
1. **Zero Duplicates** - No SIMLOK number appears twice
2. **Perfect Sequence** - Numbers are: 1, 2, 3, 4, ..., N (no gaps)
3. **All Approvals Succeed** - Every submission gets approved
4. **Performance Acceptable** - Average < 500ms per approval

### ❌ Test FAILS if:
1. **Any Duplicates** - Even one duplicate = FAILURE
2. **Gaps in Sequence** - Missing numbers (except from deletions)
3. **Silent Failures** - Approval claims success but no SIMLOK assigned

## 🔧 Troubleshooting

### Problem: Test hangs or timeouts

**Cause:** Database lock timeout (>5s wait for lock)

**Solution:** 
- Reduce concurrency: `-c 5` instead of `-c 50`
- Increase timeout in code:
  ```typescript
  {
    maxWait: 10000,  // Increase from 5s to 10s
    timeout: 20000,  // Increase from 10s to 20s
  }
  ```

### Problem: "No VENDOR user found"

**Cause:** Test database doesn't have vendor user

**Solution:**
```bash
# Create a vendor user first
npx prisma db seed
# Or manually create via admin panel
```

### Problem: Test passes but production has duplicates

**Cause:** Unique constraint not applied yet

**Solution:**
```bash
# Apply the migration
npx prisma migrate deploy

# Verify constraint exists
mysql -u root -p simlok2
mysql> SHOW INDEX FROM Submission WHERE Key_name = 'Submission_simlok_number_key';
```

## 📈 Performance Benchmarks

### Expected Performance (Development MySQL on localhost)

| Concurrent | Submissions | Avg Time | Total Time | Status |
|-----------|-------------|----------|------------|--------|
| 1 | 10 | 50ms | 500ms | ✅ Excellent |
| 5 | 20 | 80ms | 1.6s | ✅ Good |
| 10 | 50 | 120ms | 6s | ✅ Acceptable |
| 25 | 100 | 250ms | 25s | ⚠️ Slow (but safe) |
| 50 | 100 | 500ms | 50s | ⚠️ Very slow |

**Note:** Production database with proper indexes will be faster

## 🔐 What This Test Validates

### 1. **Transaction Isolation**
```typescript
// FOR UPDATE locks the row
const last = await tx.$queryRaw`SELECT ... FOR UPDATE`;
```
✅ Verifies that concurrent requests wait for lock

### 2. **Atomic Number Generation**
```typescript
await prisma.$transaction(async (tx) => {
  const number = await generateInTransaction(tx);
  await tx.submission.update({ simlok_number: number });
});
```
✅ Verifies read-increment-write is atomic

### 3. **Unique Constraint**
```sql
CREATE UNIQUE INDEX `Submission_simlok_number_key` ...
```
✅ Verifies database rejects duplicates

### 4. **Serializable Isolation**
```typescript
isolationLevel: 'Serializable'
```
✅ Verifies highest isolation level prevents anomalies

## 🗑️ Cleanup

After test completes, you'll be prompted:
```
🗑️  Delete test submissions? (y/N):
```

- **y** - Deletes all test data (recommended)
- **N** - Keeps test data for manual inspection

Manual cleanup:
```sql
DELETE FROM Submission WHERE vendor_name LIKE 'TEST_VENDOR_%';
```

## 📝 Example Output

### Perfect Test Run ✅
```bash
$ npx ts-node scripts/test-concurrent-approvals.ts -s 20 -c 10

================================================================================
🧪 CONCURRENT APPROVAL TEST FOR SIMLOK NUMBER GENERATION
================================================================================

📋 Test Configuration:
   Total submissions: 20
   Concurrent approvals: 10
   Delay between batches: 1000ms

📝 Creating 20 test submissions...
....................
✅ Created 20 test submissions

⚡ Approving 20 submissions with concurrency: 10...

📦 Processing batch 1 (10 submissions)...
✓✓✓✓✓✓✓✓✓✓

📦 Processing batch 2 (10 submissions)...
✓✓✓✓✓✓✓✓✓✓

📊 ANALYSIS RESULTS:

✅ NO DUPLICATES: All SIMLOK numbers are unique!
✅ SEQUENTIAL: Numbers are perfectly sequential (101 to 120)

📈 PERFORMANCE:
   Average approval time: 85ms
   Min: 42ms
   Max: 234ms
   Total: 20 approvals

📋 ALL SIMLOK NUMBERS (sorted):
     1. 101/S00330/2025-S0 (42ms)
     2. 102/S00330/2025-S0 (56ms)
     3. 103/S00330/2025-S0 (73ms)
     4. 104/S00330/2025-S0 (61ms)
     5. 105/S00330/2025-S0 (89ms)
     6. 106/S00330/2025-S0 (97ms)
     7. 107/S00330/2025-S0 (104ms)
     8. 108/S00330/2025-S0 (123ms)
     9. 109/S00330/2025-S0 (145ms)
    10. 110/S00330/2025-S0 (167ms)
    11. 111/S00330/2025-S0 (189ms)
    12. 112/S00330/2025-S0 (201ms)
    13. 113/S00330/2025-S0 (215ms)
    14. 114/S00330/2025-S0 (234ms)
    15. 115/S00330/2025-S0 (67ms)
    16. 116/S00330/2025-S0 (78ms)
    17. 117/S00330/2025-S0 (91ms)
    18. 118/S00330/2025-S0 (105ms)
    19. 119/S00330/2025-S0 (118ms)
    20. 120/S00330/2025-S0 (132ms)

================================================================================
✅✅✅ TEST PASSED: Sequential numbering works perfectly! ✅✅✅
================================================================================

🗑️  Delete test submissions? (y/N): y

🧹 Cleaning up test data...
✅ Deleted 20 test submissions

✅ Test completed successfully
```

### Failed Test Run ❌ (Example)
```bash
📊 ANALYSIS RESULTS:

❌ DUPLICATE NUMBERS FOUND:
   Number 105 appears 2 times
   Number 112 appears 3 times

⚠️  GAPS IN SEQUENCE: Missing numbers: 107, 110, 114

================================================================================
❌❌❌ TEST FAILED: Issues found in numbering! ❌❌❌
================================================================================
```

## 🎯 Next Steps

1. **Run Basic Test First**
   ```bash
   npx ts-node scripts/test-concurrent-approvals.ts
   ```

2. **If Test Passes:** 
   - ✅ Solution is working correctly
   - ✅ Ready for production deployment
   - ✅ No duplicates will occur

3. **If Test Fails:**
   - ❌ Check if migration was applied
   - ❌ Check if transaction code is correct
   - ❌ Check database locks are working

4. **Before Production:**
   - Run check-duplicate-simlok.ts to find existing duplicates
   - Fix any existing duplicates
   - Apply migration
   - Deploy code
   - Run this test again in production staging

## 📚 Related Files

- `scripts/test-concurrent-approvals.ts` - This test script
- `scripts/check-duplicate-simlok.ts` - Check for existing duplicates
- `src/app/api/submissions/[id]/approve/route.ts` - Approval logic with transaction
- `docs/FIX_SIMLOK_RACE_CONDITION.md` - Complete documentation
- `prisma/migrations/20251114000000_add_unique_simlok_number_constraint/` - Migration

---

**Last Updated:** November 14, 2025
**Status:** ✅ Ready for Testing
