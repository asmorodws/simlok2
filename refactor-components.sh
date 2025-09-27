#!/bin/bash

# Comprehensive Component Import Refactoring Script
# Merombak semua import untuk menggunakan sistem komponen UI yang konsisten

echo "🚀 MEMULAI REFACTOR KOMPONEN - KONSISTENSI UI SYSTEM"
echo "=================================================="

# Target directory
SRC_DIR="/media/asmorodwi/DATA/apaaja/penting/simlok2/src"

echo "📂 Mencari file TypeScript/React untuk refactoring..."

# Find all TSX and TS files excluding node_modules and atomic design components themselves
find "$SRC_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/components/ui/atoms/*" \
  -not -path "*/components/ui/molecules/*" \
  -not -path "*/components/ui/organisms/*" \
  -not -path "*/components/ui/index.ts" | while read file; do

  echo "🔄 Processing: $file"
  
  # Create backup
  cp "$file" "${file}.bak"
  
  # Flag to track if file was modified
  modified=false
  
  # Refactor Badge imports
  if grep -q "from ['\"]@/components/ui/Badge['\"]" "$file" || 
     grep -q "from ['\"]../ui/Badge['\"]" "$file" || 
     grep -q "from ['\"]./ui/Badge['\"]" "$file"; then
    
    # Remove individual Badge import lines
    sed -i '/import.*Badge.*from.*@\/components\/ui\/Badge/d' "$file"
    sed -i '/import.*Badge.*from.*\.\.\/ui\/Badge/d' "$file"
    sed -i '/import.*Badge.*from.*\.\/ui\/Badge/d' "$file"
    
    # Add Badge to existing ui import or create new one
    if grep -q "from ['\"]@/components/ui['\"]" "$file"; then
      # Add Badge to existing import
      sed -i 's/import { \([^}]*\) } from ['\''"]@\/components\/ui['\''"];/import { \1, Badge } from '\''@\/components\/ui'\'';/' "$file"
    else
      # Add new import at the top after other imports
      sed -i '1i\import { Badge } from '\''@/components/ui'\'';' "$file"
    fi
    modified=true
  fi
  
  # Refactor Label imports  
  if grep -q "from ['\"]@/components/form/Label['\"]" "$file" || 
     grep -q "from ['\"]../form/Label['\"]" "$file"; then
    
    # Remove individual Label import lines
    sed -i '/import.*Label.*from.*@\/components\/form\/Label/d' "$file"
    sed -i '/import.*Label.*from.*\.\.\/form\/Label/d' "$file"
    
    # Add Label to existing ui import or create new one
    if grep -q "from ['\"]@/components/ui['\"]" "$file"; then
      # Add Label to existing import 
      sed -i 's/import { \([^}]*\) } from ['\''"]@\/components\/ui['\''"];/import { \1, Label } from '\''@\/components\/ui'\'';/' "$file"
    else
      # Add new import
      sed -i '1i\import { Label } from '\''@/components/ui'\'';' "$file"
    fi
    modified=true
  fi
  
  # Refactor Button imports from individual paths
  if grep -q "from ['\"]@/components/ui/button" "$file" || 
     grep -q "from ['\"]../ui/button" "$file"; then
    
    # Remove individual Button import lines
    sed -i '/import.*Button.*from.*@\/components\/ui\/button/d' "$file"
    sed -i '/import.*Button.*from.*\.\.\/ui\/button/d' "$file"
    
    # Add Button to existing ui import or create new one
    if grep -q "from ['\"]@/components/ui['\"]" "$file"; then
      # Add Button to existing import if not already there
      if ! grep -q "Button" "$file" | grep -q "@/components/ui"; then
        sed -i 's/import { \([^}]*\) } from ['\''"]@\/components\/ui['\''"];/import { \1, Button } from '\''@\/components\/ui'\'';/' "$file"
      fi
    else
      # Add new import
      sed -i '1i\import { Button } from '\''@/components/ui'\'';' "$file"
    fi
    modified=true
  fi
  
  # Refactor Card imports from individual paths
  if grep -q "from ['\"]@/components/ui/Card['\"]" "$file" || 
     grep -q "from ['\"]../ui/Card['\"]" "$file"; then
    
    # Remove individual Card import lines
    sed -i '/import.*Card.*from.*@\/components\/ui\/Card/d' "$file"
    sed -i '/import.*Card.*from.*\.\.\/ui\/Card/d' "$file"
    
    # Add Card to existing ui import or create new one
    if grep -q "from ['\"]@/components/ui['\"]" "$file"; then
      # Add Card to existing import if not already there
      if ! grep -q "Card" "$file" | grep -q "@/components/ui"; then
        sed -i 's/import { \([^}]*\) } from ['\''"]@\/components\/ui['\''"];/import { \1, Card } from '\''@\/components\/ui'\'';/' "$file"
      fi
    else
      # Add new import
      sed -i '1i\import { Card } from '\''@/components/ui'\'';' "$file"
    fi
    modified=true
  fi
  
  # Refactor Alert imports from individual paths
  if grep -q "from ['\"]@/components/ui/alert" "$file" || 
     grep -q "from ['\"]../ui/alert" "$file"; then
    
    # Remove individual Alert import lines
    sed -i '/import.*Alert.*from.*@\/components\/ui\/alert/d' "$file"
    sed -i '/import.*Alert.*from.*\.\.\/ui\/alert/d' "$file"
    
    # Add Alert to existing ui import or create new one
    if grep -q "from ['\"]@/components/ui['\"]" "$file"; then
      # Add Alert to existing import if not already there
      if ! grep -q "Alert" "$file" | grep -q "@/components/ui"; then
        sed -i 's/import { \([^}]*\) } from ['\''"]@\/components\/ui['\''"];/import { \1, Alert } from '\''@\/components\/ui'\'';/' "$file"
      fi
    else
      # Add new import
      sed -i '1i\import { Alert } from '\''@/components/ui'\'';' "$file"
    fi
    modified=true
  fi
  
  # Check if file was actually modified
  if ! cmp -s "$file" "${file}.bak"; then
    echo "✅ Updated: $file"
  else
    echo "⏭️  No changes needed: $file"
    rm "${file}.bak"
  fi
done

echo ""
echo "🔍 Mengecek hasil refactoring..."

# Check for remaining problematic imports
echo ""
echo "📊 Remaining individual Badge imports:"
grep -r "import.*Badge.*from.*@/components/ui/Badge\|import.*Badge.*from.*\.\./ui/Badge" "$SRC_DIR" 2>/dev/null || echo "✅ None found"

echo ""  
echo "📊 Remaining individual Label imports:"
grep -r "import.*Label.*from.*@/components/form/Label\|import.*Label.*from.*\.\./form/Label" "$SRC_DIR" 2>/dev/null || echo "✅ None found"

echo ""
echo "📊 Remaining individual Button imports:"
grep -r "import.*Button.*from.*@/components/ui/button\|import.*Button.*from.*\.\./ui/button" "$SRC_DIR" 2>/dev/null || echo "✅ None found"

echo ""
echo "📊 Current centralized UI imports:"
grep -r "from ['\"]@/components/ui['\"]" "$SRC_DIR" 2>/dev/null | head -10

echo ""
echo "✅ REFACTOR KOMPONEN SELESAI!"
echo "💡 Semua komponen sekarang menggunakan import terpusat dari @/components/ui"
echo "🧪 Silakan test functionality setelah refactoring"