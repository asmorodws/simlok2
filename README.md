# SIMLOK - Sistem Informasi Manajemen Lokasi Kerja

Sistem manajemen dan verifikasi lokasi kerja berbasis web yang dibangun dengan Next.js 15, NextAuth.js, Prisma, dan TypeScript dengan fitur role-based access control (RBAC) untuk tiga peran pengguna: Admin, Verifier, dan Vendor.

## 🚀 Fitur Utama

- **Autentikasi Aman**: Login/register dengan NextAuth.js dan JWT session management
- **Role-Based Access Control**: Tiga peran pengguna dengan hierarki akses yang jelas
- **Manajemen Pengajuan**: Sistem pengajuan SIMLOK dengan workflow approval
- **Dashboard Analytics**: Dashboard dengan statistik real-time untuk setiap peran
- **Manajemen Dokumen**: Upload dan preview dokumen (SIKA, SIMJA, ID Card)
- **Generasi PDF**: Otomatis generate PDF SIMLOK setelah approval
- **Verifikasi User**: Sistem verifikasi akun vendor oleh admin
- **Session Management**: JWT dengan expiry dan auto-refresh
- **Responsive Design**: UI modern dengan Tailwind CSS

## 🏗️ Arsitektur Sistem

### Hierarki Peran Pengguna
- **ADMIN** (Level 3): Akses penuh ke semua fitur sistem
  - Dashboard admin dengan statistik lengkap
  - Manajemen user dan verifikasi akun vendor
  - Approval/reject pengajuan SIMLOK
  - Generate dan download PDF SIMLOK
- **VERIFIER** (Level 2): Akses verifikasi dan fitur vendor
  - Dashboard verifier
  - Verifikasi dokumen pengajuan
  - Semua fitur vendor
- **VENDOR** (Level 1): Akses dasar vendor
  - Dashboard vendor dengan pengajuan sendiri
  - Buat dan edit pengajuan SIMLOK
  - Upload dokumen pendukung

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **Authentication**: NextAuth.js v4 dengan JWT
- **Database**: MySQL dengan Prisma ORM
- **Styling**: Tailwind CSS v4
- **Security**: bcryptjs, Zod validation, CSRF protection
- **File Processing**: PDF generation dengan pdf-lib

## 📁 Struktur Proyek

```
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx                    # Halaman login
│   │   │   ├── signup/page.tsx                   # Halaman registrasi vendor
│   │   │   └── verification-pending/page.tsx     # Halaman menunggu verifikasi
│   │   ├── (dashboard)/
│   │   │   ├── admin/page.tsx                    # Dashboard admin
│   │   │   ├── vendor/page.tsx                   # Dashboard vendor
│   │   │   └── verifier/page.tsx                 # Dashboard verifier
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts        # NextAuth configuration
│   │   │   │   └── signup/route.ts               # API registrasi vendor
│   │   │   ├── submissions/                       # API pengajuan SIMLOK
│   │   │   ├── users/                            # API manajemen user
│   │   │   └── admin/                            # API khusus admin
│   │   ├── components/                           # Komponen React
│   │   │   ├── admin/                            # Komponen khusus admin
│   │   │   ├── vendor/                           # Komponen khusus vendor
│   │   │   ├── auth/                             # Komponen autentikasi
│   │   │   └── ui/                               # Komponen UI umum
│   │   ├── lib/                                  # Utilities dan konfigurasi
│   │   │   ├── auth.ts                           # Konfigurasi NextAuth
│   │   │   ├── prisma.ts                         # Prisma client
│   │   │   └── jwt-config.ts                     # Konfigurasi JWT
│   │   └── utils/
│   │       └── pdf/                              # PDF generation utilities
├── prisma/
│   ├── schema.prisma                             # Database schema
│   ├── seed.ts                                   # Database seeding
│   └── migrations/                               # Database migrations
├── middleware.ts                                 # Route protection middleware
└── package.json
```

## 🛠️ Instalasi & Setup untuk Pengembangan

### Prerequisites
- Node.js 18+ 
- MySQL database
- npm atau yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd simlok2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment
Salin file `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Edit file `.env.local` sesuai dengan konfigurasi Anda (lihat bagian Dokumentasi Environment Variables).

### 4. Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate dev --name init

# Seed database dengan data dummy (opsional)
npm run seed
```

### 5. Jalankan Development Server
```bash
npm run dev
```

Akses aplikasi di `http://localhost:3000`.

## 🚀 Deployment untuk Produksi

### 1. Persiapan Server
Pastikan server produksi memiliki:
- Node.js 18+
- MySQL database
- PM2 atau process manager lainnya (opsional)

### 2. Setup Environment Variables
Buat file `.env.local` di server produksi dengan konfigurasi yang sesuai:

