#!/bin/bash
# Force Fix PDF Compression Issue
# This will do a complete clean rebuild

set -e

echo "========================================="
echo "FORCE FIX - PDF Compression Error"
echo "========================================="
echo ""

cd /root/simlok2

echo "1️⃣ Stopping service..."
systemctl stop simlok.service
sleep 2

echo "2️⃣ Cleaning all caches and builds..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf public/downloads/simlok-pdfs/*

echo "3️⃣ Reinstalling Sharp (image processing library)..."
npm uninstall sharp
npm install sharp --force

echo "4️⃣ Full rebuild..."
npm run build

echo "5️⃣ Starting service..."
systemctl start simlok.service
sleep 3

echo "6️⃣ Service status:"
systemctl status simlok.service --no-pager || true
echo ""

echo "========================================="
echo "✅ DONE!"
echo "========================================="
echo ""
echo "Monitor logs with:"
echo "  journalctl -u simlok.service -f"
echo ""
echo "Try generating PDF now!"
echo ""
