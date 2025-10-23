#!/bin/bash

echo "🧪 End-to-End Test: Signup → Session → Verification-Pending"
echo "============================================================="
echo ""

# Test user
EMAIL="e2e_test_$(date +%s)@example.com"
PASSWORD="Test1234"
VENDOR="E2E Test Vendor $(date +%s)"

echo "📝 Creating test user..."
echo "   Email: $EMAIL"
echo "   Password: $PASSWORD"
echo ""

# Step 1: Signup
echo "1️⃣ Signup..."
SIGNUP=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"officer_name\": \"E2E Test\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"vendor_name\": \"$VENDOR\",
    \"address\": \"Test Address\",
    \"phone_number\": \"081234567890\",
    \"turnstile_token\": \"test\"
  }")

SESSION_CREATED=$(echo "$SIGNUP" | grep -o '"sessionCreated":[^,}]*' | grep -o 'true\|false')

if [ "$SESSION_CREATED" == "true" ]; then
  echo "   ✅ Signup successful, session created"
else
  echo "   ❌ Signup failed or session not created"
  echo "$SIGNUP"
  exit 1
fi

echo ""

# Step 2: Check if cookie was set
echo "2️⃣ Checking cookies..."
if grep -q "next-auth.session-token" cookies.txt; then
  echo "   ✅ Session cookie found in cookie jar"
  COOKIE_VALUE=$(grep "next-auth.session-token" cookies.txt | awk '{print $7}')
  echo "   Cookie preview: ${COOKIE_VALUE:0:50}..."
else
  echo "   ❌ Session cookie NOT found"
  cat cookies.txt
  exit 1
fi

echo ""

# Step 3: Try to access verification-pending with cookie
echo "3️⃣ Accessing /verification-pending with cookie..."
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt http://localhost:3000/verification-pending)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "200" ]; then
  echo "   ✅ Access granted (HTTP $HTTP_CODE)"
  
  # Check if redirected to login
  if echo "$BODY" | grep -qi "login"; then
    echo "   ❌ FAIL: Redirected to login page"
    echo "   This means session was NOT recognized!"
  elif echo "$BODY" | grep -qi "verifikasi\|verification"; then
    echo "   ✅ SUCCESS: Verification-pending page loaded!"
    echo "   Session is working correctly!"
  else
    echo "   ⚠️  Page loaded but content unclear"
  fi
else
  echo "   ❌ Access denied (HTTP $HTTP_CODE)"
  if [ "$HTTP_CODE" == "307" ] || [ "$HTTP_CODE" == "302" ]; then
    echo "   Redirect detected - probably to /login"
    echo "   This means session was NOT recognized!"
  fi
fi

echo ""

# Cleanup
rm -f cookies.txt

echo "============================================================="
echo "Test complete!"
echo ""
echo "Manual verification steps:"
echo "1. Open browser: http://localhost:3000/signup"
echo "2. Register with: $EMAIL / $PASSWORD"
echo "3. Should redirect to /verification-pending automatically"
echo "4. Check browser DevTools → Application → Cookies"
echo "5. Should see 'next-auth.session-token' cookie"
echo ""
