# SIMLOK2 - Sistem Izin Lokasi Kerja (Optimized)

**Real-time Next.js application** untuk manajemen pengajuan SIMLOK (Surat Izin Lokasi Kerja) dengan fitur **Socket.IO realtime**, **Redis caching**, dan **clean architecture**. Aplikasi ini sudah dioptimasi untuk **performa tinggi**, **real-time updates**, dan **mudah di-maintenance**.

## 🚀 Fitur Utama (OPTIMIZED)

- **⚡ Real-time Updates**: Socket.IO + Redis untuk update instant tanpa refresh
- **🔔 Smart Notifications**: Complete notification system dengan unread counts
- **⚡ High Performance**: Redis caching dan optimized database queries
- **🎯 Clean Architecture**: Singleton patterns, API v1 dengan DTO validation
- **🛡️ Robust Security**: NextAuth.js, role-based access, input validation
- **📊 Live Dashboard**: Real-time statistics dan submission updates
- **🔄 Event-Driven**: Arsitektur berbasis events untuk scalability
- **🎨 Modern UI**: Responsive design dengan TailwindCSS 4
- **📁 File Management**: Upload, preview, dan manajemen dokumen
- ** PDF Generation**: Auto-generate PDF SIMLOK dengan template

## 🏗️ Tech Stack (Optimized)

### Core Technologies
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Custom Socket.IO Server + Next.js API Routes  
- **Database**: MySQL via Prisma 6.x ORM (with optimized indexing)
- **Cache**: Redis (ioredis) with namespaced helpers
- **Realtime**: Socket.IO 4.x + @socket.io/redis-adapter
- **State Management**: Zustand stores
- **Authentication**: NextAuth.js v4 + Prisma Adapter
- **Styling**: TailwindCSS v4
- **Validation**: Zod schemas for API endpoints and events

### Performance Features
- **🔄 Real-time Events**: Socket.IO dengan Redis pub/sub adapter
- **⚡ Singleton Pattern**: HMR-safe database dan Redis connections
- **🗃️ Smart Caching**: Redis dengan namespace-based cache invalidation
- **📊 Optimized Queries**: Database indexing dan efficient Prisma queries
- **🎯 API v1**: Modern REST API dengan DTO validation dan pagination
- **🔔 Complete Notifications**: Real-time notification system

## 📁 Struktur Proyek (Optimized Architecture)

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   ├── (dashboard)/              # Dashboard routes dengan real-time features
│   ├── api/                      # API endpoints
│   │   ├── v1/                   # API v1 dengan validasi DTO
│   │   │   └── notifications/    # Modern notification endpoints
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── admin/                # Admin-specific endpoints
│   │   ├── vendor/               # Vendor-specific endpoints
│   │   └── submissions/          # CRUD submissions
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout dengan providers
│   └── socket-provider.tsx      # Socket.IO client provider dengan event handling
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   ├── admin/                   # Admin-specific components
│   ├── vendor/                  # Vendor-specific components
│   ├── notifications/           # Notification system components
│   └── common/                  # Shared components
├── features/                    # Feature-based modules (NEW)
│   └── notifications/           # Complete notification feature
│       ├── ui/                  # Notification UI components
│       ├── data/                # Data services dengan API integration
│       ├── types/               # TypeScript types
│       └── server/              # Server-side notification logic
├── lib/                         # Core utilities dan services
│   ├── singletons.ts           # ⭐ Prisma, Redis, Socket.IO singletons (HMR-safe)
│   ├── cache.ts                # ⭐ Redis cache helpers dengan namespacing
│   ├── api-utils.ts            # ⭐ API utility functions dengan validation
│   ├── auth.ts                 # NextAuth configuration
│   └── db.ts                   # Database utilities
├── server/                      # Server-side modules (NEW)
│   ├── socket.ts               # Socket.IO server logic
│   ├── events.ts               # Business event handlers
│   └── eventsPublisher.ts      # ⭐ Centralized event publishing service
├── shared/                      # Shared constants dan types (NEW)
│   ├── events.ts               # ⭐ Socket.IO event schemas dengan validation
│   ├── dto.ts                  # ⭐ API DTO schemas (Zod)
│   └── constants.ts            # Application constants
├── store/                       # Zustand stores
│   ├── notifications.ts        # ⭐ Notification state management
│   ├── stats.ts                # Statistics state
│   └── lists.ts                # Lists state dengan real-time updates
└── types/                       # TypeScript type definitions
    ├── next-auth.d.ts          # NextAuth type extensions
    ├── role.ts                 # Role definitions
    └── submission.ts           # Submission types
