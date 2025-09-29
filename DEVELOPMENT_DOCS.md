# SIMLOK2 Development Documentation

## Project Overview

SIMLOK2 adalah aplikasi Next.js real-time untuk mengelola pengajuan Surat Izin Masuk Lokasi (SIMLOK) dengan fitur-fitur:
- Pendaftaran dan verifikasi vendor
- Pengajuan dan persetujuan SIMLOK
- Penerbitan PDF SIMLOK dengan QR/Barcode
- Verifikasi lapangan via scanner
- Notifikasi real-time
- Audit trail lengkap

## Architecture Stack

- **Frontend**: Next.js App Router + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Socket.IO
- **Database**: MySQL via Prisma
- **Cache/Real-time**: Redis
- **Auth**: NextAuth.js with RBAC
- **PDF Generation**: Custom PDF generator
- **File Storage**: Local file system with structured directories

## Key Features Implemented

### 1. QR/Barcode Scanner
- **Location**: `src/components/scanner/CameraQRScanner.tsx`
- **Library**: ZXing for multiple barcode format support
- **Formats**: QR Code, Code 128, Code 39, EAN-13, UPC-A, PDF417, Data Matrix
- **Mobile optimized** with back camera enforcement
- **Professional UI** with hidden technical controls

### 2. QR Security System
- **Encryption**: AES-256 with SHA-256 hash verification
- **Format**: `SIMLOK|<encrypted_payload>|<hash>`
- **Validation**: Time-based expiry + date range verification
- **Audit**: All scans logged to `QrScan` table

### 3. Implementation Date Management
- **Custom Hook**: `useImplementationDates` for centralized logic
- **DateRangePicker**: Enhanced component with validation
- **Template Generation**: Auto-generated pelaksanaan and lain-lain templates
- **Bug Fix**: Resolved infinite re-render issues in reviewer modal

### 4. PDF Generation Enhancement
- **Metadata**: Title, Subject, Author, Keywords properly set
- **Logo Integration**: Logo appears on all pages
- **Worker Photos**: Integrated worker photo display
- **Professional Layout**: Consistent formatting throughout

### 5. Notification System (Real-time)
- **Socket.IO Rooms**: Role-based notification targeting
- **API v1**: RESTful notification management
- **Store**: Zustand state management
- **UI**: Bell icon with unread count

### 6. Scan History & Location
- **Location Tracking**: Uses verifier profile address
- **Daily Limit**: One scan per user per SIMLOK per day
- **Collaborative**: Multiple verifiers can scan same SIMLOK different days
- **Audit Trail**: Complete scan history with location data

### 7. File Management
- **Structure**: `public/uploads/{userId}/{category}/`
- **Categories**: sika-document, simja-document, worker-photo
- **API**: Secure file upload and serving
- **Cleanup**: Orphaned file detection and removal

## Database Schema (Key Tables)

### Core Tables
- `User` - User accounts with RBAC
- `Submission` - SIMLOK applications
- `QrScan` - Scan audit trail
- `Notification` + `NotificationRead` - Real-time notifications

### Key Fields Added
- `scan_location` - Location of QR scan
- `implementation_start_date` / `implementation_end_date` - Work period
- `worker_count` - Number of workers
- `vendor_phone` - Vendor contact number

## Recent Bug Fixes

### 1. Implementation Date Selection Bug
- **Issue**: Modal crashed when selecting implementation dates
- **Root Cause**: Infinite useEffect loops and unstable state management
- **Solution**: Custom hook with proper dependency management and date validation

### 2. Modal Glitch & Duplicate Errors
- **Issue**: Multiple API calls causing ERR_INSUFFICIENT_RESOURCES
- **Root Cause**: Unstable dependency arrays in useEffect
- **Solution**: Request debouncing, abort controllers, and proper cleanup

### 3. TypeScript Compilation Errors
- **Issue**: 13+ TypeScript errors after refactoring
- **Solution**: Proper type definitions and interface alignment

## API Endpoints (Critical)

### Authentication
- `POST /api/auth/signin`
- `POST /api/auth/signup`

### Submissions
- CRUD operations with admin/reviewer/approver workflows
- Approval triggers SIMLOK number generation and PDF creation

### QR Verification
- `POST /api/qr/verify` - Verify and log scan
- `GET /api/qr/verify` - Scan history

### Notifications (v1)
- `GET /api/v1/notifications` - List with pagination
- `PATCH /api/v1/notifications/[id]/read` - Mark as read
- `PATCH /api/v1/notifications/read-all` - Mark all as read

## Development Guidelines

### Code Organization
```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   ├── reviewer/       # Reviewer components
│   ├── scanner/        # QR/Barcode scanner
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── server/             # Server-side utilities
└── types/              # TypeScript definitions
```

### Best Practices
1. **State Management**: Use custom hooks for complex state logic
2. **Error Handling**: Implement proper error boundaries and user feedback
3. **Performance**: Memoize expensive computations and prevent unnecessary re-renders
4. **Security**: Validate all inputs, use RBAC, encrypt sensitive data
5. **Real-time**: Use Socket.IO rooms for targeted notifications

### Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Manual testing on mobile devices for scanner functionality

## Deployment Considerations

### Environment Variables
```bash
# Database
DATABASE_URL="mysql://..."

# Auth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="..."

# Redis
REDIS_HOST="..."
REDIS_PORT="..."
REDIS_PASSWORD="..."

# QR Security
QR_SECURITY_SALT="..."
AES_SECRET_KEY="..."

# File Upload
MAX_FILE_SIZE="10485760"
UPLOAD_BASE_PATH="./public/uploads"
```

### Performance Optimizations
- Redis caching for frequently accessed data
- Database indexing on critical columns
- Image optimization for PDF generation
- Connection pooling for database

### Security Checklist
- [x] Input validation with Zod
- [x] RBAC implementation
- [x] QR code encryption
- [x] File upload restrictions
- [x] SQL injection prevention via Prisma
- [x] XSS protection via React
- [x] CSRF protection via NextAuth

## Maintenance Tasks

### Regular Cleanup
1. Orphaned notifications cleanup
2. Old scan history archival
3. Unused file removal
4. Database optimization

### Monitoring
1. API response times
2. Database query performance
3. File storage usage
4. Error rates and types

## Future Enhancements

### Planned Features
1. **GPS Integration**: Optional GPS-based location verification
2. **Offline Mode**: PWA capabilities for offline scanning
3. **Batch Operations**: Bulk approval/rejection workflows
4. **Advanced Reporting**: Excel/PDF export with analytics
5. **Mobile App**: Native mobile app for better scanner experience

### Technical Improvements
1. **Performance**: Implement service workers and caching strategies
2. **Testing**: Add comprehensive test coverage
3. **Documentation**: API documentation with OpenAPI/Swagger
4. **DevOps**: CI/CD pipeline setup
5. **Monitoring**: Application performance monitoring (APM)