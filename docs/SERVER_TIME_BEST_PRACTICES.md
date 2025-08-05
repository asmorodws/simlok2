# Server Time Best Practices - SIMLOK System

## 🎯 Tujuan
Memastikan semua operasi tanggal dalam sistem SIMLOK menggunakan **waktu server Jakarta (Asia/Jakarta, UTC+7)** bukan waktu browser/device untuk mencegah inkonsistensi data.

## 📋 Arsitektur Server Time

### 1. Server-Side API (`/api/server-time`)
```typescript
// File: src/app/api/server-time/route.ts
GET /api/server-time
Response: {
  serverTime: "2025-08-05T10:30:00.000Z",
  jakartaDate: "2025-08-05",
  jakartaDateTime: "2025-08-05T17:30:00.000Z",
  timezone: "Asia/Jakarta",
  offset: "+07:00"
}
```

**Fungsi:**
- Menyediakan waktu server yang akurat
- Menghitung offset antara server dan client
- Digunakan sebagai single source of truth

### 2. Client-Side Hook (`useServerTime`)
```typescript
// File: src/hooks/useServerTime.ts
const { 
  serverTime,        // Date object dari server
  jakartaDate,       // YYYY-MM-DD format
  isLoaded,          // Loading state
  offset,            // Offset ms antara server-client
  getCurrentServerTime(), // Mendapat Date yang disesuaikan
  getCurrentDate(),  // Mendapat YYYY-MM-DD
  refresh()          // Re-fetch server time
} = useServerTime();
```

**Fitur:**
- ✅ Singleton pattern (fetch sekali, cache untuk semua komponen)
- ✅ Automatic offset calculation
- ✅ Fallback ke Jakarta timezone jika API gagal
- ✅ Promise queue untuk concurrent requests

### 3. DatePicker Component
```typescript
// File: src/components/form/DatePicker.tsx
<DatePicker
  value={formData.date}
  onChange={(value) => setFormData({ ...formData, date: value })}
  placeholder="Pilih tanggal"
  required
/>
```

**Implementasi Server Time:**
- ✅ `openToDate={todayDate}` - Calendar membuka di tanggal server
- ✅ `minDate` & `maxDate` - Dihitung dari server time
- ✅ Custom "Hari ini" button - Menggunakan `getCurrentDate()` dari server
- ✅ `handleChange` - Konversi ke Jakarta timezone via `toJakartaISOString()`

## 🔧 Best Practices

### ❌ JANGAN Gunakan (Browser Time)
```typescript
// ❌ SALAH - Menggunakan waktu browser
const today = new Date();
const dateStr = new Date().toISOString();
const year = new Date().getFullYear();

// ❌ SALAH - JavaScript Date constructor tanpa timezone
const date = new Date('2025-08-05'); // Ambiguous timezone
```

### ✅ GUNAKAN (Server Time)

#### Untuk React Components:
```typescript
// ✅ BENAR - Gunakan useServerTime hook
import { useServerTime } from '@/hooks/useServerTime';

function MyComponent() {
  const { getCurrentDate, getCurrentServerTime } = useServerTime();
  
  // Untuk YYYY-MM-DD format
  const today = getCurrentDate(); // "2025-08-05"
  
  // Untuk Date object
  const now = getCurrentServerTime(); // Date dengan offset server
  const year = now.getFullYear();
  
  return <DatePicker value={today} />;
}
```

#### Untuk Server Components/API Routes:
```typescript
// ✅ BENAR - Gunakan toJakartaISOString helper
import { toJakartaISOString } from '@/lib/timezone';

// Convert Date to Jakarta ISO string
const jakartaTime = toJakartaISOString(new Date());

// Parse dengan timezone explicit
const date = new Date('2025-08-05T00:00:00+07:00');
```

#### Untuk Default Values di Form:
```typescript
// ✅ BENAR - Gunakan getCurrentDate dari hook
const [formData, setFormData] = useState({
  date: '' // Jangan set default value di sini
});

const { getCurrentDate } = useServerTime();

// Set default value setelah server time loaded
useEffect(() => {
  if (isLoaded && !formData.date) {
    setFormData(prev => ({ ...prev, date: getCurrentDate() }));
  }
}, [isLoaded]);
```

## 📝 Checklist Implementation

### Untuk Setiap Komponen Baru dengan Tanggal:

