#!/bin/bash

# Fix Final Variant Issues Script
# Menyelesaikan konflik variant antara Button, Badge, Alert, dan Icon

echo "🔧 FINAL VARIANT FIXES"
echo "====================="

# Array of files that still have Button variant="error" 
FILES_BUTTON=(
  "src/components/admin/SubmissionsManagement.tsx"
  "src/components/admin/UserVerificationModal.tsx"
  "src/components/admin/UsersTable.tsx" 
  "src/components/dashboard/VendorDashboard.tsx"
  "src/components/reviewer/ReviewerUserVerificationModal.tsx"
  "src/components/reviewer/UserVerificationManagement.tsx"
  "src/components/vendor/VendorSubmissionsContent.tsx"
)

SRC_DIR="/media/asmorodwi/DATA/apaaja/penting/simlok2"

for file in "${FILES_BUTTON[@]}"; do
  if [[ -f "$SRC_DIR/$file" ]]; then
    echo "🔄 Fixing Button variants in: $file"
    
    # Fix only Button components, leave Badge/Alert/Icon as "error"
    # Use more specific pattern to only match Button tags
    sed -i 's/<Button\([^>]*\) variant="error"/<Button\1 variant="destructive"/g' "$SRC_DIR/$file"
    
    # Also handle cases without space before variant
    sed -i 's/<Button variant="error"/<Button variant="destructive"/g' "$SRC_DIR/$file"
    
    echo "  ✅ Fixed: $file"
  else
    echo "  ❌ File not found: $file"
  fi
done

echo ""
echo "✅ FINAL VARIANT FIXES COMPLETE!"
echo "📊 Summary:"
echo "  - Button: variant='destructive'" 
echo "  - Badge: variant='error'"
echo "  - Alert: variant='error'"
echo "  - Icon: variant='error'"
echo ""
echo "🧪 Run 'npx tsc --noEmit --skipLibCheck' to verify"