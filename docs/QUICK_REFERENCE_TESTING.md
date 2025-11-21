# SIMLOK Testing & Fix Scripts - Quick Reference

## 🚀 Scripts yang Tersedia

### 1. Test Concurrent SIMLOK Generation
```bash
npx tsx scripts/test-concurrent-simlok.ts -s 15 -c 10
```
**Purpose**: Test retry mechanism dan concurrent SIMLOK generation  
**Output**: Success rate, duplicates check, sequence validation, performance metrics

### 2. Fix SIMLOK Issues
```bash
# Health check
npx tsx scripts/fix-simlok-issues.ts --report

# Detect issues
npx tsx scripts/fix-simlok-issues.ts

# Auto-fix dengan konfirmasi
npx tsx scripts/fix-simlok-issues.ts --fix
```
**Purpose**: Detect dan fix duplicate SIMLOK numbers  
**Output**: Duplicate detection, gap analysis, auto-fix capability

---

## 📊 Common Use Cases

### 1. Development Testing (Setelah Code Changes)
```bash
# Test dengan moderate load
npx tsx scripts/test-concurrent-simlok.ts -s 20 -c 10

# Check database health
npx tsx scripts/fix-simlok-issues.ts --report
```

### 2. Stress Testing (Before Deployment)
```bash
# High concurrency test
npx tsx scripts/test-concurrent-simlok.ts -s 50 -c 20

# Verify no issues
npx tsx scripts/fix-simlok-issues.ts
```

### 3. Production Monitoring (Daily/Weekly)
```bash
# Health report
npx tsx scripts/fix-simlok-issues.ts --report

# Full scan
npx tsx scripts/fix-simlok-issues.ts

# Fix jika ada masalah
npx tsx scripts/fix-simlok-issues.ts --fix
```

### 4. After Bug Fix (Validation)
```bash
# Test fix dengan concurrent load
npx tsx scripts/test-concurrent-simlok.ts -s 30 -c 15

# Check production data
npx tsx scripts/fix-simlok-issues.ts

# Fix production jika perlu
npx tsx scripts/fix-simlok-issues.ts --fix
```

---

## ✅ Expected Results (Healthy System)

```
✅✅✅ TEST PASSED - All checks successful!
```

### Test Concurrent:
- ✅ Success: 15/15 (100%)
- ✅ NO DUPLICATES
- ✅ SEQUENTIAL
- ✅ Required retry: 0-3 (normal)
- ✅ CONSISTENT with database

### Fix Issues:
- ✅ No duplicates found
- ✅ Perfect sequence with no gaps
- ✅ Total SIMLOK numbers: N
- ✅ Range: 1 to N (Expected count: N)

---

## ❌ Troubleshooting

### Test Failed - Duplicates Detected
```
❌ DUPLICATES FOUND!
Duplicate numbers: 5, 10
```

**Solution**:
```bash
# Fix duplicates
npx tsx scripts/fix-simlok-issues.ts --fix

# Re-test
npx tsx scripts/test-concurrent-simlok.ts -s 20 -c 10
```

### Test Failed - Gaps in Sequence
```
❌ GAPS DETECTED
Missing: 5, 8, 12
```

**Note**: Gaps biasanya normal (deleted submissions).  
**Solution**: Jika critical, review manual di database.

### High Retry Rate
```
🔄 Retry Statistics:
  Required retry: 12/15  (80%)
```

**Possible Causes**:
- Database under load
- Concurrency too high
- Network latency

**Solution**:
```bash
# Reduce concurrency
npx tsx scripts/test-concurrent-simlok.ts -s 15 -c 5

# Check database performance
```

---

## 🔧 Script Parameters

### test-concurrent-simlok.ts
| Parameter | Default | Description |
|-----------|---------|-------------|
| `-s, --submissions` | 10 | Jumlah submissions to test |
| `-c, --concurrency` | 5 | Concurrent operations |
| `-h, --help` | - | Show help |

### fix-simlok-issues.ts
| Parameter | Description |
|-----------|-------------|
| `--report` | Show health report only |
| `--fix` | Auto-fix detected issues (with confirmation) |
| `--help` | Show help |

---

## 📈 Performance Benchmarks

### Normal Load (10 concurrent):
- Average: 150-200ms
- Min: 50-100ms
- Max: 250-350ms
- Retry: 0-10%

### High Load (20 concurrent):
- Average: 200-300ms
- Min: 100-150ms
- Max: 400-600ms
- Retry: 10-30%

### Extreme Load (50 concurrent):
- Average: 300-500ms
- Min: 150-250ms
- Max: 800-1200ms
- Retry: 30-50%

---

## 🎯 CI/CD Integration

### GitHub Actions Example
```yaml
name: Test SIMLOK

on: [push, pull_request]

jobs:
  test-simlok:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Test Concurrent SIMLOK
        run: npx tsx scripts/test-concurrent-simlok.ts -s 20 -c 10
      
      - name: Check SIMLOK Health
        run: npx tsx scripts/fix-simlok-issues.ts --report
```

---

## 📝 Best Practices

### 1. Testing Frequency
- **After code changes**: Always test
- **Before deployment**: Mandatory
- **Production monitoring**: Weekly

### 2. Concurrency Levels
- **Low (5-10)**: Normal development testing
- **Medium (10-20)**: Pre-deployment validation
- **High (20-50)**: Load/stress testing

### 3. Issue Resolution
- **Duplicates**: Auto-fix with `--fix` flag
- **Gaps**: Usually safe to ignore
- **Failed tests**: Investigate logs, check database

### 4. Monitoring
```bash
# Cron job untuk daily check
0 9 * * * cd /path/to/project && npx tsx scripts/fix-simlok-issues.ts --report
```

---

## 🔒 Safety Notes

⚠️ **IMPORTANT**:
- Always backup database before `--fix`
- Test scripts clean up after themselves
- Production fixes require manual confirmation
- Never run high concurrency tests on production database

---

## 📚 Detailed Documentation

For complete documentation, see:
- [TESTING_APPROVAL_API.md](./TESTING_APPROVAL_API.md) - Full testing guide
- [FIX_SIMLOK_RACE_CONDITION.md](./FIX_SIMLOK_RACE_CONDITION.md) - Technical details

---

## 🆘 Quick Help

```bash
# Test help
npx tsx scripts/test-concurrent-simlok.ts --help

# Fix help
npx tsx scripts/fix-simlok-issues.ts --help
```

---

**Last Updated**: November 15, 2025  
**Maintainer**: SIMLOK Development Team