- [ ] Import `useServerTime` hook
- [ ] Destructure `getCurrentDate()` atau `getCurrentServerTime()`
- [ ] Gunakan untuk default values (bukan `new Date()`)
- [ ] Pastikan DatePicker menggunakan komponen kita (bukan custom)
- [ ] Validasi tanggal menggunakan server time untuk min/max

### Untuk API Routes:

- [ ] Import `toJakartaISOString` dari `@/lib/timezone`
- [ ] Convert semua Date objects sebelum return response
- [ ] Set timezone explicit saat parsing string ke Date
- [ ] Gunakan `formatSubmissionDates()` helper untuk batch conversion

### Untuk Database Operations:

- [ ] Simpan dalam format ISO string dengan timezone
- [ ] Parse dengan `new Date(isoString)` - akan preserve timezone
- [ ] Convert ke Jakarta timezone saat display/export

## 🧪 Testing Server Time

### Manual Testing:
```bash
# 1. Ubah waktu laptop ke timezone/tanggal yang salah
# 2. Buka aplikasi dan check DatePicker
# 3. Klik tombol "Hari ini"
# 4. Verifikasi tanggal yang dipilih = tanggal server Jakarta

# Test cases:
# - Device time 1 hari lebih cepat
# - Device time 1 hari lebih lambat
# - Device timezone berbeda (misal: America/New_York)
# - Device offline (fallback ke Jakarta timezone calculation)
```

### Console Testing:
```javascript
// Test di browser console
const { getCurrentDate, getCurrentServerTime, offset } = useServerTime();

console.log('Server Date:', getCurrentDate());
console.log('Server Time:', getCurrentServerTime());
console.log('Offset (ms):', offset);
console.log('Browser Date:', new Date().toISOString());
```

## 🚨 Common Pitfalls

### 1. Tombol "Hari ini" di DatePicker
**Masalah:** react-datepicker's `todayButton` menggunakan `new Date()` browser
**Solusi:** Custom today button dengan `handleTodayClick` yang call `getCurrentDate()`

### 2. Min/Max Date Calculation
**Masalah:** Menggunakan `new Date().getFullYear()` dari browser
**Solusi:** `getCurrentServerTime().getFullYear()`

### 3. Default Form Values
**Masalah:** Set default `date: getCurrentDate()` di `useState` initial value
**Solusi:** Set via `useEffect` setelah `isLoaded === true`

### 4. Calendar Opening Position
**Masalah:** Calendar membuka di bulan/tahun browser
**Solusi:** Set `openToDate={todayDate}` di ReactDatePicker props

## 🎨 Visual Flow

```
┌─────────────────┐
│   User Action   │
│  (Click Date)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   useServerTime Hook    │
│  - Fetch /api/server-time│
│  - Calculate offset     │
│  - Cache result         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   getCurrentDate()      │
│  Returns: "2025-08-05"  │
│  (Jakarta timezone)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   DatePicker onChange   │
│  - Convert to Jakarta   │
│  - Format: YYYY-MM-DD   │
│  - Update form state    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│   Form Submit to API    │
│  - Date already in      │
│    Jakarta timezone     │
│  - Consistent data      │
└─────────────────────────┘
```

## 📚 File References

### Core Files:
- `/src/hooks/useServerTime.ts` - Client hook untuk server time
- `/src/app/api/server-time/route.ts` - Server API endpoint
- `/src/components/form/DatePicker.tsx` - DatePicker component
- `/src/lib/timezone.ts` - Timezone helpers

### Example Usage:
- `/src/components/approver/ApproverSubmissionDetailModal.tsx` - Approval form
- `/src/components/submissions/SubmissionForm.tsx` - Submission form
- `/src/components/vendor/EditSubmissionForm.tsx` - Edit form

## ✅ Verification Checklist

Sebelum deploy/merge, pastikan:

- [ ] Semua `new Date()` di client components sudah diganti dengan `useServerTime`
- [ ] Semua DatePicker menggunakan komponen `/src/components/form/DatePicker.tsx`
- [ ] API responses menggunakan `toJakartaISOString()` untuk dates
- [ ] No hardcoded timezone selain 'Asia/Jakarta'
- [ ] Custom today button di DatePicker menggunakan `getCurrentDate()`
- [ ] Form default values set via `useEffect` bukan `useState` initial
- [ ] Manual testing dengan device time yang salah sudah dilakukan

---

**Last Updated:** August 5, 2025  
**Maintained by:** Development Team  
**Related Docs:** `/docs/TIMEZONE_MIGRATION.md`