```

### Key Architecture Improvements
- **⭐ Singleton Pattern**: HMR-safe database dan Redis connections
- **⭐ Event-Driven**: Centralized event publishing untuk real-time updates  
- **⭐ Feature Modules**: Organized code dengan complete feature isolation
- **⭐ API v1**: Modern REST API dengan DTO validation dan proper error handling
- **⭐ Smart Caching**: Redis dengan namespace-based cache invalidation

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- Redis 6.0+ (untuk real-time features)

### Quick Start - Complete Setup

```bash
# 1. Clone dan install dependencies
git clone <repository-url>
cd simlok2
npm install

# 2. Setup environment variables
cp .env.example .env.local

# 3. Generate NextAuth secret
openssl rand -base64 32
# Copy hasil ke NEXTAUTH_SECRET di .env.local

# 4. Edit .env.local dengan konfigurasi database dan Redis
# DATABASE_URL="mysql://user:password@localhost:3306/simlok2"
# REDIS_URL="redis://localhost:6379"
# NEXTAUTH_SECRET="your-generated-secret"
# NEXTAUTH_URL="http://localhost:3000"

# 5. Setup database
npx prisma migrate dev
npm run seed

# 6. Start Redis server (pastikan Redis running)
redis-server

# 7. Development dengan Socket.IO real-time features
npm run dev
```

### Production Deployment

```bash
# 1. Build aplikasi
npm run build

# 2. Start production server dengan Socket.IO
npm run start
```

### Development Options

```bash
# Option 1: Full development dengan Socket.IO + Redis realtime
npm run dev              # Custom server dengan all features

# Option 2: Next.js only (tanpa Socket.IO) untuk debugging
npm run dev:next         # Standard Next.js dev server

# Type checking
npm run typecheck        # TypeScript validation
```

## 📋 Environment Variables

### Required Variables
```bash
# Database MySQL
DATABASE_URL="mysql://username:password@host:port/database"

# Redis (untuk real-time features)
REDIS_URL="redis://localhost:6379"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"  # atau domain production
NEXTAUTH_SECRET="your-32-character-secret-key"
```

### Optional Variables
```bash
# JWT Settings (defaults provided)
JWT_EXPIRE_TIME=21600        # Session duration (6 hours)
SESSION_MAX_AGE=21600        # Max session age  
SESSION_UPDATE_AGE=1800      # Update interval (30 min)

# Performance tuning
REDIS_MAX_RETRIES=3          # Redis connection retries
SOCKET_PING_TIMEOUT=30000    # Socket.IO ping timeout
```

### Complete .env.local Example
```bash
# Development Configuration
DATABASE_URL="mysql://root:@localhost:3306/simlok2"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-min-32-chars-example"

# Production Configuration  
# DATABASE_URL="mysql://user:pass@production-host:3306/simlok_prod"
# REDIS_URL="redis://production-redis:6379"
# NEXTAUTH_URL="https://simlok.yourdomain.com"
# NEXTAUTH_SECRET="production-very-secure-secret-key"
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

## 📦 Available Scripts

```bash
# Development
npm run dev          # Start custom server dengan Socket.IO + Redis realtime
npm run dev:next     # Start Next.js dev server only (tanpa Socket.IO)

# Production  
npm run build        # Build aplikasi untuk produksi (dengan optimizations)
npm run start        # Start production server dengan semua fitur real-time

# Code Quality
npm run lint         # ESLint untuk code quality
npm run typecheck    # TypeScript type checking

# Database
npm run seed         # Seed database dengan data lengkap
npm run seed:simple  # Seed database dengan data minimal
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/signin` - Login with email/password
- `POST /api/auth/signup` - Register vendor baru

### Submissions (SIMLOK)
- `GET /api/submissions` - List submissions dengan filtering
- `POST /api/submissions` - Create submission dengan file upload
- `GET /api/submissions/[id]` - Get submission detail
- `PUT /api/submissions/[id]` - Update submission
- `DELETE /api/submissions/[id]` - Delete submission

### Admin Management
- `GET /api/admin/submissions` - Admin submissions management
- `GET /api/admin/users` - User management dan verification
- `PUT /api/users/[id]/verify` - Verify vendor account

### Notifications API (v1) ⭐ NEW
- `GET /api/v1/notifications` - Get notifications dengan pagination
- `POST /api/v1/notifications/[id]/read` - Mark notification sebagai read
- `POST /api/v1/notifications/read-all` - Mark all notifications sebagai read
- `GET /api/v1/notifications/unread-count` - Get unread notification count

## � Real-time Features ⭐ NEW

### Socket.IO Events

**Client Connection:**
```javascript
// Auto-join room berdasarkan user role
socket.emit('join', { userId, role });
```

**Server → Client Events:**
- `admin:new_submission` - Pengajuan baru untuk admin/verifier
- `admin:new_vendor` - Pendaftaran vendor baru  
- `vendor:submission_status_changed` - Update status pengajuan untuk vendor
- `notification:new` - Notifikasi baru dengan data lengkap
- `notification:unread_count` - Update realtime unread count
- `stats:update` - Update statistik dashboard

