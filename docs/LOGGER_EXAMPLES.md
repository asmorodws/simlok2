# Contoh Penggunaan Logger

## 1. Logging pada Authentication

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { logger } from '@/lib/logger';

// Success login
logger.info('Auth:Login', 'User logged in successfully', {
  userId: user.id,
  email: user.email,
  ip: request.ip,
});

// Failed login
logger.warn('Auth:Login', 'Failed login attempt', {
  email: credentials.email,
  reason: 'Invalid credentials',
  ip: request.ip,
});
```

## 2. Logging pada API Routes

```typescript
// src/app/api/submissions/route.ts
import { logger, getRequestMetadata } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const { ip, userAgent } = getRequestMetadata(request);
  
  try {
    // Log request start
    logger.info('API:Submissions:POST', 'Submission request started', {
      userId: session.user.id,
      ip,
    });

    // ... process submission

    // Log success
    logger.info('API:Submissions:POST', 'Submission created successfully', {
      userId: session.user.id,
      submissionId: submission.id,
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    // Log error with full context
    logger.apiError(
      'API:Submissions:POST',
      'Failed to create submission',
      error,
      {
        userId: session?.user?.id,
        ip,
        userAgent,
        requestBody: { vendor_name: body.vendor_name }, // sanitized
      }
    );
    
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
```

## 3. Logging pada Services

```typescript
// src/services/emailService.ts
import { logger } from '@/lib/logger';

export async function sendEmail(to: string, subject: string, body: string) {
  try {
    // Send email logic
    
    logger.info('Service:Email', 'Email sent successfully', {
      to,
      subject,
    });
  } catch (error) {
    logger.error('Service:Email', 'Failed to send email', error, {
      to,
      subject,
    });
    throw error;
  }
}
```

## 4. Logging pada Background Jobs

```typescript
// src/jobs/cleanupJob.ts
import { logger } from '@/lib/logger';

export async function runCleanup() {
  logger.info('Job:Cleanup', 'Starting cleanup job');
  
  try {
    const deletedCount = await cleanupOldData();
    
    logger.info('Job:Cleanup', 'Cleanup completed successfully', {
      deletedCount,
    });
  } catch (error) {
    logger.error('Job:Cleanup', 'Cleanup job failed', error);
  }
}
```

## 5. Logging pada Database Operations

```typescript
// src/services/userService.ts
import { logger } from '@/lib/logger';

export async function createUser(userData: UserData) {
  try {
    const user = await prisma.user.create({ data: userData });
    
    logger.info('Service:User:Create', 'User created successfully', {
      userId: user.id,
      email: user.email,
    });
    
    return user;
  } catch (error) {
    logger.error('Service:User:Create', 'Failed to create user', error, {
      email: userData.email, // Don't log sensitive data like passwords
    });
    throw error;
  }
}
```

## 6. Debug Logging

```typescript
// Only logs in development
logger.debug('Component:Form', 'Form validation', {
  formData: sanitizedData,
  validationResult: result,
});
```

## 7. Warning Logging

```typescript
// Rate limit warning
logger.warn('RateLimit', 'User approaching rate limit', {
  userId: user.id,
  currentCount: count,
  limit: maxLimit,
});

// Deprecated feature usage
logger.warn('API:OldEndpoint', 'Using deprecated endpoint', {
  userId: user.id,
  endpoint: '/api/old/submissions',
});
```

## 8. Search and Analysis

```typescript
// Search for errors related to specific user
const logs = logger.searchLogs('userId:cm123abc', 7);

// Get all error logs for today
const errors = logger.getLogs(
  new Date().toISOString().split('T')[0],
  LogLevel.ERROR
);
```

## Best Practices

### DO ✅

```typescript
// Include relevant context
logger.error('API:Payment', 'Payment processing failed', error, {
  userId: user.id,
  orderId: order.id,
  amount: order.amount,
});

// Use structured data
logger.info('API:Export', 'Export completed', {
  exportType: 'submissions',
  recordCount: records.length,
  format: 'xlsx',
});

// Log important state changes
logger.info('Submission:StatusChange', 'Submission approved', {
  submissionId: id,
  previousStatus: 'PENDING',
  newStatus: 'APPROVED',
  approvedBy: admin.id,
});
```

### DON'T ❌

```typescript
// ❌ Don't log sensitive data
logger.info('Auth:Login', 'Login attempt', {
  password: user.password, // NEVER!
  creditCard: payment.cc,  // NEVER!
  apiKey: config.apiKey,   // NEVER!
});

// ❌ Don't log without context
logger.error('Error', 'Something failed', error); // Too vague

// ❌ Don't log in loops without throttling
for (const item of items) {
  logger.info('Processing', item); // Can create millions of logs!
}

// ✅ Instead, log summary
logger.info('Processing', 'Batch completed', {
  totalItems: items.length,
  successCount: success,
  errorCount: errors,
});
```

## Performance Tips

1. **Use appropriate log levels**
   - ERROR: Actual errors that need attention
   - WARN: Unusual situations that may need investigation
   - INFO: Important business events
   - DEBUG: Detailed debugging (development only)

2. **Sanitize data before logging**
   ```typescript
   const sanitizedBody = {
     ...body,
     password: '[REDACTED]',
     token: '[REDACTED]',
   };
   logger.info('Context', 'Message', sanitizedBody);
   ```

3. **Use structured logging**
   ```typescript
   // ✅ Good - structured
   logger.info('Context', 'Message', {
     userId: id,
     action: 'submit',
   });

   // ❌ Bad - unstructured
   logger.info('Context', `User ${id} performed submit`);
   ```

4. **Log at boundaries**
   - Log at API entry/exit points
   - Log before/after external calls
   - Log state transitions
   - Log errors at catch blocks

5. **Aggregate and summarize**
   ```typescript
   // Instead of logging each iteration
   const results = items.map(process);
   
   logger.info('Batch:Process', 'Completed', {
     total: items.length,
     success: results.filter(r => r.success).length,
     failed: results.filter(r => !r.success).length,
   });
   ```
