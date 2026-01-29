# Production Deployment Guide - SIMLOK2

## 🚀 Pre-Deployment Checklist

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.production

# Update production values
nano .env.production
```

**Required Environment Variables:**
```env
NODE_ENV="production"
DATABASE_URL="mysql://user:pass@host:3306/simlok2"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-secure-secret-here"
REDIS_URL="redis://redis-host:6379"
NEXT_PUBLIC_SOCKET_URL="https://your-domain.com"
QR_SECURITY_SALT="generate-secure-salt-here"
```

### 2. Build Production Bundle

```bash
# Clean previous builds
npm run clean

# Install dependencies
npm ci --production=false

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build for production
npm run build

# Optional: Analyze bundle
npm run build:analyze
```

### 3. Database Migration

```bash
# Run migrations
npx prisma migrate deploy

# Verify database
npx prisma migrate status

# Optional: Seed data (production users only)
npm run seed
```

---

## 📦 Deployment Options

### Option A: Standard Node.js Server

```bash
# Start production server
NODE_ENV=production npm run start

# Or with PM2
pm2 start npm --name "simlok2" -- start
pm2 save
```

### Option B: Custom Server (with Socket.IO)

```bash
# Start custom server with Socket.IO support
npm run start:server

# Or with PM2
pm2 start server.js --name "simlok2-server"
pm2 save
```

**server.js Configuration:**
```javascript
// Ensure these are set
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';
```

### Option C: Docker Deployment

```bash
# Build Docker image
docker build -t simlok2:latest .

# Run container
docker run -d \
  --name simlok2 \
  -p 3000:3000 \
  --env-file .env.production \
  simlok2:latest
```

---

## ⚡ Performance Optimizations

### Enabled Optimizations

✅ **Next.js Optimizations:**
- React Strict Mode
- SWC Minification
- Gzip Compression
- Image Optimization (AVIF/WebP)

✅ **Code Optimizations:**
- Removed dead code
- Cleaned console.logs
- Production logger wrapper

✅ **Bundle Optimizations:**
- Code splitting
- Tree shaking
- Minification

### Recommended Server Setup

**Nginx Configuration:**
```nginx
# Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# Cache static assets
location /_next/static {
    expires 365d;
    add_header Cache-Control "public, immutable";
}

# Proxy to Next.js
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# WebSocket support for Socket.IO
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 🔒 Security Checklist

- [ ] Generate secure NEXTAUTH_SECRET
- [ ] Generate secure QR_SECURITY_SALT
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure CORS properly
- [ ] Set secure cookie flags
- [ ] Enable rate limiting
- [ ] Configure CSP headers
- [ ] Disable debug mode
- [ ] Review exposed API endpoints
- [ ] Enable Redis password auth

---

## 📊 Monitoring & Logging

### Production Logging

The app uses a production-safe logger that:
- ✅ Automatically disables debug logs in production
- ✅ Always logs errors and warnings
- ✅ Provides context-aware logging

```typescript
import { logger } from '@/lib/logger/production';

// Only logs in development
logger.log('Debug information');

// Always logs (production + development)
logger.error('Critical error', error);
```

### Log Files

Check application logs:
```bash
# View PM2 logs
pm2 logs simlok2

# View custom logs
tail -f logs/*.log

# View error logs
tail -f error-log.txt
```

### Monitoring Tools

Recommended monitoring:
- **Application**: PM2 monitoring, New Relic, Datadog
- **Database**: Prisma logging, slow query logs
- **Redis**: Redis monitoring, memory usage
- **Server**: CPU, memory, disk usage

---

## 🔄 Update & Maintenance

### Deploy New Version

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build
npm run build

# Restart
pm2 restart simlok2

# Verify
pm2 status
curl https://your-domain.com/api/server-time
```

### Rollback Strategy

```bash
# Tag current version
git tag -a v1.0.0 -m "Version 1.0.0"

# If issues occur, rollback to previous tag
git checkout v0.9.0
npm ci
npm run build
pm2 restart simlok2
```

---

## 🐛 Troubleshooting

### Build Failures

```bash
# Clear caches
npm run clean:full

# Reinstall
npm install

# Check type errors
npm run typecheck
```

### Runtime Issues

```bash
# Check logs
pm2 logs simlok2 --lines 100

# Check database connection
npx prisma db pull

# Check Redis connection
redis-cli ping
```

### Performance Issues

```bash
# Analyze bundle
npm run build:analyze

# Check memory usage
pm2 monit

# Optimize images
# Convert to WebP/AVIF format
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

For multiple instances:
1. Use Redis for session storage
2. Configure Socket.IO Redis adapter
3. Use load balancer (Nginx, HAProxy)
4. Share uploads directory (NFS, S3)

### Vertical Scaling

Recommended server specs:
- **Small**: 2 CPU, 4GB RAM (< 100 users)
- **Medium**: 4 CPU, 8GB RAM (100-500 users)
- **Large**: 8 CPU, 16GB RAM (500+ users)

---

## 🎯 Performance Targets

### Expected Performance

- **Time to First Byte (TTFB)**: < 200ms
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3.8s

### Optimization Tips

1. **Enable CDN** for static assets
2. **Optimize images** - use WebP/AVIF
3. **Enable Redis caching** for API responses
4. **Use database indexes** for common queries
5. **Enable HTTP/2** on server
6. **Monitor bundle size** regularly

---

## 📞 Support

For production issues:
- Check logs first
- Review error-log.txt
- Contact development team
- Document the issue for post-mortem

---

**Last Updated**: January 29, 2026  
**Version**: 0.1.0  
**Optimized by**: GitHub Copilot
