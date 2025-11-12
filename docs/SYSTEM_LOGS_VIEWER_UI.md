# System Logs Viewer - UI Documentation

## 📋 Overview

Halaman **System Logs Viewer** adalah interface web untuk melihat, mencari, dan menganalisis log sistem secara real-time. Halaman ini **hanya dapat diakses oleh SUPER_ADMIN**.

**URL**: `/super-admin/logs`

---

## ✨ Fitur Utama

### 1. **Filter by Date** 📅
- Pilih tanggal tertentu untuk melihat logs hari itu
- Default: Hari ini
- Format: YYYY-MM-DD

### 2. **Filter by Level** 🏷️
- **ALL**: Semua level (default)
- **ERROR**: Error logs saja
- **WARN**: Warning logs saja
- **INFO**: Info logs saja
- **DEBUG**: Debug logs saja

Color coding:
- 🔴 **ERROR**: Red background
- 🟡 **WARN**: Yellow background
- 🔵 **INFO**: Blue background
- 🟣 **DEBUG**: Purple background

### 3. **Search Across Multiple Days** 🔍
- Search dengan keyword tertentu
- Cari di 1-30 hari terakhir
- Otomatis disable date & level filter saat search aktif
- Real-time search results

### 4. **Pagination** 📄
- 100 logs per halaman
- Previous/Next navigation
- Show total count

### 5. **Download Logs** ⬇️
- Download logs sebagai `.txt` file
- Format: `logs-{date}-{level}.txt`
- Contains all filtered logs

### 6. **Clear Logs** 🗑️
- Delete logs untuk tanggal tertentu
- Confirmation dialog
- **WARNING**: Cannot be undone!

### 7. **Quick Stats** 📊
- Total ERROR count
- Total WARN count
- Total INFO count
- Total DEBUG count

### 8. **Auto Refresh** 🔄
- Manual refresh button
- Loading state dengan spinner

---

## 🎨 UI Components

### Filter Bar
```tsx
┌─────────────────────────────────────────────────────┐
│  📅 Date         🏷️ Level        🔍 Search         │
│  [2025-11-12]   [ALL ▼]         [Search...] [X]    │
│                                  Days: [7 ▼]        │
│                                                     │
│  [🔄 Refresh]  [⬇️ Download]  [🗑️ Clear]  Total: 150│
└─────────────────────────────────────────────────────┘
```

### Log Entry Card
```tsx
┌─────────────────────────────────────────────────────┐
│ 2025-11-12 18:35:05  [ERROR]  [API:Upload:POST]    │
│                                                     │
│ Upload failed | Error: Invalid PDF structure       │
│ Data: {"file": "corrupted.pdf", "size": 12345}     │
└─────────────────────────────────────────────────────┘
```

### Pagination Bar
```tsx
┌─────────────────────────────────────────────────────┐
│ Showing 1 to 100 of 150                            │
│                                                     │
│           [◄ Previous] Page 1 of 2 [Next ►]       │
└─────────────────────────────────────────────────────┘
```

### Quick Stats Cards
```tsx
┌────────┬────────┬────────┬────────┐
│  🔴 15 │  🟡 8  │  🔵 95 │  🟣 32 │
│ ERROR  │  WARN  │  INFO  │ DEBUG  │
└────────┴────────┴────────┴────────┘
```

---

## 🔐 Access Control

### Role Check
```typescript
const session = await getServerSession(authOptions);

if (!session || session.user.role !== 'SUPER_ADMIN') {
  redirect('/'); // Redirect non-super-admins
}
```

### API Endpoint Protection
```typescript
// /api/logs - GET
if (!session || session.user.role !== 'SUPER_ADMIN') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

---

## 📡 API Integration

### GET /api/logs

**Query Parameters:**

1. **Date-based filtering:**
```
GET /api/logs?date=2025-11-12&level=ERROR
```

2. **Search-based filtering:**
```
GET /api/logs?search=PDF&daysBack=7
```

**Response:**
```json
{
  "date": "2025-11-12",
  "level": "ERROR",
  "total": 15,
  "logs": [
    {
      "timestamp": "2025-11-12T10:37:05.776Z",
      "level": "ERROR",
      "context": "API:Upload:POST",
      "message": "Upload failed | Error: ...",
      "raw": "[2025-11-12T10:37:05.776Z] [ERROR] [API:Upload:POST] Upload failed..."
    }
  ]
}
```

### DELETE /api/logs

**Request Body:**
```json
{
  "date": "2025-11-12"  // or "all" to clear everything
}
```

**Response:**
```json
{
  "message": "Logs cleared for 2025-11-12",
  "deletedFiles": ["error-2025-11-12.log", "all-2025-11-12.log"]
}
```

---

## 🎯 Usage Examples

### Example 1: View Today's Errors
1. Navigate to `/super-admin/logs`
2. Select **Level**: ERROR
3. Date will be today by default
4. Click **Refresh**

### Example 2: Search for PDF-related Issues
1. Enter "PDF" in search box
2. Select **Days Back**: 7
3. Click **Refresh**
4. View all PDF-related logs from last 7 days

### Example 3: Download Error Logs
1. Select **Level**: ERROR
2. Select desired **Date**
3. Click **Refresh**
4. Click **Download**
5. File saved as `logs-2025-11-12-ERROR.txt`

### Example 4: Clear Old Logs
1. Select **Date**: 2025-11-01 (old date)
2. Click **Clear Logs**
3. Confirm deletion
4. Logs for that date are deleted

---

## 🚀 Performance Optimizations

### Client-Side
- **Pagination**: Only render 100 logs at a time
- **Memoization**: Search and filter callbacks use `useCallback`
- **Lazy Loading**: Auto-fetch on mount and filter changes

### Server-Side
- **File-based Logs**: Fast file system reads
- **Indexed by Date**: Quick date-based lookups
- **Parsed Logs**: Pre-parsed for structured display

---

## 🎨 Styling

### Dark Mode Support
```css
- Light: bg-white, text-gray-900
- Dark: bg-gray-800, text-white
- Auto-detect: dark:bg-gray-800
```

### Responsive Design
```css
- Mobile: 1 column filters, stack cards
- Tablet: 2 column filters
- Desktop: 4 column filters, full table
```

### Color Palette
```css
ERROR:   bg-red-50    text-red-600    dark:bg-red-900/20
WARN:    bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20
INFO:    bg-blue-50   text-blue-600   dark:bg-blue-900/20
DEBUG:   bg-purple-50 text-purple-600 dark:bg-purple-900/20
```

---

## 📂 File Structure

```
src/app/(dashboard)/super-admin/logs/
├── page.tsx           # Server component with auth check
└── LogsViewer.tsx     # Client component with UI logic

