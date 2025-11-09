# Sistem Logger SIMLOK

## Overview

Sistem logger telah diimplementasikan untuk mencatat semua aktivitas dan error yang terjadi di aplikasi, khususnya pada operasi-operasi penting seperti pembuatan submission, autentikasi, dan operasi database.

## Fitur Logger

### 1. Multi-Level Logging
- **INFO**: Informasi umum tentang operasi normal
- **WARN**: Peringatan tentang situasi yang tidak normal tapi masih dapat ditangani
- **ERROR**: Error yang terjadi dan perlu perhatian
- **DEBUG**: Informasi debug untuk development (hanya muncul di development mode)

### 2. File-Based Logging
- Log disimpan di folder `/logs` di root project
- Setiap level memiliki file terpisah per hari: `error-2025-11-09.log`, `warn-2025-11-09.log`, dll
- Ada juga file `all-2025-11-09.log` yang berisi semua log gabungan
- Log file otomatis dibersihkan setelah 30 hari

### 3. Structured Logging
Setiap log entry berisi:
- **Timestamp**: Waktu kejadian (ISO 8601 format)
- **Level**: Tingkat severity (INFO/WARN/ERROR/DEBUG)
- **Context**: Konteks di mana log terjadi (e.g., "API:Submissions:POST")
- **Message**: Pesan deskriptif
- **Data**: Data tambahan (opsional)
- **Error**: Detail error termasuk stack trace (untuk ERROR level)
- **User ID**: ID user yang terkait (opsional)
- **IP**: IP address request (opsional)
- **User Agent**: Browser/client info (opsional)

### 4. Console Output
- Log juga ditampilkan di console dengan color coding:
  - INFO: Cyan
  - WARN: Yellow
  - ERROR: Red
  - DEBUG: Magenta

## Cara Penggunaan

### Import Logger

```typescript
import { logger, getRequestMetadata } from '@/lib/logger';
```

### Basic Logging

```typescript
// Info log
logger.info('Context', 'Message', { additionalData: 'value' });

// Warning log
logger.warn('Context', 'Warning message', { reason: 'something' });

// Error log
logger.error('Context', 'Error occurred', error, { context: 'data' });

// Debug log (hanya muncul di development)
logger.debug('Context', 'Debug info', { debugData: 'value' });
```

### API Error Logging

Untuk API routes, gunakan method khusus `apiError` yang menyertakan metadata request:

```typescript
import { logger, getRequestMetadata } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { ip, userAgent } = getRequestMetadata(request);
  
  try {
    // ... your code
  } catch (error) {
    logger.apiError(
      'API:YourRoute',
      'Error message',
      error,
      {
        userId: session?.user?.id,
        ip,
        userAgent,
        requestBody: { /* sanitized request body */ },
        requestParams: { /* request params */ },
      }
    );
    
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

### Example: Submission Creation

```typescript
// Success log
logger.info('API:Submissions:POST', 'Submission created successfully', {
  userId: session.user.id,
  submissionId: submission.id,
  workersCount: workers?.length || 0,
});

// Error log
logger.apiError(
  'API:Submissions:POST',
  'Database error while creating submission',
  dbError,
  {
    userId: session.user.id,
    requestBody: {
      vendor_name: submissionData.vendor_name,
      workersCount: workers?.length || 0,
    },
  }
);
```

## API Endpoints

### GET /api/logs
Mengambil log berdasarkan filter.

**Parameters:**
- `date`: Tanggal log (YYYY-MM-DD) - default: hari ini
- `level`: Level log (INFO/WARN/ERROR/DEBUG/ALL) - default: ALL
- `search`: Kata kunci pencarian
- `daysBack`: Jumlah hari ke belakang untuk pencarian - default: 7

**Authorization:** SUPER_ADMIN only

**Example:**
```bash
GET /api/logs?date=2025-11-09&level=ERROR
GET /api/logs?search=submission&daysBack=7
```

### DELETE /api/logs
Menghapus log file.

**Body:**
```json
{
  "date": "2025-11-09"  // atau "all" untuk hapus semua
}
```

**Authorization:** SUPER_ADMIN only

### POST /api/logs
Mendapatkan daftar file log yang tersedia.

**Authorization:** SUPER_ADMIN only

## Admin UI

Dashboard untuk melihat log tersedia di: `/admin/logs`

**Fitur:**
- Filter berdasarkan tanggal dan level
- Pencarian keyword
- View raw log
- Clear logs
- Color-coded log levels
- Real-time statistics

**Access:** Hanya SUPER_ADMIN yang dapat mengakses

## Implementasi di API Routes

### Submission Route (`/api/submissions`)

Logger telah diintegrasikan untuk mencatat:

1. **Unauthorized attempts**
   ```typescript
   logger.warn('API:Submissions:POST', 'Unauthorized submission attempt', { ip, userAgent });
   ```

2. **Successful operations**
   ```typescript
   logger.info('API:Submissions:POST', 'Submission created successfully', {
     userId: session.user.id,
     submissionId: submission.id,
   });
   ```

3. **Validation errors**
   ```typescript
   logger.warn('API:Submissions:POST', 'Required field missing', {
     userId: session.user.id,
     missingField: field,
   });
   ```

4. **Database errors**
   ```typescript
   logger.apiError(
     'API:Submissions:POST',
     'Database error while creating submission',
     dbError,
     { userId: session.user.id }
   );
   ```

5. **General errors**
   ```typescript
   logger.apiError(
     'API:Submissions:POST',
     'Unexpected error',
     error,
     { userId: session?.user?.id, ip, userAgent }
   );
   ```

## Best Practices

### 1. Naming Conventions
Gunakan format hierarchical untuk context:
- `API:Resource:Method` untuk API routes
- `Service:Operation` untuk services
- `Component:Action` untuk client-side

Examples:
- `API:Submissions:POST`
- `API:Auth:Login`
- `Service:Email:Send`
- `Component:Form:Validate`

### 2. Message Guidelines
- Gunakan kalimat yang jelas dan deskriptif
- Dalam bahasa Inggris untuk konsistensi
- Hindari informasi sensitif (password, token, dll)

### 3. Data Sanitization
Selalu sanitize data sebelum logging:

```typescript
// ❌ BAD - logging sensitive data
logger.info('Login', 'User logged in', {
  password: userData.password, // NEVER!
  creditCard: userData.cc // NEVER!
});

