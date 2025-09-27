#!/bin/bash

# Fix Duplicate Imports Script
# Memperbaiki duplicate imports di semua file

echo "🔧 FIXING DUPLICATE IMPORTS"
echo "=========================="

SRC_DIR="/media/asmorodwi/DATA/apaaja/penting/simlok2/src"

# List of files with duplicate imports based on build errors
FILES=(
  "$SRC_DIR/components/reviewer/ReviewerScanHistoryContent.tsx"
  "$SRC_DIR/components/reviewer/ReviewerSubmissionsManagement.tsx" 
  "$SRC_DIR/components/submissions/SubmissionForm.tsx"
  "$SRC_DIR/components/vendor/EditSubmissionForm.tsx"
  "$SRC_DIR/components/user-profile/ChangePasswordCard.tsx"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "🔄 Fixing: $file"
    
    # Create backup
    cp "$file" "${file}.bak"
    
    # Fix Badge duplicates
    if grep -q "import { Button, Badge }" "$file" && grep -q "import { Alert, Badge }" "$file"; then
      # Remove the second Badge import line and combine
      sed -i '/import { Alert, Badge }/d' "$file"
      sed -i 's/import { Button, Badge } from/import { Button, Badge, Alert } from/' "$file"
      echo "  ✅ Fixed Badge duplicates"
    fi
    
    # Fix Label duplicates
    if grep -q "import { Card, Label }" "$file" && grep -q "import { Button, Label }" "$file"; then
      # Combine all imports
      sed -i '/import { Button, Label }/d' "$file"
      sed -i '/import { Input, Label }/d' "$file"
      sed -i 's/import { Card, Label } from/import { Card, Label, Button, Input } from/' "$file"
      echo "  ✅ Fixed Label duplicates"
    fi
    
    # Fix the specific ChangePasswordCard issue
    if [[ "$file" == *"ChangePasswordCard.tsx" ]]; then
      # Fix the malformed first line
      sed -i '1s/"usimport.*lient";/"use client";/' "$file"
      # Remove duplicate Modal import
      sed -i '/import { Modal } from "@\/components\/ui\/modal";/d' "$file"
      sed -i '/import { Button, Label } from/d' "$file"
      echo "  ✅ Fixed ChangePasswordCard specific issues"
    fi
    
    # Check if changes were made
    if ! cmp -s "$file" "${file}.bak"; then
      echo "  ✅ Updated: $file"
    else
      echo "  ⏭️  No changes needed: $file"
      rm "${file}.bak"
    fi
  else
    echo "  ❌ File not found: $file"
  fi
done

echo ""
echo "✅ DUPLICATE IMPORTS FIXED!"
echo "🧪 Run npm run build to test"