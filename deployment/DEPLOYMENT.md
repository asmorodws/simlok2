# SIMLOK Deployment Guide

## Prerequisites

1. Node.js 18+ installed
2. Git installed
3. PM2 or systemd for process management

## Deployment Steps

### 1. Clone/Update Repository on Server

```bash
# Navigate to project directory
cd /root/simlok2

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build
```

### 2. Environment Setup

Create `.env.production` file in project root:

```bash
nano /root/simlok2/.env.production
```

Add required environment variables (refer to `.env.example`)

### 3. Setup Systemd Service (Option A - Recommended)

```bash
# Create log directory
mkdir -p /var/log/simlok

# Copy service file
cp /root/simlok2/deployment/simlok.service /etc/systemd/system/

# Make start script executable
chmod +x /root/simlok2/deployment/start.sh

# Reload systemd
systemctl daemon-reload

# Enable service to start on boot
systemctl enable simlok.service

# Start the service
systemctl start simlok.service

# Check status
systemctl status simlok.service

# View logs
tail -f /var/log/simlok/app.log
tail -f /var/log/simlok/error.log
```

### 4. Setup with PM2 (Option B - Alternative)

```bash
# Install PM2 globally if not installed
npm install -g pm2

# Start application with PM2
pm2 start npm --name "simlok" -- start

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd

# View logs
pm2 logs simlok
```

## Troubleshooting

### Service fails to start

1. Check if start script exists:
   ```bash
   ls -la /root/simlok2/deployment/start.sh
   ```

2. Check if script is executable:
   ```bash
   chmod +x /root/simlok2/deployment/start.sh
   ```

3. Check if .next directory exists:
   ```bash
   ls -la /root/simlok2/.next
   ```
   If not, run `npm run build`

4. Check systemd logs:
   ```bash
   journalctl -u simlok.service -n 50 --no-pager
   ```

5. Test script manually:
   ```bash
   cd /root/simlok2
   ./deployment/start.sh
   ```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change PORT in service file
```

### Permission issues

```bash
# Fix ownership
chown -R root:root /root/simlok2

# Fix permissions
chmod -R 755 /root/simlok2
```

## Updating Application

```bash
# Stop the service
systemctl stop simlok.service

# Pull latest changes
cd /root/simlok2
git pull origin main

# Install dependencies
npm install

# Rebuild application
npm run build

# Start the service
systemctl start simlok.service

# Check status
systemctl status simlok.service
```

## Quick Commands

```bash
# Start service
systemctl start simlok.service

# Stop service
systemctl stop simlok.service

# Restart service
systemctl restart simlok.service

# View status
systemctl status simlok.service

# View live logs
journalctl -u simlok.service -f

# View last 100 log lines
journalctl -u simlok.service -n 100 --no-pager
```

## Applying PDF Compression Fix

After deploying the latest code with PDF compression fixes:

```bash
# The fix is already in the code, just need to restart
systemctl restart simlok.service

# Or clear cache manually if needed
cd /root/simlok2
npx ts-node scripts/clear-pdf-cache.ts
systemctl restart simlok.service
```

## Monitoring

### Check application health
```bash
curl http://localhost:3000/api/health
```

### Monitor resource usage
```bash
# CPU and Memory
top -p $(pgrep -f "node.*simlok")

# Disk space
df -h
```

### Check logs in real-time
```bash
# Application logs
tail -f /var/log/simlok/app.log

# Error logs
tail -f /var/log/simlok/error.log

# Systemd logs
journalctl -u simlok.service -f
```
