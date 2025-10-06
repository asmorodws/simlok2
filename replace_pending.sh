#!/bin/bash

# Script to replace PENDING with PENDING_APPROVAL in approval_status contexts

echo "Replacing 'PENDING' with 'PENDING_APPROVAL' in approval_status contexts..."

# Replace in TypeScript files
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.ts" -exec sed -i "s/approval_status === 'PENDING'/approval_status === 'PENDING_APPROVAL'/g" {} +
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.ts" -exec sed -i "s/approval_status !== 'PENDING'/approval_status !== 'PENDING_APPROVAL'/g" {} +
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.ts" -exec sed -i "s/approval_status: 'PENDING'/approval_status: 'PENDING_APPROVAL'/g" {} +

# Replace in TSX files  
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.tsx" -exec sed -i "s/approval_status === 'PENDING'/approval_status === 'PENDING_APPROVAL'/g" {} +
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.tsx" -exec sed -i "s/approval_status !== 'PENDING'/approval_status !== 'PENDING_APPROVAL'/g" {} +
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.tsx" -exec sed -i "s/approval_status: 'PENDING'/approval_status: 'PENDING_APPROVAL'/g" {} +

# Also fix the type definitions
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.ts" -exec sed -i "s/'PENDING' | 'APPROVED' | 'REJECTED'/'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'/g" {} +
find /media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src -name "*.tsx" -exec sed -i "s/'PENDING' | 'APPROVED' | 'REJECTED'/'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'/g" {} +

echo "Replacement complete!"