```bash
# Database Production
DATABASE_URL="mysql://username:password@localhost:3306/simlok_production"

# NextAuth.js Production
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-very-long-random-secret-key-for-production-minimum-32-characters"

# JWT Settings - Production (6 hours default)
JWT_EXPIRE_TIME=21600  # 6 hours in seconds
SESSION_MAX_AGE=21600  # 6 hours in seconds  
SESSION_UPDATE_AGE=1800  # 30 minutes in seconds
JWT_WARNING_MINUTES=5  # Warning before expiry in minutes
JWT_REFRESH_INTERVAL=30  # Auto refresh interval in minutes
```

### 3. Clone dan Install di Produksi
```bash
# Clone repository
git clone <repository-url>
cd simlok2

# Install dependencies (production only)
npm ci --only=production
```

### 4. Setup Database Produksi
```bash
# Generate Prisma client
npx prisma generate

# Deploy migrasi ke database produksi
npx prisma migrate deploy

# (Opsional) Seed database dengan data dummy
npm run seed
```

### 5. Build Aplikasi
```bash
# Build aplikasi untuk produksi
npm run build
```

### 6. Jalankan Aplikasi Produksi
```bash
# Jalankan aplikasi produksi
npm run start
```

### 7. Setup Process Manager (Opsional)
Untuk produksi yang lebih stabil, gunakan PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Buat file ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'simlok',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Jalankan dengan PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup
pm2 startup
```

## 📋 Dokumentasi Environment Variables

### Database Configuration
```bash
# URL koneksi database MySQL
# Format: mysql://username:password@host:port/database_name
DATABASE_URL="mysql://root:password@localhost:3306/simlok_db"

# Contoh untuk berbagai skenario:
# Local MySQL tanpa password: "mysql://root:@localhost:3306/simlok_db"
# Local MySQL dengan password: "mysql://root:mypassword@localhost:3306/simlok_db"
# Remote MySQL: "mysql://user:pass@remote-host:3306/simlok_db"
# MySQL dengan SSL: "mysql://user:pass@host:3306/simlok_db?sslaccept=strict"
```

### NextAuth Configuration
```bash
# URL aplikasi (penting untuk production)
# Development: http://localhost:3000
# Production: https://yourdomain.com
NEXTAUTH_URL="https://simlok.yourdomain.com"

# Secret key untuk enkripsi JWT (WAJIB diganti di production)
# Generate dengan: openssl rand -base64 32
NEXTAUTH_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
```

### JWT Session Settings
```bash
# Durasi session JWT dalam detik (default: 6 jam = 21600 detik)
JWT_EXPIRE_TIME=21600

# Durasi maksimal session dalam detik (default: 6 jam)
SESSION_MAX_AGE=21600

# Interval update session dalam detik (default: 30 menit = 1800 detik)
SESSION_UPDATE_AGE=1800

# Peringatan sebelum session expired dalam menit (default: 5 menit)
JWT_WARNING_MINUTES=5

# Interval auto-refresh dalam menit (default: 30 menit)
JWT_REFRESH_INTERVAL=30
```

### Rekomendasi Konfigurasi
```bash
# Development
JWT_EXPIRE_TIME=3600        # 1 jam
SESSION_MAX_AGE=3600        # 1 jam
JWT_WARNING_MINUTES=5       # 5 menit

# Production
JWT_EXPIRE_TIME=28800       # 8 jam
SESSION_MAX_AGE=28800       # 8 jam  
SESSION_UPDATE_AGE=1800     # 30 menit
JWT_WARNING_MINUTES=10      # 10 menit
```

## 🔐 Data Default Setelah Seeding

Setelah menjalankan `npm run seed`, Anda dapat login dengan akun berikut:

| Peran     | Email                  | Password     | Status      |
|-----------|------------------------|--------------|-------------|
| Admin     | admin@example.com      | admin123     | Verified    |
| Verifier  | verifier@example.com   | verifier123  | Verified    |
| Vendor    | vendora@example.com    | vendor123    | Verified    |

### Data Dummy yang Dibuat
- **3 User**: 1 Admin, 1 Verifier, 1 Vendor (sudah terverifikasi)
- **8+ Pengajuan SIMLOK**: Dengan berbagai status (PENDING, APPROVED, REJECTED)
- **Dokumen Sample**: Nomor SIMJA, SIKA, dan SIMLOK yang realistis
- **Riwayat Aktivitas**: Data created/updated dengan timestamp yang bervariasi

## 🎯 Panduan Penggunaan

### Flow Registrasi Vendor
1. **Akses halaman signup** (`/signup`)
2. **Isi form registrasi** dengan data lengkap vendor
3. **Submit form** → Redirect ke halaman verification-pending
4. **Admin verifikasi** akun di dashboard admin
5. **Vendor dapat login** setelah diverifikasi

### Flow Pengajuan SIMLOK
1. **Vendor login** dan akses dashboard
2. **Buat pengajuan baru** dengan upload dokumen
3. **Admin review** pengajuan di dashboard admin
4. **Admin approve/reject** dengan keterangan
5. **PDF SIMLOK generate** otomatis jika approved

### Management User (Admin)
- **Dashboard Admin**: Statistik lengkap dan tabel user terbaru
- **User Management**: Verifikasi, edit, delete user
- **Pengajuan Management**: Approve/reject dengan modal detail

## 📦 Scripts yang Tersedia

```bash
# Development
npm run dev          # Jalankan development server dengan Turbopack
npm run lint         # Jalankan ESLint untuk code quality