### Socket.IO Rooms
- `admin` - Room untuk semua admin dan verifier
- `vendor:{vendorId}` - Room spesifik untuk masing-masing vendor

### Real-time Data Flow
```
User Action → API Endpoint → Database Update → Event Publisher → Socket.IO → All Connected Clients
```

### Notification System ⭐ Complete
- **⚡ Real-time Push**: Notifikasi langsung tanpa refresh
- **🔔 Unread Badges**: Live update unread count  
- **📋 Notification Panel**: Paginated notifications dengan mark as read
- **🎯 Role-based**: Notifikasi sesuai dengan role user (admin/vendor)
- **📱 Responsive**: Bell icon dengan dropdown panel

### Cache Strategy ⭐ Optimized
```javascript
// Redis cache dengan namespace
await cache.set('stats', 'admin', data, 300); // 5 minutes TTL
await cache.get('notifications', userId);
await cache.invalidatePattern('submissions:*'); // Bulk invalidation
```

## �🗄️ Database Schema (Optimized)

### Core Tables (Optimized)

#### User Model
```prisma
model User {
  id              String    @id @default(cuid())
  nama_petugas    String
  email           String    @unique
  password        String?
  nama_vendor     String?   # Untuk role VENDOR
  alamat          String
  no_telp         String
  role            Role      @default(VENDOR)
  verified_at     DateTime?
  verified_by     String?
  date_created_at DateTime  @default(now())
  
  submissions     Submission[]
  notifications   Notification[]
  notificationReads NotificationRead[]
  
  @@index([role])
  @@index([verified_at])
}
```

#### Notification Model ⭐ NEW
```prisma
model Notification {
  id        String   @id @default(cuid())
  title     String
  message   String   @db.Text
  type      NotificationType
  userId    String   # Target user
  createdAt DateTime @default(now())
  
  # Related data (optional)
  submissionId String?
  triggeredBy  String? # User yang trigger notifikasi
  
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  reads       NotificationRead[]
  
  @@index([userId, createdAt])
  @@index([type])
}

model NotificationRead {
  id             String       @id @default(cuid())
  notificationId String
  userId         String
  readAt         DateTime     @default(now())
  
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([notificationId, userId])
  @@index([userId])
}

enum NotificationType {
  SUBMISSION_CREATED
  SUBMISSION_APPROVED  
  SUBMISSION_REJECTED
  VENDOR_REGISTERED
  SYSTEM_UPDATE
}
```

#### Submission Model (Enhanced Indexing)
```prisma
model Submission {
  // ... existing fields ...
  
  @@index([userId])
  @@index([status_approval_admin])
  @@index([created_at])
  @@index([status_approval_admin, created_at]) # Composite index
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

## 🎯 Key Features (Complete Implementation)

### 1. ⚡ Real-time Dashboard
- ✅ Auto-update tanpa refresh halaman  
- ✅ Live statistics updates via Socket.IO
- ✅ Real-time submission list updates
- ✅ Instant notification push

### 2. 🔔 Complete Notification System ⭐ NEW
- ✅ Push notifications untuk semua events penting
- ✅ Unread count badge dengan live updates
- ✅ Mark as read / mark all as read functionality
- ✅ Notification panel dengan pagination
- ✅ Role-based notification targeting

### 3. 🛡️ Enhanced Security & Performance
- ✅ Role-based access control (Admin/Verifier/Vendor)
- ✅ NextAuth.js dengan JWT session management  
- ✅ Redis caching untuk performa optimal
- ✅ Optimized database queries dengan proper indexing
- ✅ Input validation dengan Zod schemas

### 4. � Advanced File Management
- ✅ Upload documents (SIKA, SIMJA, ID Card)
- ✅ Document preview dan download
- ✅ Organized file storage per user/category
- ✅ File size dan type validation

### 5. 🏗️ Clean Architecture ⭐ REFACTORED
- ✅ Singleton patterns untuk HMR safety
- ✅ Feature-based code organization
- ✅ API v1 dengan DTO validation
- ✅ Event-driven architecture
- ✅ Separation of concerns dengan proper modules

## 🚀 Deployment (Production Ready)

### Production Environment Setup
```bash
# Required environment variables
NODE_ENV=production
DATABASE_URL="mysql://user:password@host:3306/database"
REDIS_URL="redis://production-redis:6379"
NEXTAUTH_SECRET="secure-production-secret-key"
NEXTAUTH_URL="https://your-domain.com"

