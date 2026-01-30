#!/bin/bash
# Clear cached optimized images on VPS

echo "🗑️  Clearing image cache..."
cd /root/simlok2

# Find and delete all cached optimized images
DELETED=$(find public/uploads -name "*.optimized.jpg" -type f | wc -l)
find public/uploads -name "*.optimized.jpg" -type f -delete

echo "✅ Deleted $DELETED cached images"
echo "📊 Remaining optimized images: $(find public/uploads -name '*.optimized.jpg' | wc -l)"
echo ""
echo "✨ Cache cleared! Next PDF generation will use new compression settings."
