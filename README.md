# 🏗️ SimLok - Sistem Informasi Manajemen Lokasi Kerja

> Comprehensive Work Location Management System with Multi-Stage Approval Workflow

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.2-2D3748)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Data Flow](#-data-flow-diagram)
- [Role-Based Workflow](#-role-based-workflow)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Features](#-features)
- [Logger System](#-logger-system)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**SimLok** is an enterprise-grade work location management system designed for organizations that need to track, review, and approve work site submissions with multiple validation stages. The system implements a sophisticated multi-role approval workflow with real-time notifications, document management, and comprehensive audit logging.

### Key Features

- 🔐 **Multi-Role Authentication** - 6 distinct user roles with granular permissions
- 📝 **Submission Management** - Create, track, and manage work location submissions
- ✅ **Multi-Stage Approval** - 4-stage workflow: Verification → Review → Approval → Final Check
- 📄 **Document Management** - Upload and manage required documents (SIMJA, SIKA, JSA, etc.)
- 🔔 **Real-Time Notifications** - Instant updates via Socket.IO/SSE
- 📊 **Admin Dashboard** - Comprehensive analytics and system monitoring
- 📱 **QR Code System** - Track site visits and work order verification
- 🗄️ **Advanced Logging** - File-based logging with 30-day retention
- 🌐 **Export Capabilities** - Generate XLSX/CSV/PDF reports

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (React 19)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Dashboard   │  │   Forms      │  │   Admin UI   │              │
│  │   Components  │  │   Components │  │   (Logs)     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                       │
│         └──────────────────┴──────────────────┘                       │
│                            │                                          │
├────────────────────────────┼──────────────────────────────────────────┤
│                    MIDDLEWARE LAYER                                   │
│                            │                                          │
│  ┌─────────────────────────▼──────────────────────────┐              │
│  │         Authentication Middleware                   │              │
│  │  (Session Check, Role Validation, CSRF Protection)  │              │
│  └─────────────────────────┬──────────────────────────┘              │
│                            │                                          │
├────────────────────────────┼──────────────────────────────────────────┤
│                      API ROUTE LAYER                                  │
│                            │                                          │
│  ┌─────────────┬───────────┴──────────┬─────────────┐                │
│  │             │                       │             │                │
│  │ /api/       │  /api/               │ /api/       │                │
│  │ submissions │  notifications       │ logs        │                │
│  │             │                       │             │                │
│  └─────┬───────┴──────┬───────────────┴─────┬───────┘                │
│        │              │                      │                        │
├────────┼──────────────┼──────────────────────┼────────────────────────┤
│   SERVICE LAYER (Business Logic)            │                        │
│        │              │                      │                        │
│  ┌─────▼──────┐  ┌───▼────────┐  ┌──────────▼─────┐                 │
│  │ Submission │  │Notification│  │  Logger Service │                 │
│  │  Service   │  │  Service   │  │  (File-based)   │                 │
│  └─────┬──────┘  └───┬────────┘  └──────────┬─────┘                 │
│        │              │                      │                        │
├────────┼──────────────┼──────────────────────┼────────────────────────┤
│               DATA ACCESS LAYER (Prisma ORM)                          │
│        │              │                      │                        │
│  ┌─────▼──────────────▼──────────────────────▼─────┐                 │
│  │           Prisma Client (Query Builder)          │                 │
│  └─────────────────────────┬──────────────────────┘                  │
│                            │                                          │
├────────────────────────────┼──────────────────────────────────────────┤
│                     DATABASE LAYER                                    │
│                            │                                          │
│  ┌─────────────────────────▼──────────────────────┐                  │
│  │              MySQL Database                     │                  │
│  │  (Users, Submissions, Notifications, Sessions)  │                  │
│  └─────────────────────────────────────────────────┘                  │
│                                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                      EXTERNAL SERVICES                                │
│                                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │    Redis     │  │   Socket.IO  │  │  File System │               │
│  │   (Cache)    │  │   (Real-time)│  │   (Uploads)  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

### Submission Creation Flow

```
┌──────────┐
│  VENDOR  │
│  (User)  │
└────┬─────┘
     │
     │ 1. Create Submission
     │    - Work details
     │    - Documents (PDF)
     │    - Worker list (XLSX/CSV)
     │
     ▼
┌────────────────────────┐
│  /api/submissions      │
│  (POST)                │
├────────────────────────┤
│ • Validate session     │
│ • Check user role      │
│ • Parse form data      │
│ • Upload files         │
│ • Log request          │
└────┬───────────────────┘
     │
     │ 2. Save to Database
     │
     ▼
┌────────────────────────┐
│  Prisma Transaction    │
├────────────────────────┤
│ • Create submission    │
│ • Link documents       │
│ • Import workers       │
│ • Create notification  │
└────┬───────────────────┘
     │
     │ 3. Emit Events
     │
     ├──────────────────┬──────────────────┬──────────────────┐
     │                  │                  │                  │
     ▼                  ▼                  ▼                  ▼
┌─────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Socket  │      │  Redis   │      │  Logger  │      │  Email   │
│ Emit    │      │  Cache   │      │  File    │      │  (Queue) │
└─────────┘      └──────────┘      └──────────┘      └──────────┘
     │
     │ 4. Notify Roles
     │
     ▼
┌────────────────────────┐
│  VERIFIER Dashboard    │
│  (Real-time update)    │
└────────────────────────┘
```

### Approval Workflow Data Flow

```
VENDOR         VERIFIER       REVIEWER        APPROVER       VERIFIER
  │               │              │                │              │
  │ Submit        │              │                │              │
  ├──────────────►│              │                │              │
  │               │ Verify       │                │              │
  │               ├─────────────►│                │              │
  │               │              │ Review         │              │
  │               │              ├───────────────►│              │
  │               │              │                │ Approve      │
  │               │              │                ├─────────────►│
  │               │              │                │              │ Final Check
  │               │              │                │              │
  │◄──────────────┴──────────────┴────────────────┴──────────────┤
  │                                                               │
  │          APPROVED - QR Code Generated                         │
  │                                                               │
  ▼                                                               ▼
Dashboard                                                    Dashboard
(View Status)                                              (Scan QR)
```

---

## 👥 Role-Based Workflow

### User Roles & Permissions

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER ROLES                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   VENDOR    │  │  VERIFIER   │  │  REVIEWER   │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ • Create    │  │ • Verify    │  │ • Review    │              │
│  │   submission│  │   identity  │  │   documents │              │
│  │ • Upload    │  │ • Check     │  │ • Check     │              │
│  │   documents │  │   data      │  │   compliance│              │
│  │ • Track     │  │ • Accept/   │  │ • Accept/   │              │
│  │   status    │  │   Reject    │  │   Reject    │              │
│  │ • View own  │  │ • Final     │  │             │              │
│  │   data      │  │   check     │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  APPROVER   │  │ SUPER_ADMIN │  │   VISITOR   │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ • Final     │  │ • Full      │  │ • Read-only │              │
│  │   approval  │  │   control   │  │   access    │              │
│  │ • Business  │  │ • User mgmt │  │ • View      │              │
│  │   decision  │  │ • System    │  │   approved  │              │
│  │ • Accept/   │  │   config    │  │   data      │              │
│  │   Reject    │  │ • Logs      │  │ • No edit   │              │
│  │             │  │ • Analytics │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Workflow Stages

```
┌────────────────────────────────────────────────────────────────┐
│                    SUBMISSION LIFECYCLE                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. PENDING_VERIFICATION (verificationStatus = PENDING)         │
│     ┌─────────────────────────────────────────────────┐        │
│     │ • Vendor submits work location details          │        │
│     │ • Uploads required documents                    │        │
│     │ • Imports worker list                           │        │
│     │ • Waits for verifier check                      │        │
│     └──────────────────┬──────────────────────────────┘        │
│                        │                                        │
│                        ▼                                        │
│  2. PENDING_REVIEW (verificationStatus = VERIFIED)              │
│     ┌─────────────────────────────────────────────────┐        │
│     │ • Verifier checks vendor identity               │        │
│     │ • Validates submission completeness             │        │
│     │ • Can reject if data invalid                    │        │
│     │ • Forwards to reviewer if valid                 │        │
│     └──────────────────┬──────────────────────────────┘        │
│                        │                                        │
│                        ▼                                        │
│  3. PENDING_APPROVAL (reviewStatus = MEETS_REQUIREMENTS)        │
│     ┌─────────────────────────────────────────────────┐        │
│     │ • Reviewer checks document compliance           │        │
│     │ • Verifies work safety requirements             │        │
│     │ • Can reject if non-compliant                   │        │
│     │ • Forwards to approver if compliant             │        │
│     └──────────────────┬──────────────────────────────┘        │
│                        │                                        │
│                        ▼                                        │
│  4. APPROVED (approvalStatus = APPROVED)                        │
│     ┌─────────────────────────────────────────────────┐        │
│     │ • Approver makes final business decision        │        │
│     │ • Can reject for business reasons               │        │
│     │ • Sends to verifier for final check             │        │
│     └──────────────────┬──────────────────────────────┘        │
│                        │                                        │
│                        ▼                                        │
│  5. FINAL_APPROVED (Verifier final check)                      │
│     ┌─────────────────────────────────────────────────┐        │
│     │ • Verifier performs final validation            │        │
│     │ • QR code generated for work order              │        │
│     │ • Implementation dates set                      │        │
│     │ • Submission becomes active                     │        │
│     └─────────────────────────────────────────────────┘        │
│                                                                 │
│  REJECTED (Any stage)                                           │
│     ┌─────────────────────────────────────────────────┐        │
│     │ • Any role can reject during their stage        │        │
│     │ • Rejection notes required                      │        │
│     │ • Vendor can resubmit if allowed                │        │
│     └─────────────────────────────────────────────────┘        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.4.6 (App Router)
- **UI Library**: React 19.1.0 (Server Components)
- **Language**: TypeScript 5.9.2 (Strict Mode)
- **Styling**: Tailwind CSS 4.0
- **State Management**: Zustand 5.1.3
- **Forms**: React Hook Form + Zod validation (planned)
- **Icons**: Lucide React

### Backend
- **API**: Next.js API Routes (App Router)
- **ORM**: Prisma 6.16.2
- **Database**: MySQL 8.0+
- **Authentication**: NextAuth.js (Session-based)
- **Session Store**: Prisma Adapter (database sessions)
- **Real-time**: Socket.IO / Server-Sent Events

### Infrastructure
- **Cache**: Redis (optional)
- **File Storage**: Local file system (`/public/uploads`)
- **Logging**: Custom file-based logger (`/logs`)
- **Process Manager**: PM2 (production)

### Development Tools
- **Linting**: ESLint 9
- **Code Style**: Prettier
- **Git Hooks**: Husky + lint-staged (recommended)
- **Testing**: Jest + React Testing Library (planned)

---

## 📁 Project Structure

```
simlok2/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seeder for demo data
│   ├── localseed.ts           # Local development seed
│   └── migrations/            # Database migrations
│
├── public/
│   ├── assets/                # Static assets (images, fonts)
│   └── uploads/               # User uploaded files
│       ├── documents/         # Submission documents
│       ├── id-cards/          # ID card images
│       └── workers/           # Worker list XLSX/CSV
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login, register)
│   │   ├── (dashboard)/       # Protected dashboard routes
│   │   │   ├── vendor/        # Vendor-specific pages
│   │   │   ├── verifier/      # Verifier-specific pages
│   │   │   ├── reviewer/      # Reviewer-specific pages
│   │   │   ├── approver/      # Approver-specific pages
│   │   │   ├── super-admin/   # Admin pages
│   │   │   └── visitor/       # Visitor read-only pages
│   │   └── api/               # API routes
│   │       ├── auth/          # Authentication endpoints
│   │       ├── submissions/   # Submission CRUD
│   │       ├── notifications/ # Notification API
│   │       ├── logs/          # Logger API (admin only)
│   │       └── users/         # User management
│   │
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components (planned)
│   │   ├── form/              # Form components (DatePicker, etc.)
│   │   ├── layout/            # Layout components (Sidebar, Header)
│   │   └── dashboard/         # Dashboard-specific components
│   │
│   ├── lib/                   # Core utilities
│   │   ├── auth.ts            # Auth configuration
│   │   ├── prisma.ts          # Prisma client
│   │   ├── logger.ts          # Logger class (NEW ✨)
│   │   ├── serverDate.ts      # Server-side date utilities
│   │   └── utils.ts           # General utilities
│   │
│   ├── services/              # Business logic layer
│   │   ├── submissionService.ts
│   │   ├── notificationService.ts
│   │   └── userService.ts
│   │
│   ├── middleware/            # Custom middleware
│   │   └── withAuth.ts        # Role-based auth middleware
│   │
│   ├── types/                 # TypeScript types
│   │   ├── enums.ts           # Centralized enums (NEW ✨)
│   │   ├── next-auth.d.ts     # NextAuth type augmentation
│   │   └── index.ts           # Global types
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useSubmissions.ts
│   │   └── useNotifications.ts
│   │
│   ├── store/                 # Zustand stores
│   │   └── authStore.ts
│   │
│   └── styles/                # Global styles
│       └── globals.css
│
├── logs/                      # Application logs (NEW ✨)
│   ├── app-2025-01-09.log
│   └── README.md              # Log directory info
│
├── docs/                      # Documentation
│   ├── LOGGER_SYSTEM.md       # Logger documentation
│   ├── LOGGER_EXAMPLES.md     # Logger usage examples
│   ├── OPTIMASI_UPLOAD_API_PERFORMANCE.md
│   ├── NOTIFICATION_ICONS_STANDARDIZATION.md
│   └── SERVER_TIME_BEST_PRACTICES.md
│
├── scripts/                   # Utility scripts
│   └── migrate-phone-numbers.ts
│
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore
├── CHANGELOG.md               # Version history (NEW ✨)
├── README.md                  # This file
├── package.json
├── tsconfig.json
├── next.config.ts
├── middleware.ts              # Global middleware
└── eslint.config.js
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- Node.js 18.17+ or 20+
- npm or yarn
- MySQL 8.0+

# Optional
- Redis (for caching)
- PM2 (for production)
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd simlok2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your settings (see [Environment Variables](#-environment-variables))

4. **Setup database**
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Run migrations
   npx prisma migrate deploy

   # Seed database (optional)
   npx prisma db seed
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

### Development Workflow

```bash
# Development
npm run dev              # Start dev server with hot reload

# Database
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma migrate dev   # Create new migration
npx prisma db push       # Push schema changes (dev only)
npx prisma db seed       # Seed database

# Build & Production
npm run build            # Create production build
npm start                # Start production server

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Fix auto-fixable issues
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/simlok"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"

# JWT (Optional - for API tokens)
JWT_SECRET="another-secret-key-for-jwt"
JWT_REFRESH_SECRET="refresh-token-secret-key"

# Redis (Optional - for caching)
REDIS_URL="redis://localhost:6379"

# File Upload
MAX_FILE_SIZE=10485760        # 10MB in bytes
UPLOAD_DIR="public/uploads"

# Logger
LOG_DIR="logs"
MAX_LOG_FILES=30              # Keep logs for 30 days

# Email (Optional - for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# App Config
NODE_ENV="development"        # development | production
NEXT_PUBLIC_APP_NAME="SimLok"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"
```

---

## 🗄️ Database Schema

### Core Tables

```sql
-- Users (Multi-role support)
User {
  id              String   @id @default(cuid())
  email           String   @unique
  password        String   -- Hashed with bcrypt
  name            String
  role            User_role -- VENDOR, REVIEWER, etc.
  phone           String?
  companyName     String?
  address         String?
  verificationStatus VerificationStatus
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

-- Submissions (Work Location Requests)
Submission {
  id                    String   @id @default(cuid())
  vendorId              String
  workLocation          String   @db.Text -- Up to 65,535 chars
  workFacilities        String   @db.Text
  workDescription       String   @db.Text
  implementationDateStart DateTime?
  implementationDateEnd   DateTime?
  workerCount           Int
  verificationStatus    VerificationStatus
  reviewStatus          ReviewStatus
  approvalStatus        ApprovalStatus
  qrCode                String?  @db.VarChar(1000)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  -- Relations
  vendor                User
  documents             Document[]
  workers               Worker[]
  notifications         Notification[]
  qrScans               QRScan[]
}

-- Documents (Required Files)
Document {
  id              String   @id @default(cuid())
  submissionId    String
  fileName        String
  filePath        String
  fileSize        Int
  fileType        String   -- PDF, XLSX, etc.
  uploadedAt      DateTime @default(now())
  
  -- Relations
  submission      Submission
}

-- Workers (Imported from XLSX/CSV)
Worker {
  id              String   @id @default(cuid())
  submissionId    String
  name            String
  position        String?
  idNumber        String?  -- ID card number
  createdAt       DateTime @default(now())
  
  -- Relations
  submission      Submission
}

-- Notifications (Real-time alerts)
Notification {
  id              String   @id @default(cuid())
  userId          String
  submissionId    String?
  title           String
  message         String   @db.Text
  scope           NotificationScope -- admin, vendor, reviewer, approver
  isRead          Boolean  @default(false)
  createdAt       DateTime @default(now())
  
  -- Relations
  user            User
  submission      Submission?
}

-- Sessions (NextAuth database sessions)
Session {
  id              String   @id @default(cuid())
  sessionToken    String   @unique
  userId          String
  expires         DateTime
  
  -- Relations
  user            User
}

-- QR Scans (Track site visits)
QRScan {
  id              String   @id @default(cuid())
  submissionId    String
  scannedBy       String   -- User who scanned
  scannedAt       DateTime @default(now())
  location        String?  -- GPS coordinates or address
  
  -- Relations
  submission      Submission
  user            User
}
```

### Indexes (Performance Optimization)

```sql
-- User lookups
@@index([email])
@@index([role])

-- Submission queries
@@index([vendorId])
@@index([verificationStatus])
@@index([reviewStatus])
@@index([approvalStatus])
@@index([createdAt])

-- Notification queries
@@index([userId])
@@index([isRead])
@@index([scope])
```

---

## 📡 API Documentation

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account

**Request Body:**
```json
{
  "email": "vendor@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "VENDOR",
  "phone": "+628123456789",
  "companyName": "PT Example Ltd",
  "address": "Jakarta, Indonesia"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "clx123abc",
    "email": "vendor@example.com",
    "name": "John Doe",
    "role": "VENDOR"
  }
}
```

---

#### `POST /api/auth/signin`
Login with email and password

**Request Body:**
```json
{
  "email": "vendor@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "session": {
    "user": {
      "id": "clx123abc",
      "email": "vendor@example.com",
      "name": "John Doe",
      "role": "VENDOR"
    },
    "expires": "2025-02-09T12:00:00.000Z"
  }
}
```

---

### Submission Endpoints

#### `GET /api/submissions`
Retrieve submissions (filtered by user role)

**Query Parameters:**
- `status` (optional): Filter by verification/review/approval status
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "sub123",
      "workLocation": "Site A - Jakarta",
      "verificationStatus": "PENDING",
      "reviewStatus": "PENDING_REVIEW",
      "approvalStatus": "PENDING_APPROVAL",
      "workerCount": 25,
      "createdAt": "2025-01-09T10:00:00.000Z",
      "vendor": {
        "name": "John Doe",
        "companyName": "PT Example Ltd"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "pages": 3
  }
}
```

---

#### `POST /api/submissions`
Create a new submission (VENDOR only)

**Request Body (multipart/form-data):**
```
workLocation: "Construction Site A - Jakarta"
workFacilities: "Office, Workshop, Storage"
workDescription: "Building construction project"
workerCount: 25
documents: [File, File, ...] (PDF files)
workerList: File (XLSX/CSV)
```

**Response (201):**
```json
{
  "success": true,
  "message": "Submission created successfully",
  "submission": {
    "id": "sub123",
    "workLocation": "Construction Site A - Jakarta",
    "verificationStatus": "PENDING",
    "qrCode": null,
    "createdAt": "2025-01-09T10:00:00.000Z"
  }
}
```

---

#### `PATCH /api/submissions/[id]/verify`
Verify a submission (VERIFIER only)

**Request Body:**
```json
{
  "action": "VERIFIED", // or "REJECTED"
  "notes": "Identity verified, data is complete"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Submission verified successfully",
  "submission": {
    "id": "sub123",
    "verificationStatus": "VERIFIED",
    "reviewStatus": "PENDING_REVIEW"
  }
}
```

---

#### `PATCH /api/submissions/[id]/review`
Review a submission (REVIEWER only)

**Request Body:**
```json
{
  "action": "MEETS_REQUIREMENTS", // or "NOT_MEETS_REQUIREMENTS"
  "notes": "All documents comply with safety standards"
}
```

---

#### `PATCH /api/submissions/[id]/approve`
Approve a submission (APPROVER only)

**Request Body:**
```json
{
  "action": "APPROVED", // or "REJECTED"
  "notes": "Approved for implementation",
  "implementationDateStart": "2025-02-01",
  "implementationDateEnd": "2025-03-31"
}
```

---

### Notification Endpoints

#### `GET /api/notifications`
Get user notifications

**Query Parameters:**
- `unreadOnly` (optional): "true" to get only unread notifications

**Response (200):**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif123",
      "title": "New Submission",
      "message": "Vendor John Doe submitted a new work location request",
      "isRead": false,
      "createdAt": "2025-01-09T10:00:00.000Z",
      "submission": {
        "id": "sub123",
        "workLocation": "Site A"
      }
    }
  ],
  "unreadCount": 5
}
```

---

#### `PATCH /api/notifications/[id]/read`
Mark notification as read

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### Logger Endpoints (SUPER_ADMIN only)

#### `GET /api/logs`
Retrieve application logs

**Query Parameters:**
- `date` (optional): "YYYY-MM-DD" to get specific date logs
- `level` (optional): "ERROR" | "WARN" | "INFO" | "DEBUG"
- `search` (optional): Search term to filter logs
- `daysBack` (optional): Number of days to search back (default: 7)

**Response (200):**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-01-09T10:15:30.123Z",
      "level": "ERROR",
      "message": "Submission validation failed",
      "context": {
        "userId": "user123",
        "ip": "192.168.1.1",
        "error": "Missing required documents"
      }
    }
  ],
  "total": 156
}
```

---

#### `DELETE /api/logs`
Clear logs for a specific date or all logs

**Request Body:**
```json
{
  "date": "2025-01-09" // or "all"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logs cleared for 2025-01-09"
}
```

---

## ✨ Features

### 1. Multi-Role Authentication System
- **6 distinct roles**: VENDOR, REVIEWER, APPROVER, VERIFIER, SUPER_ADMIN, VISITOR
- Session-based authentication with database storage
- Role-based access control (RBAC) on all routes
- Protected API endpoints with middleware
- Automatic session expiration and refresh

### 2. Submission Management
- **Create submissions** with work location details
- **Upload multiple documents** (PDF, max 10MB each)
- **Import worker lists** from XLSX/CSV files
- **Track submission status** through workflow stages
- **Real-time status updates** via notifications
- **QR code generation** for approved submissions

### 3. Multi-Stage Approval Workflow
- **Stage 1: Verification** - Verifier checks vendor identity and data completeness
- **Stage 2: Review** - Reviewer validates documents and compliance
- **Stage 3: Approval** - Approver makes business decision
- **Stage 4: Final Check** - Verifier performs final validation
- Rejection capability at any stage with mandatory notes

### 4. Document Management
- Support for multiple document types (SIMJA, SIKA, JSA, Work Order, Contract)
- Secure file upload with validation
- File size limit: 10MB per file
- Allowed formats: PDF, XLSX, CSV
- Document versioning (planned)

### 5. Real-Time Notifications
- Socket.IO/SSE for instant updates
- Scope-based notifications (admin, vendor, reviewer, approver)
- In-app notification center
- Email notifications (planned)
- Push notifications (planned)

### 6. Admin Dashboard
- Comprehensive system analytics
- User management (create, edit, delete users)
- Submission overview and statistics
- Log viewer with filtering and search
- System configuration

### 7. Logger System (NEW ✨)
- **File-based logging** with automatic rotation
- **4 log levels**: INFO, WARN, ERROR, DEBUG
- **30-day retention** policy
- **Search and filter** capabilities
- **Color-coded console** output
- **API for log access** (admin only)
- **Structured logging** with context metadata

### 8. QR Code System
- Generate QR codes for approved work orders
- Track QR scans with timestamp and location
- Verify work order authenticity on-site
- Scan history and analytics

### 9. Export & Reporting
- Export submissions to XLSX/CSV/PDF
- Generate compliance reports
- Worker list exports
- Custom date range selection

---

## 📊 Logger System

### Overview
SimLok includes a comprehensive file-based logging system for monitoring application behavior, tracking errors, and debugging issues.

### Features
- **Multi-level logging**: INFO, WARN, ERROR, DEBUG
- **Automatic rotation**: New log file each day
- **30-day retention**: Old logs automatically deleted
- **Structured logs**: JSON-like format with metadata
- **Color-coded output**: Easy to read in console
- **Search capability**: Find logs by term across multiple days
- **Admin UI**: View and manage logs from dashboard

### Usage Example

```typescript
import logger from '@/lib/logger';

