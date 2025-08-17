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

## 🛠️ Setup & Instalasi

### Prerequisites
- Node.js 18+ 
- MySQL database
- npm atau yarn

### Quick Start - Setup Lengkap

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Generate NextAuth secret (pilih salah satu):
# Opsi A: Menggunakan openssl (Linux/macOS)
openssl rand -base64 32

# Opsi B: Menggunakan Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opsi C: Menggunakan npx (jika tersedia)
npx auth secret

# 4. Edit file .env - Update konfigurasi:
# NEXTAUTH_SECRET="paste-hasil-generate-di-atas"
# DATABASE_URL="mysql://root:@localhost:3306/simlok2"
# NEXTAUTH_URL="http://localhost:3000"

# 5. Deploy database migrations
npx prisma migrate deploy

# 6. Seed database dengan data dummy
npm run seed

# 7. Build dan jalankan aplikasi
npm run build
npm run start
```

Akses aplikasi di `http://localhost:3000`.

### Cara Generate NextAuth Secret

NextAuth membutuhkan secret key untuk enkripsi JWT. Ada beberapa cara untuk generate:

#### Metode 1: OpenSSL (Recommended)
```bash
# Generate random base64 string 32 bytes
openssl rand -base64 32
```

#### Metode 2: Node.js Built-in
```bash
# Menggunakan crypto module Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Metode 3: Online Generator
Buka: https://generate-secret.vercel.app/32 atau website password generator lainnya dengan minimum 32 karakter.

#### Metode 4: NPX Command (Opsional)
```bash
# Jika tersedia di sistem
npx auth secret
```

**Copy hasil generate ke file `.env`:**
```bash
NEXTAUTH_SECRET="hasil-generate-secret-di-atas"
```

### Development Mode
Untuk development dengan hot reload:

```bash
npm run dev
```

## 🚀 Deployment Produksi

### Setup Environment Production
```bash
# Database Production
DATABASE_URL="mysql://username:password@localhost:3306/simlok_production"

# NextAuth.js Production
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret-32-chars-minimum"

# JWT Settings (Opsional - 6 hours default)
JWT_EXPIRE_TIME=21600  
SESSION_MAX_AGE=21600
SESSION_UPDATE_AGE=1800
```

### Deploy ke Production
```bash
# Clone dan install
git clone <repository-url>
cd simlok2
npm ci --only=production

# Setup database
npx prisma generate
npx prisma migrate deploy
npm run seed  # Opsional

# Build dan start
npm run build
npm run start
```

### Setup PM2 (Opsional)
```bash
npm install -g pm2

# Buat ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'simlok',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 3000 }
  }]
}
EOF

pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

## 📋 Environment Variables

### Required Variables
```bash
# Database MySQL
DATABASE_URL="mysql://username:password@host:port/database"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"  # atau domain production
NEXTAUTH_SECRET="your-32-character-secret-key"
```

### Optional JWT Settings
```bash
JWT_EXPIRE_TIME=21600        # Session duration (6 hours)
SESSION_MAX_AGE=21600        # Max session age  
SESSION_UPDATE_AGE=1800      # Update interval (30 min)
JWT_WARNING_MINUTES=5        # Warning before expiry
JWT_REFRESH_INTERVAL=30      # Auto refresh interval
```

### Contoh Konfigurasi
```bash
# Development
DATABASE_URL="mysql://root:@localhost:3306/simlok2"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-min-32-chars"

# Production  
DATABASE_URL="mysql://user:pass@production-host:3306/simlok_prod"
NEXTAUTH_URL="https://simlok.yourdomain.com"
NEXTAUTH_SECRET="production-very-secure-secret-key"
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