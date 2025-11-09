# DatePicker & DateRangePicker Documentation

## Overview

Komponen DatePicker telah diperbarui untuk mendukung dua mode:
1. **Single Date Mode** - Untuk memilih satu tanggal
2. **Date Range Mode** - Untuk memilih rentang tanggal (start & end date)

## Components

### 1. DatePicker (Single Date Mode)

Digunakan untuk memilih satu tanggal saja.

#### Props:
- `id?: string` - ID untuk input element
- `name?: string` - Name untuk input element
- `value?: string` - Nilai tanggal dalam format YYYY-MM-DD
- `onChange?: (value: string) => void` - Callback saat tanggal berubah
- `placeholder?: string` - Placeholder text (default: "Pilih tanggal")
- `className?: string` - Custom CSS classes
- `required?: boolean` - Apakah field wajib diisi
- `disabled?: boolean` - Disable input

#### Contoh Penggunaan:

```tsx
import DatePicker from '@/components/form/DatePicker';

// Di dalam component
const [tanggal, setTanggal] = useState('');

<DatePicker
  id="tanggal_simlok"
  name="tanggal_simlok"
  value={tanggal}
  onChange={(value) => setTanggal(value)}
  placeholder="Pilih tanggal SIMLOK"
  required
/>
```

### 2. DateRangePicker (Date Range Mode)

Digunakan untuk memilih rentang tanggal dengan output terpisah untuk start date dan end date.

#### Props:
- `startDate: string` - Tanggal mulai dalam format YYYY-MM-DD
- `endDate: string` - Tanggal selesai dalam format YYYY-MM-DD
- `onStartDateChange: (date: string) => void` - Callback saat start date berubah
- `onEndDateChange: (date: string) => void` - Callback saat end date berubah
- `placeholder?: string` - Placeholder text (default: "Pilih rentang tanggal")
- `className?: string` - Custom CSS classes
- `required?: boolean` - Apakah field wajib diisi
- `disabled?: boolean` - Disable input

#### Contoh Penggunaan:

```tsx
import DateRangePicker from '@/components/form/DateRangePicker';

// Di dalam component
const [formData, setFormData] = useState({
  implementation_start_date: '',
  implementation_end_date: ''
});

<DateRangePicker
  startDate={formData.implementation_start_date}
  endDate={formData.implementation_end_date}
  onStartDateChange={(date) => 
    setFormData(prev => ({ ...prev, implementation_start_date: date }))
  }
  onEndDateChange={(date) => 
    setFormData(prev => ({ ...prev, implementation_end_date: date }))
  }
  placeholder="Pilih periode pelaksanaan"
  required
/>
```

### 3. DatePicker dengan Mode Range (Advanced)

Jika ingin kontrol lebih detail, bisa menggunakan DatePicker langsung dengan prop `isRange`:

```tsx
import DatePicker from '@/components/form/DatePicker';

<DatePicker
  isRange={true}
  startDate={formData.start_date}
  endDate={formData.end_date}
  onRangeChange={(start, end) => {
    setFormData(prev => ({
      ...prev,
      start_date: start,
      end_date: end
    }));
  }}
  placeholder="Pilih rentang tanggal"
/>
```

## Features

### Single Date Mode:
- ✅ Pilih satu tanggal
- ✅ Format output: `YYYY-MM-DD`
- ✅ Display: "dd MMMM yyyy" (Indonesia)
- ✅ Auto-close setelah memilih
- ✅ Clear button
- ✅ Click outside untuk menutup

### Date Range Mode:
- ✅ Pilih tanggal mulai dan selesai
- ✅ Visual range selection (highlight range)
- ✅ Output terpisah untuk start & end date
- ✅ Format output: `YYYY-MM-DD` untuk masing-masing
- ✅ Display: "dd MMMM yyyy - dd MMMM yyyy" (Indonesia)
- ✅ Auto-close setelah range lengkap
- ✅ Clear button (reset kedua tanggal)
- ✅ Smart selection (otomatis swap jika end < start)

## Styling

Komponen menggunakan Tailwind CSS dan mendukung:
- ✅ Dark mode
- ✅ Responsive design
- ✅ Custom className
- ✅ Disabled state
- ✅ Hover effects
- ✅ Transition animations

## Migration dari Komponen Lama

### Jika menggunakan single date (tidak perlu perubahan):
```tsx
// Tetap sama seperti sebelumnya
<DatePicker
  value={date}
  onChange={(value) => setDate(value)}
/>
```

### Jika ingin menggunakan date range:

**Sebelumnya (2 DatePicker terpisah):**
```tsx
<DatePicker
  value={formData.start_date}
  onChange={(value) => setFormData({...formData, start_date: value})}
/>
<DatePicker
  value={formData.end_date}
  onChange={(value) => setFormData({...formData, end_date: value})}
/>
```

**Sekarang (1 DateRangePicker):**
```tsx
<DateRangePicker
  startDate={formData.start_date}
  endDate={formData.end_date}
  onStartDateChange={(date) => setFormData({...formData, start_date: date})}
  onEndDateChange={(date) => setFormData({...formData, end_date: date})}
/>
```

## Database Integration

Kedua komponen menghasilkan format tanggal `YYYY-MM-DD` yang dapat langsung disimpan ke database:

```typescript
// Single date
const data = {
  tanggal: selectedDate // "2025-11-07"
};

// Date range
const data = {
  tanggal_mulai: startDate,    // "2025-11-01"
  tanggal_selesai: endDate      // "2025-11-30"
};

// Kirim ke API
await fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

## TypeScript Support

Semua komponen fully typed dengan TypeScript interface yang jelas. IDE akan memberikan autocomplete dan type checking.