// Basic logging
logger.info('User logged in', { userId: 'user123', ip: '192.168.1.1' });
logger.warn('Upload limit exceeded', { userId: 'user123', fileSize: '15MB' });
logger.error('Database connection failed', { error: err.message });
logger.debug('Query executed', { query: 'SELECT * FROM users', duration: '45ms' });

// API request logging
import { getRequestMetadata } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const metadata = getRequestMetadata(request);
  
  try {
    logger.info('API request received', {
      ...metadata,
      endpoint: '/api/submissions'
    });
    
    // Your API logic...
    
    logger.info('API request completed', { ...metadata, duration: '250ms' });
  } catch (error) {
    logger.apiError(error as Error, request, {
      endpoint: '/api/submissions',
      action: 'create_submission'
    });
  }
}
```

### Log File Format

```
logs/
  app-2025-01-09.log
  app-2025-01-08.log
  app-2025-01-07.log
  ...
```

Each log entry:
```
[2025-01-09T10:15:30.123Z] [INFO] User logged in | userId: user123, ip: 192.168.1.1
[2025-01-09T10:16:45.456Z] [ERROR] Database query failed | error: Connection timeout, query: SELECT * FROM...
```

### Admin UI Access
Navigate to: `/admin/logs`

Features:
- Filter by date
- Filter by level (ALL, ERROR, WARN, INFO, DEBUG)
- Search logs with term
- Clear logs by date
- View raw log details

---

## 🤝 Contributing

### Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Follow coding standards**
   - Use TypeScript strict mode
   - Follow ESLint rules
   - Write meaningful commit messages
   - Add JSDoc comments for functions

4. **Test your changes**
   ```bash
   npm run build
   npm run lint
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   git push origin feature/amazing-feature
   ```

6. **Create Pull Request**
   - Describe your changes clearly
   - Reference related issues
   - Ensure CI/CD passes

### Code Style

- Use **descriptive variable names** (`submissionId` not `sid`)
- Prefer **functional components** over class components
- Use **async/await** over promises
- Keep functions **small and focused**
- Add **error handling** for all async operations
- Use **TypeScript types** (avoid `any`)

### Commit Message Convention

```
feat: add user export functionality
fix: resolve submission validation bug
docs: update API documentation
refactor: simplify logger implementation
test: add unit tests for auth service
chore: update dependencies
```

---

## 📝 License

This project is proprietary and confidential.

**Copyright © 2025 SimLok Development Team. All rights reserved.**

Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without express written permission from the copyright holder.

---

## 📞 Support

For support, please contact:
- **Email**: support@simlok.example.com
- **Documentation**: [docs/](./docs/)
- **Issue Tracker**: GitHub Issues

---

## 🎯 Roadmap

### Version 2.1 (Q1 2025)
- [ ] Service layer extraction (business logic separation)
- [ ] Zod validation schemas for all forms
- [ ] Reusable UI component library
- [ ] Comprehensive unit tests (Jest)
- [ ] API documentation (OpenAPI/Swagger)

### Version 2.2 (Q2 2025)
- [ ] Email notification system
- [ ] Push notifications (PWA)
- [ ] Advanced analytics dashboard
- [ ] Document versioning
- [ ] Audit trail system

### Version 3.0 (Q3 2025)
- [ ] Mobile app (React Native)
- [ ] Offline mode support
- [ ] Advanced search with filters
- [ ] Role-based dashboards customization
- [ ] Multi-language support (i18n)

---

## 🏆 Credits

Built with ❤️ by the SimLok Development Team

**Key Technologies:**
- [Next.js](https://nextjs.org/) - React Framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type Safety

---

## 📚 Documentation Index

- [CHANGELOG.md](./CHANGELOG.md) - Version history and changes
- [LOGGER_SYSTEM.md](./docs/LOGGER_SYSTEM.md) - Logger documentation
- [LOGGER_EXAMPLES.md](./docs/LOGGER_EXAMPLES.md) - Logger usage examples
- [OPTIMASI_UPLOAD_API_PERFORMANCE.md](./docs/OPTIMASI_UPLOAD_API_PERFORMANCE.md) - Upload optimization
- [NOTIFICATION_ICONS_STANDARDIZATION.md](./docs/NOTIFICATION_ICONS_STANDARDIZATION.md) - UI standards
- [SERVER_TIME_BEST_PRACTICES.md](./docs/SERVER_TIME_BEST_PRACTICES.md) - Date handling guide

---

**Last Updated**: November 9, 2025  
**Version**: 2.0.0  
**Status**: Active Development 🚧