src/app/api/logs/
└── route.ts           # API endpoint for GET/DELETE

src/lib/
└── logger.ts          # Logger service with file writing

logs/                  # Log files (gitignored)
├── error-2025-11-12.log
├── warn-2025-11-12.log
├── info-2025-11-12.log
├── debug-2025-11-12.log
└── all-2025-11-12.log
```

---

## 🔧 Configuration

### Logger Settings (in `logger.ts`)
```typescript
maxLogFiles: 30        // Keep logs for 30 days
logDir: 'logs'         // Log directory
formatLogEntry()       // Log format: [timestamp] [level] [context] message
```

### Logs Viewer Settings (in `LogsViewer.tsx`)
```typescript
logsPerPage: 100               // Pagination size
defaultDate: today             // Default date filter
defaultLevel: 'ALL'            // Default level filter
defaultDaysBack: 7             // Default search days
```

---

## 🐛 Troubleshooting

### Issue 1: No Logs Showing
**Cause**: No logs exist for selected date/level
**Solution**: 
- Check if logs directory exists
- Verify logger is writing logs
- Try searching with broader filters

### Issue 2: Permission Denied
**Cause**: User is not SUPER_ADMIN
**Solution**: 
- Login as SUPER_ADMIN
- Check session role in database

### Issue 3: Download Not Working
**Cause**: Browser blocking download
**Solution**:
- Check browser popup blocker
- Verify logs are not empty
- Check console for errors

### Issue 4: Clear Logs Failed
**Cause**: File system permissions
**Solution**:
- Check server has write access to logs folder
- Verify log files exist
- Check API response for error details

---

## 🎓 Best Practices

### For Monitoring
1. **Daily Error Review**: Check ERROR logs daily
2. **Weekly Audit**: Review WARN logs weekly
3. **Search Patterns**: Look for recurring error patterns
4. **Download Important**: Save critical logs before clearing

### For Performance
1. **Clear Old Logs**: Remove logs older than 30 days
2. **Use Pagination**: Don't load all logs at once
3. **Specific Filters**: Use date/level filters instead of search when possible
4. **Download Large Results**: For >1000 logs, download and analyze offline

### For Security
1. **Access Control**: Only SUPER_ADMIN can view logs
2. **Sensitive Data**: Logs may contain sensitive data - handle carefully
3. **Audit Trail**: Log viewing is not logged (consider adding this)
4. **Regular Cleanup**: Clear old logs to prevent data accumulation

---

## 📈 Future Enhancements

### Planned Features
- [ ] Real-time log streaming (WebSocket)
- [ ] Advanced search with regex
- [ ] Export to JSON/CSV
- [ ] Log analytics dashboard
- [ ] Alert configuration (email on ERROR)
- [ ] Log rotation automation
- [ ] Compressed log storage
- [ ] Multi-file upload for analysis

### UI Improvements
- [ ] Syntax highlighting for JSON logs
- [ ] Expandable log details
- [ ] Copy to clipboard button
- [ ] Share log permalink
- [ ] Dark/light mode toggle
- [ ] Customizable columns

---

## 📝 Summary

Halaman **System Logs Viewer** adalah tool powerful untuk:
- ✅ Monitoring real-time system activity
- ✅ Debugging production issues
- ✅ Analyzing error patterns
- ✅ Performance monitoring
- ✅ Audit trail

**Access**: SUPER_ADMIN only
**URL**: `/super-admin/logs`
**Features**: Filter, Search, Download, Clear, Stats
**Performance**: Optimized with pagination and caching
**UI**: Responsive, dark mode, color-coded levels

Dengan UI yang user-friendly dan fitur lengkap, Super Admin dapat dengan mudah memonitor dan menganalisis log sistem! 🎉
