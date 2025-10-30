# Migration Guide: Add Position Field for Approver

## 📋 Overview

Penambahan field `position` (jabatan) pada tabel `User` khusus untuk role APPROVER. Field ini akan otomatis digunakan sebagai `signer_position` saat approver menyetujui SIMLOK.

## 🎯 Fitur yang Ditambahkan

### 1. **Database Schema**
- ✅ Field `position` sudah ditambahkan di `User` model (schema.prisma line 16)
- ✅ Field `signer_position` dan `signer_name` sudah ada di `Submission` model (line 120-121)

### 2. **Auto-fill Signer Info**
- ✅ Saat approver melakukan approve, `signer_name` dan `signer_position` otomatis diisi dari data user approver
- ✅ Implementasi di `/src/app/api/submissions/[id]/approve/route.ts`

### 3. **Edit Profile untuk Approver**
- ✅ Field "Jabatan" ditambahkan di halaman edit profile khusus untuk role APPROVER
- ✅ Validasi wajib diisi untuk approver
- ✅ Informasi tooltip: "Jabatan akan otomatis digunakan sebagai Signer Position saat menyetujui SIMLOK"

### 4. **Seed Data**
- ✅ Approver default memiliki position: "Sr Officer Security III"

## 🚀 Cara Menjalankan Migration

### Step 1: Generate Prisma Client

Karena schema sudah diupdate, Anda perlu regenerate Prisma Client:

```bash
npx prisma generate
```

### Step 2: Cek Status Database

Cek apakah field `position` sudah ada di database:

```bash
npx prisma db push --preview-feature
```

**ATAU** jika ingin membuat migration formal:

```bash
npx prisma migrate dev --name add_position_field_to_user
```

### Step 3: Update Seed Data (Optional)

Jika ingin mengupdate data approver yang sudah ada dengan position:

```bash
npx prisma db seed
```

**ATAU** manual update via Prisma Studio:

```bash
npx prisma studio
```

Kemudian update field `position` untuk user dengan role `APPROVER`.

### Step 4: Restart Development Server

```bash
npm run dev
```

## 📝 File yang Dimodifikasi

### 1. **Schema & Database**
- ✅ `prisma/schema.prisma` - Field position sudah ada
- ✅ `prisma/seed.ts` - Added position for approver user

### 2. **Backend API**
- ✅ `/src/app/api/submissions/[id]/approve/route.ts` - Auto-fill signer info
- ✅ `/src/app/api/user/profile/route.ts` - Support update position field

### 3. **Frontend Components**
- ✅ `/src/components/user-profile/UserInfoCard.tsx` - Added position field for APPROVER
- ✅ `/src/app/(dashboard)/profile/page.tsx` - Already passing user data

### 4. **Types**
- ✅ TypeScript interfaces updated in UserInfoCard

## 🧪 Testing

### 1. **Test Edit Profile (Approver)**
1. Login sebagai approver (`approver@example.com` / `approver123`)
2. Buka halaman Profile
3. Klik "Ubah"
4. Isi field "Jabatan" (required field)
5. Klik "Simpan Perubahan"
6. Verify data tersimpan

### 2. **Test Auto-fill Signer**
1. Login sebagai approver yang sudah punya position
2. Buka submission yang PENDING_APPROVAL
3. Approve submission
4. Check di database: `signer_name` dan `signer_position` harus terisi otomatis
5. Generate PDF dan verify signer position muncul

### 3. **Test Create User (Super Admin)**
Jika ada halaman create user untuk role APPROVER, pastikan ada field untuk mengisi position.

## ⚠️ Important Notes

1. **Default Value**: Jika approver belum ada position, akan menggunakan default `"Sr Officer Security III"`

2. **Existing Approvers**: Approver yang sudah ada perlu update position mereka via edit profile

3. **Required Field**: Position wajib diisi untuk role APPROVER saat edit profile

4. **PDF Display**: Position akan muncul di PDF SIMLOK sebagai "Jabatan Signer"

## 🔧 Troubleshooting

### Error: "Property 'position' does not exist"

**Solution**: Generate Prisma Client
```bash
npx prisma generate
```

### Error: "Column 'position' not found in table 'User'"

**Solution**: Run migration
```bash
npx prisma migrate dev --name add_position_field_to_user
```

**ATAU** push schema:
```bash
npx prisma db push
```

### TypeScript Error di API

**Solution**: Restart TypeScript server di VS Code
- Press `Ctrl+Shift+P`
- Type "TypeScript: Restart TS Server"
- Click on it

## 📊 Database Schema

```prisma
model User {
  id                       String             @id @default(cuid())
  email                    String             @unique
  password                 String
  role                     User_role          @default(VENDOR)
  position                 String?            // for approver position ✨ NEW
  address                  String?
  created_at               DateTime           @default(now())
  // ... other fields
}

model Submission {
  // ... other fields
  signer_position           String?
  signer_name               String?
  // ... other fields
}
```

## ✅ Checklist

- [x] Schema updated with `position` field
- [x] Auto-fill signer info in approve endpoint
- [x] Edit profile UI for approver
- [x] API endpoint support position update
- [x] Seed data includes position for approver
- [ ] Run `npx prisma generate` ← **DO THIS FIRST!**
- [ ] Run migration atau `db push`
- [ ] Test edit profile
- [ ] Test approve with auto-fill
- [ ] Verify PDF shows correct signer position

## 🎉 Done!

Setelah menjalankan `npx prisma generate` dan migration, semua fitur sudah siap digunakan!
