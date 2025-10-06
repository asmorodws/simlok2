#!/bin/bash

# Script to replace all occurrences of final_status with approval_status

echo "Replacing final_status with approval_status in API and component files..."

# Replace in API files
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src/app/api -name "*.ts" -exec sed -i 's/final_status/approval_status/g' {} +

# Replace in component files
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src/components -name "*.tsx" -exec sed -i 's/final_status/approval_status/g' {} +

# Replace in other TypeScript files
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.ts" -not -path "*/node_modules/*" -exec sed -i 's/final_status/approval_status/g' {} +
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i 's/final_status/approval_status/g' {} +

echo "Replacement complete!"