# Production
npm run build        # Build aplikasi untuk produksi
npm run start        # Jalankan production server

# Database
npm run seed         # Seed database dengan data dummy
npx prisma studio    # Buka Prisma Studio untuk manage database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev     # Buat dan apply migrasi (development)
npx prisma migrate deploy  # Apply migrasi ke production
npx prisma db push         # Push schema langsung ke database (hati-hati!)
```

## 🗄️ Database Schema

### Model Utama

#### User Model
```prisma
model User {
  id              String    @id @default(cuid())
  nama_petugas    String
  email           String    @unique
  password        String?
  nama_vendor     String?   # Hanya untuk role VENDOR
  alamat          String
  no_telp         String
  role            Role      @default(VENDOR)
  foto_profil     String?
  verified_at     DateTime? # Timestamp verifikasi admin
  verified_by     String?   # ID admin yang memverifikasi
  date_created_at DateTime  @default(now())
  
  submissions     Submission[]
  approvedSubmissions Submission[] @relation("ApprovedBy")
}

enum Role {
  VENDOR
  VERIFIER  
  ADMIN
}
```

#### Submission Model
```prisma
model Submission {
  id                    String  @id @default(cuid())
  nama_vendor           String
  berdasarkan           String  # Dasar pengajuan (kontrak, SPK, dll)
  nama_petugas          String
  pekerjaan             String
  lokasi_kerja          String
  pelaksanaan           String? # Diisi admin saat approve
  jam_kerja             String
  lain_lain             String? # Diisi admin saat approve
  sarana_kerja          String
  tembusan              String? # Diisi admin saat approve
  nama_pekerja          String  # Multiple names (newline separated)
  content               String? # Diisi admin saat approve
  
  # Document numbers and dates
  nomor_simja           String?
  tanggal_simja         DateTime?
  nomor_sika            String?
  tanggal_sika          DateTime?
  nomor_simlok          String? # Generated setelah approval
  tanggal_simlok        DateTime? # Generated setelah approval
  
  # File uploads
  upload_doc_sika       String?
  upload_doc_simja      String?
  upload_doc_id_card    String?
  
  # Status and approval
  status_approval_admin String  @default("PENDING")
  approved_by_admin     String?
  keterangan            String? # Keterangan admin
  qrcode                String?
  
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  
  # Relations
  userId                String
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  approvedByUser        User?   @relation("ApprovedBy", fields: [approved_by_admin], references: [id])
}
```

## 🔒 Fitur Keamanan

- **Password Hashing**: bcryptjs dengan salt rounds tinggi
- **JWT Tokens**: Session management dengan expiry dan refresh
- **CSRF Protection**: Built-in NextAuth.js CSRF protection
- **Route Protection**: Middleware-based authentication dan authorization
- **Role Validation**: Server-side role checking di setiap endpoint
- **Input Validation**: Zod schema validation untuk semua input
- **Rate Limiting**: Protection terhadap brute force attacks
- **SQL Injection Prevention**: Prisma ORM dengan prepared statements

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Cek koneksi database
npx prisma db pull

# Test koneksi dengan Prisma Studio
npx prisma studio

# Reset database (hati-hati, akan menghapus semua data!)
npx prisma migrate reset
```

### Authentication Problems  
```bash
# Clear browser cookies dan localStorage
# Cek NEXTAUTH_SECRET di .env.local
# Pastikan NEXTAUTH_URL sesuai dengan domain

# Debug mode (tambahkan ke .env.local)
NEXTAUTH_DEBUG=true
```

### Build/Production Issues
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Cek environment variables production
node -e "console.log(process.env.DATABASE_URL)"
```

### Permission/Role Issues
```bash
# Cek role user di database
npx prisma studio

# Reset user role via seed
npm run seed
```

## 📚 Resources Tambahan

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zod Validation](https://zod.dev/)

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push ke branch (`git push origin feature/new-feature`)
5. Buat Pull Request

## 📝 License

Project ini menggunakan MIT License.

---

**Dibuat dengan ❤️ untuk manajemen lokasi kerja yang lebih efisien**