# Optional performance tuning
REDIS_MAX_RETRIES=3
SOCKET_PING_TIMEOUT=30000
```

### Production Deployment
```bash
# Build dan deploy
npm ci --only=production
npm run build
npm run start
```

### Docker Setup (Recommended)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - mysql
      - redis
    environment:
      - DATABASE_URL=mysql://user:password@mysql:3306/simlok
      - REDIS_URL=redis://redis:6379
      
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: simlok
      
  redis:
    image: redis:6.0-alpine
    command: redis-server --appendonly yes
```

## �🚨 Troubleshooting (Updated)

### Common Issues & Solutions

1. **Redis Connection Error**
   ```bash
   # Start Redis locally
   redis-server
   
   # Check Redis connection
   redis-cli ping
   # Should return "PONG"
   ```

2. **Socket.IO Not Working**
   ```bash
   # Pastikan menggunakan custom server (BUKAN dev:next)
   npm run dev  # ✅ Correct - includes Socket.IO
   # npm run dev:next  # ❌ Wrong - Next.js only
   
   # Check environment
   echo $REDIS_URL
   ```

3. **Database Connection Error**
   ```bash
   # Reset database dengan migration
   npx prisma migrate reset
   npm run seed
   
   # Test connection
   npx prisma db pull
   ```

4. **Build/TypeScript Errors**
   ```bash
   # Type checking
   npm run typecheck
   
   # Fix linting issues
   npm run lint
   
   # Clear build cache
   rm -rf .next
   npm run build
   ```

5. **Notification System Issues**
   ```bash
   # Check Redis connection untuk events
   redis-cli monitor
   
   # Test Socket.IO connection di browser console
   console.log(socket.connected);
   ```

6. **Performance Issues**
   ```bash
   # Check Redis cache status
   redis-cli info memory
   
   # Monitor database queries
   npx prisma studio
   ```

## 📚 Development Resources

### Architecture Documentation
- [Singleton Pattern Implementation](src/lib/singletons.ts) - HMR-safe database connections
- [Event Publisher Service](src/server/eventsPublisher.ts) - Centralized Socket.IO events
- [Cache Helper Functions](src/lib/cache.ts) - Redis namespace-based caching
- [API v1 with DTO Validation](src/app/api/v1/) - Modern REST API design
- [Notification Feature Module](src/features/notifications/) - Complete notification system

### Socket.IO Integration
- Custom server in [server.js](server.js) menggunakan singleton patterns
- Event handling di [src/server/socket.ts](src/server/socket.ts)
- Client provider di [src/app/socket-provider.tsx](src/app/socket-provider.tsx)

### External Resources
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Redis Documentation](https://redis.io/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)

## 📊 Performance Benchmarks

### Optimizations Implemented
- **Database**: Proper indexing, optimized queries, connection pooling
- **Cache**: Redis dengan TTL dan namespace-based invalidation
- **Real-time**: Efficient Socket.IO dengan room-based targeting
- **Frontend**: Code splitting, lazy loading, optimized bundle size
- **Build**: TypeScript strict mode, ESLint optimizations

### Key Metrics (After Optimization)
- **Build Time**: ~14s (dengan type checking dan linting)
- **Bundle Size**: Optimized dengan proper code splitting
- **Database Queries**: Indexed dan cached untuk performa optimal
- **Real-time Latency**: < 100ms untuk Socket.IO events
- **Memory Usage**: Reduced dengan singleton patterns

## 🤝 Contributing

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run typecheck && npm run lint`)
4. Commit changes (`git commit -m 'feat: add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

### Development Guidelines
- Ikuti TypeScript strict mode
- Gunakan singleton patterns untuk database/Redis connections
- Implement proper error handling dengan Zod validation
- Tulis tests untuk fitur baru
- Update dokumentasi untuk API changes

##  License

Aplikasi ini untuk keperluan internal dan tidak untuk didistribusikan secara komersial.

---

## ✨ What's New in This Version

### 🚀 Major Refactoring (2024)
- **⚡ Real-time Architecture**: Complete Socket.IO + Redis implementation  
- **🔔 Notification System**: Full-featured notification system dengan UI
- **🏗️ Clean Code**: Singleton patterns, feature modules, API v1
- **📊 Performance**: Redis caching, optimized queries, proper indexing
- **🛡️ Robust Validation**: Zod schemas untuk semua API dan events
- **🎯 Type Safety**: Complete TypeScript coverage dengan strict mode

### 🔧 Technical Improvements
- HMR-safe singleton patterns untuk development
- Event-driven architecture dengan centralized publisher
- Namespace-based Redis caching dengan smart invalidation
- Modern API design dengan DTO validation dan pagination
- Complete feature isolation dengan organized code structure

---

## 📞 Support

Untuk pertanyaan teknis atau bug report:
- Buat issue di repository ini dengan template yang sesuai
- Include log errors dan reproduction steps
- Mention environment details (OS, Node.js version, browser)

**Dibuat dengan ❤️ dan dioptimasi untuk performa maksimal**