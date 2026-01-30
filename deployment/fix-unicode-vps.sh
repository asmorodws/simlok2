#!/bin/bash

# Fix Unicode encoding error in PDF generation on VPS
# This script will:
# 1. Stop the service
# 2. Reset local changes (if any)
# 3. Pull latest code with Unicode sanitization fix
# 4. Rebuild the application
# 5. Start the service

set -e  # Exit on error

echo "🔧 Fixing Unicode encoding error on VPS..."
echo ""

cd /root/simlok2

# Stop service
echo "⏸️  Stopping simlok service..."
systemctl stop simlok.service

# Stash any local changes
echo "💾 Stashing local changes..."
git stash || true

# Reset to remote state
echo "🔄 Resetting to remote main branch..."
git reset --hard origin/main

# Pull latest changes
echo "⬇️  Pulling latest code (commit 2ae2c0f - Unicode fix)..."
git pull origin main

# Remove old build
echo "🗑️  Removing old build..."
rm -rf .next

# Rebuild
echo "🏗️  Building application..."
npm run build

# Start service
echo "▶️  Starting simlok service..."
systemctl start simlok.service

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service status:"
systemctl status simlok.service --no-pager -l

echo ""
echo "📝 To monitor logs in real-time:"
echo "   journalctl -u simlok.service -f"
