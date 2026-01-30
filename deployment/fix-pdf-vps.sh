#!/bin/bash
# PDF Fix Troubleshooting Script for VPS
# Run this on your VPS server to fix PDF generation issues

set -e

echo "========================================="
echo "PDF Generation Fix Script"
echo "========================================="
echo ""

# Change to project directory
cd /root/simlok2

echo "1️⃣ Checking for recent errors..."
journalctl -u simlok.service --since "5 minutes ago" | grep -E "(Error|error|failed)" -A 3 || echo "No errors found in recent logs"
echo ""

echo "2️⃣ Checking current build status..."
if [ -f .next/BUILD_ID ]; then
    echo "Build ID: $(cat .next/BUILD_ID)"
    echo "Build date: $(stat -c %y .next/BUILD_ID)"
else
    echo "No build found!"
fi
echo ""

echo "3️⃣ Checking if fix is in source code..."
if grep -q "mozjpeg: false" src/utils/pdf/imageOptimizer.ts; then
    echo "✅ Fix found in source code"
else
    echo "❌ Fix NOT in source code - need to git pull"
    exit 1
fi
echo ""

echo "4️⃣ Checking if fix is in build..."
if grep -r "mozjpeg.*false" .next/server/chunks/ > /dev/null 2>&1; then
    echo "✅ Fix found in build"
    BUILD_HAS_FIX=true
else
    echo "❌ Fix NOT in build - need to rebuild"
    BUILD_HAS_FIX=false
fi
echo ""

if [ "$BUILD_HAS_FIX" = false ]; then
    echo "5️⃣ Rebuilding application..."
    echo "Stopping service..."
    systemctl stop simlok.service
    
    echo "Removing old build..."
    rm -rf .next
    
    echo "Building with new code..."
    npm run build
    
    echo "Starting service..."
    systemctl start simlok.service
    echo ""
else
    echo "5️⃣ Restarting service to clear cache..."
    systemctl restart simlok.service
    echo ""
fi

echo "6️⃣ Checking service status..."
sleep 3
systemctl status simlok.service --no-pager || true
echo ""

echo "========================================="
echo "✅ Fix applied!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Try generating a PDF in the browser"
echo "2. Monitor logs with: journalctl -u simlok.service -f"
echo "3. Look for 'Error generating PDF' messages"
echo ""
