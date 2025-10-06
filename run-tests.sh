#!/bin/bash

# Script untuk menjalankan tests dengan output yang bersih

echo "🧪 Running Input Component Tests..."
echo "=================================="

# Run Input component tests
npm test -- --testPathPattern=Input.test.tsx --verbose

echo ""
echo "🧪 Running UserInfoCard Component Tests..."
echo "=========================================="

# Run UserInfoCard tests  
npm test -- --testPathPattern=UserInfoCard.test.tsx --verbose

echo ""
echo "✅ Testing completed!"
echo ""

# Jika ingin coverage report
read -p "Generate coverage report? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📊 Generating coverage report..."
    npm run test:coverage
fi