// ✅ GOOD - sanitized data
logger.info('API:Auth:Login', 'User logged in successfully', {
  userId: user.id,
  email: user.email,
  ip: ip,
});
```

### 4. Error Handling
Selalu log error dengan detail yang cukup:

```typescript
try {
  // operation
} catch (error) {
  logger.error('Context', 'What went wrong', error, {
    relevantData: 'that helps debugging'
  });
  // handle error
}
```

### 5. Performance Consideration
- Debug logs hanya muncul di development
- File I/O operations di-handle asynchronously
- Old logs otomatis dibersihkan

## File Structure

```
/logs/
  ├── error-2025-11-09.log      # Error logs untuk 9 Nov 2025
  ├── warn-2025-11-09.log       # Warning logs untuk 9 Nov 2025
  ├── info-2025-11-09.log       # Info logs untuk 9 Nov 2025
  ├── debug-2025-11-09.log      # Debug logs untuk 9 Nov 2025
  ├── all-2025-11-09.log        # All logs gabungan
  └── ...                        # Files lama (max 30 files)
```

## Log Rotation

- Logs di-rotate otomatis per hari
- Maximum 30 files disimpan
- Files lama otomatis dihapus
- Cleanup terjadi saat logger diinisialisasi

## Troubleshooting

### Logs tidak muncul di file
1. Check apakah folder `/logs` exists dan writable
2. Check NODE_ENV setting
3. Check console untuk error messages

### Permission errors
```bash
# Ensure logs directory is writable
chmod 755 logs
```

### Logs terlalu besar
- Adjust `maxLogFiles` di logger.ts
- Implementasi manual cleanup jika perlu
- Gunakan log rotation tools di production

## Security Considerations

1. **Access Control**: Hanya SUPER_ADMIN yang dapat view/delete logs
2. **Data Sanitization**: Jangan log sensitive information
3. **File Permissions**: Pastikan log files tidak publicly accessible
4. **Retention**: Old logs otomatis dihapus (30 days)

## Future Enhancements

- [ ] Log aggregation untuk distributed systems
- [ ] Integration dengan monitoring tools (Sentry, DataDog, etc)
- [ ] Automated alerts untuk critical errors
- [ ] Log compression untuk archival
- [ ] Real-time log streaming via WebSocket
- [ ] Advanced search dengan regex
- [ ] Export logs ke external storage

## Example Log Output

```
[2025-11-09T10:30:45.123Z] [INFO] [API:Submissions:POST] Submission request started | User: cm123abc | IP: 192.168.1.1
[2025-11-09T10:30:45.456Z] [INFO] [API:Submissions:POST] User verified | Data: {"userId":"cm123abc","email":"vendor@example.com"}
[2025-11-09T10:30:45.789Z] [INFO] [API:Submissions:POST] Submission created successfully | Data: {"userId":"cm123abc","submissionId":"sub123","workersCount":5}
[2025-11-09T10:31:12.345Z] [ERROR] [API:Submissions:POST] Database error while creating submission | User: cm456def | Error: PrismaClientKnownRequestError - Unique constraint failed
Stack: PrismaClientKnownRequestError: Unique constraint failed on the fields: (`qrcode`)
    at ...
```

## Conclusion

Sistem logger ini menyediakan comprehensive visibility ke dalam aplikasi behavior, memudahkan debugging, monitoring, dan troubleshooting. Gunakan secara konsisten di seluruh codebase untuk maintainability yang lebih baik.
