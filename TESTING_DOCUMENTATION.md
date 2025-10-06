# Testing Documentation for Input Component

## Overview

Komponen Input telah dirombak untuk menangani validasi input dengan benar dan menghindari konflik logika. Berikut adalah dokumentasi lengkap tentang perubahan yang dilakukan dan testing yang telah dibuat.

## Masalah Yang Diperbaiki

### 1. Konflik Logika dalam Komponen Input
**Masalah Sebelumnya:**
- Komponen tidak melakukan filtering input secara real-time
- Logika onChange yang tidak konsisten antara controlled dan uncontrolled component
- Tidak ada mode validasi email

**Solusi:**
- Menambahkan state internal untuk menangani filtering
- Implementasi useEffect untuk sinkronisasi dengan external value
- Penambahan mode validasi "email" 
- Perbaikan logika controlled/uncontrolled component

### 2. Validasi Mode yang Tersedia
- `numbers`: Hanya mengizinkan angka 0-9
- `letters`: Mengizinkan huruf, spasi, titik, tanda hubung, dan apostrophe
- `email`: Mengizinkan karakter email (huruf, angka, @, ., -, _)
- `free`: Mengizinkan semua karakter (default)

## Komponen Input yang Diperbaiki

```tsx
// Sebelum
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  const originalValue = e.target.value;
  const filteredValue = filterInput(originalValue);
  
  // Masalah: Tidak selalu memanggil onChange
  if (originalValue !== filteredValue) {
    // Create filtered event
    onChange?.(filteredEvent);
  } else {
    onChange?.(e);
  }
};

// Sesudah  
const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
  const originalValue = e.target.value;
  const filteredValue = filterInput(originalValue);

  // Update internal state
  setInternalValue(filteredValue);

  // Selalu memanggil onChange dengan filtered value
  const filteredEvent = {
    ...e,
    target: {
      ...e.target,
      value: filteredValue,
    },
  } as ChangeEvent<HTMLInputElement>;
  
  onChange?.(filteredEvent);
}, [filterInput, onChange]);
```

## Testing Setup

### 1. Dependencies yang Ditambahkan
```json
{
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.4.8", 
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

### 2. Scripts Testing
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch", 
    "test:coverage": "jest --coverage"
  }
}
```

### 3. Konfigurasi Jest
File: `jest.config.js`
```js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
  ],
}

module.exports = createJestConfig(config)
```

## Test Cases yang Dibuat

### Input Component Tests
1. **Basic Functionality**
   - Renders dengan props default
   - Menampilkan custom className
   - Menampilkan error message dan styling

2. **Validation Modes**
   - Free mode: mengizinkan semua karakter
   - Numbers mode: hanya angka
   - Letters mode: huruf dan karakter khusus yang diizinkan
   - Email mode: karakter email yang valid

3. **Controlled vs Uncontrolled**
   - Bekerja sebagai controlled component
   - Bekerja sebagai uncontrolled component

4. **Edge Cases**
   - Handle undefined/null values
   - Empty string filtering
   - ARIA attributes support

### UserInfoCard Component Tests
1. **Display Mode**
   - Render informasi user dengan benar
   - Menampilkan tombol edit
   - Handle field kosong dengan graceful

2. **Edit Mode**
   - Switch ke edit mode
   - Menampilkan form inputs
   - Vendor name input disabled untuk VENDOR role

3. **Input Validation**
   - Validasi field required
   - Validasi format email
   - Number validation untuk phone
   - Letter validation untuk nama

4. **Functionality**
   - Cancel changes
   - Role-specific behavior

## Cara Menjalankan Tests

```bash
# Jalankan semua tests
npm test

# Jalankan test specific file
npm test Input.test.tsx

# Jalankan dengan watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Penggunaan Komponen Input yang Diperbaiki

### Dalam UserInfoCard
```tsx
// Email input dengan validasi
<Input
  id="email"
  name="email"
  type="email"
  validationMode="email"  // Validasi email khusus
  value={formData.email}
  onChange={handleChange}
  placeholder="email@perusahaan.com"
  required
  error={errors.email}
  className="mt-1"
/>

// Phone input dengan validasi numbers
<Input
  id="phone_number"
  name="phone_number"
  type="tel"
  validationMode="numbers"  // Hanya angka
  value={formData.phone_number}
  onChange={handleChange}
  placeholder="08123456789"
  required
  className="mt-1"
/>

// Officer name dengan validasi letters
<Input
  id="officer_name"
  name="officer_name"
  type="text"
  validationMode="letters"  // Huruf dan karakter khusus
  value={formData.officer_name}
  onChange={handleChange}
  placeholder="Masukkan nama petugas"
  required
  className="mt-1"
/>
```

## Manfaat Perubahan

1. **Input Filtering Real-time**: Input langsung difilter saat user mengetik
2. **Konsistensi State**: Tidak ada konflik antara controlled dan uncontrolled
3. **Validasi yang Tepat**: Setiap input memiliki validasi sesuai jenisnya
4. **Testing Comprehensive**: Coverage untuk semua skenario penggunaan
5. **Type Safety**: TypeScript untuk mencegah error runtime

## Best Practices

1. **Selalu gunakan validationMode** yang sesuai dengan jenis input
2. **Test semua validation modes** dalam komponen yang menggunakan Input
3. **Handle error states** dengan proper error messages
4. **Gunakan controlled components** untuk form yang kompleks
5. **Mock dependencies** dengan benar dalam tests