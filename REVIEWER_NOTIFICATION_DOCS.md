# Notifikasi Realtime Reviewer untuk Approval Submission

## Overview
Sistem notifikasi realtime yang memberitahu reviewer ketika ada submission yang telah di-approve oleh approver. Notifikasi menggunakan Server-Sent Events (SSE) melalui Redis pub/sub.

## Implementasi

### 1. Server-side Event Handler
**File:** `src/server/events.ts`

Fungsi `notifyReviewerSubmissionApproved(submissionId)` yang:
- Membuat notifikasi untuk reviewer ketika submission di-approve
- Mengirim notifikasi realtime via Redis
- Update unread count untuk reviewer
- Update stats reviewer

### 2. API Integration
**File:** `src/app/api/approver/simloks/[id]/final/route.ts`

Terintegrasi dengan endpoint approval approver:
- Memanggil notifikasi reviewer hanya ketika status = 'APPROVED'
- Mengirim notifikasi setelah vendor notification berhasil

### 3. Realtime Delivery
**Sistem SSE:** Channel `notifications:reviewer`
- Menggunakan sistem SSE yang sudah ada
- Hook `useRealTimeNotifications` otomatis menangkap notifikasi
- NotificationsBell component menampilkan notifikasi

## Struktur Data Notifikasi

```json
{
  "type": "notification:new",
  "data": {
    "id": "notification_id",
    "title": "Pengajuan Simlok Disetujui", 
    "message": "Pengajuan dari {vendor} - {officer} telah disetujui oleh Approver",
    "type": "submission_approved",
    "scope": "reviewer",
    "data": {
      "submissionId": "submission_id",
      "vendorName": "vendor_name", 
      "officerName": "officer_name",
      "jobDescription": "job_description",
      "approvedBy": "approver_name",
      "finalStatus": "APPROVED",
      "simlokNumber": "SIMLOK/2025/001",
      "approvedAt": "2025-09-29T..."
    },
    "createdAt": "2025-09-29T..."
  }
}
```

## Testing

### Script Test Manual
**File:** `test-reviewer-notification.js`

Mengirim notifikasi test ke Redis channel untuk validasi:
```bash
node test-reviewer-notification.js
```

### Flow Testing
1. Login sebagai reviewer di browser
2. Buka approver dashboard di tab lain
3. Approve sebuah submission
4. Notifikasi akan muncul realtime di reviewer dashboard

## Database Schema

### Notification Table
```sql
Notification {
  scope: 'reviewer'
  type: 'submission_approved'
  title: 'Pengajuan Simlok Disetujui'
  message: 'Pengajuan dari {vendor} - {officer} telah disetujui oleh Approver'
  data: JSON string with submission details
}
```

## Integration Points

### Frontend Components
- `NotificationsBell.tsx` - Menampilkan notifikasi baru
- `useRealTimeNotifications.ts` - Hook untuk menerima SSE
- `useNotificationsStore.ts` - State management notifikasi

### Backend Services
- `eventsPublisher.ts` - Publisher Socket.IO events
- `notificationsPublisher.ts` - Publisher Redis pub/sub
- `events.ts` - Business logic notifikasi

## Monitoring & Debugging

### Logs
- Server console: `✅ Notified reviewers about approved submission: {submissionId}`
- Redis pub: `📡 Published notification to notifications:reviewer`
- Client console: `SSE message received: notification:new`

### Test Commands
```bash
# Test Redis connection
node simple-test.js

# Test reviewer notification 
node test-reviewer-notification.js

# Check TypeScript compilation
npx tsc --noEmit
```

## Error Handling

### Common Issues
1. **No Subscribers**: Normal jika tidak ada reviewer online
2. **Redis Connection**: Pastikan Redis server berjalan
3. **SSE Reconnection**: Browser otomatis reconnect

### Debugging Tips
- Cek browser Network tab untuk SSE connection
- Monitor Redis channels: `MONITOR` command
- Verify notification scope di database

## Performance Notes
- Notifikasi hanya dikirim untuk submission dengan status 'APPROVED'
- Redis pub/sub efisien untuk multiple subscribers
- Notifikasi tersimpan di database untuk history
- SSE auto-reconnect menangani network issues