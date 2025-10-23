#!/bin/bash

# Test Script: Auto-Session pada Signup & Akses Verification-Pending
# Usage: bash test-signup-session.sh

echo "🧪 Testing Signup Auto-Session Flow"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000"
TEST_EMAIL="testuser_$(date +%s)@example.com"
TEST_PASSWORD="Test1234"
TEST_VENDOR="Test Vendor $(date +%s)"

echo -e "${YELLOW}📋 Test Configuration:${NC}"
echo "  API URL: $API_URL"
echo "  Test Email: $TEST_EMAIL"
echo "  Test Password: $TEST_PASSWORD"
echo "  Test Vendor: $TEST_VENDOR"
echo ""

# Test 1: Signup with Auto-Session
echo -e "${YELLOW}Test 1: Register New User${NC}"
echo "  POST /api/auth/signup"

SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d "{
    \"officer_name\": \"Test Officer\",
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"vendor_name\": \"$TEST_VENDOR\",
    \"address\": \"Test Address 123, Test City\",
    \"phone_number\": \"081234567890\",
    \"turnstile_token\": \"test_token\"
  }")

HTTP_CODE=$(echo "$SIGNUP_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SIGNUP_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" == "201" ]; then
  echo -e "  ${GREEN}✅ Registration Success (HTTP $HTTP_CODE)${NC}"
  
  # Check if sessionCreated
  SESSION_CREATED=$(echo "$RESPONSE_BODY" | grep -o '"sessionCreated":[^,}]*' | grep -o 'true\|false')
  if [ "$SESSION_CREATED" == "true" ]; then
    echo -e "  ${GREEN}✅ Session Created Automatically${NC}"
  else
    echo -e "  ${RED}❌ Session NOT Created${NC}"
  fi
  
  # Check redirect URL
  REDIRECT_TO=$(echo "$RESPONSE_BODY" | grep -o '"redirectTo":"[^"]*"' | cut -d'"' -f4)
  echo "  📍 Redirect To: $REDIRECT_TO"
  
  # Check cookies
  if [ -f cookies.txt ]; then
    SESSION_COOKIE=$(grep -i "next-auth.session-token" cookies.txt | wc -l)
    if [ "$SESSION_COOKIE" -gt 0 ]; then
      echo -e "  ${GREEN}✅ Session Cookie Set${NC}"
    else
      echo -e "  ${RED}❌ Session Cookie NOT Set${NC}"
    fi
  fi
else
  echo -e "  ${RED}❌ Registration Failed (HTTP $HTTP_CODE)${NC}"
  echo "  Response: $RESPONSE_BODY"
  exit 1
fi

echo ""

# Test 2: Access Verification-Pending with Session
echo -e "${YELLOW}Test 2: Access /verification-pending with Session${NC}"
echo "  GET /verification-pending"

VP_RESPONSE=$(curl -s -w "\n%{http_code}" -L "$API_URL/verification-pending" \
  -b cookies.txt)

VP_HTTP_CODE=$(echo "$VP_RESPONSE" | tail -n1)

if [ "$VP_HTTP_CODE" == "200" ]; then
  echo -e "  ${GREEN}✅ Access Granted (HTTP $VP_HTTP_CODE)${NC}"
  
  # Check if page contains verification pending content
  if echo "$VP_RESPONSE" | grep -q "verifikasi\|verification"; then
    echo -e "  ${GREEN}✅ Verification Pending Page Loaded${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Page loaded but content unclear${NC}"
  fi
else
  echo -e "  ${RED}❌ Access Denied (HTTP $VP_HTTP_CODE)${NC}"
  
  # Check if redirected to login
  if echo "$VP_RESPONSE" | grep -q "login"; then
    echo -e "  ${RED}❌ Redirected to Login (Session Invalid)${NC}"
  fi
fi

echo ""

# Test 3: Access Protected Route without Verification
echo -e "${YELLOW}Test 3: Access /vendor (should redirect to verification-pending)${NC}"
echo "  GET /vendor"

VENDOR_RESPONSE=$(curl -s -w "\n%{http_code}" -L "$API_URL/vendor" \
  -b cookies.txt)

VENDOR_HTTP_CODE=$(echo "$VENDOR_RESPONSE" | tail -n1)

if [ "$VENDOR_HTTP_CODE" == "200" ]; then
  if echo "$VENDOR_RESPONSE" | grep -q "verifikasi\|verification"; then
    echo -e "  ${GREEN}✅ Correctly Redirected to Verification-Pending${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Accessed /vendor (user might be verified?)${NC}"
  fi
else
  echo -e "  ${RED}❌ Unexpected Response (HTTP $VENDOR_HTTP_CODE)${NC}"
fi

echo ""

# Test 4: Validate Session in Database
echo -e "${YELLOW}Test 4: Check Session Status via API${NC}"
echo "  GET /api/session/status"

STATUS_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/session/status" \
  -b cookies.txt)

STATUS_HTTP_CODE=$(echo "$STATUS_RESPONSE" | tail -n1)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | head -n-1)

if [ "$STATUS_HTTP_CODE" == "200" ]; then
  echo -e "  ${GREEN}✅ Session Valid (HTTP $STATUS_HTTP_CODE)${NC}"
  
  # Parse response
  AUTHENTICATED=$(echo "$STATUS_BODY" | grep -o '"authenticated":[^,}]*' | grep -o 'true\|false')
  VALID=$(echo "$STATUS_BODY" | grep -o '"valid":[^,}]*' | grep -o 'true\|false')
  
  if [ "$AUTHENTICATED" == "true" ] && [ "$VALID" == "true" ]; then
    echo -e "  ${GREEN}✅ Session Authenticated & Valid in Database${NC}"
  else
    echo -e "  ${RED}❌ Session Invalid${NC}"
  fi
else
  echo -e "  ${RED}❌ Session Check Failed (HTTP $STATUS_HTTP_CODE)${NC}"
fi

echo ""

# Cleanup
rm -f cookies.txt

# Summary
echo "===================================="
echo -e "${YELLOW}📊 Test Summary${NC}"
echo "===================================="
echo ""
echo "Test completed! Check results above."
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Login to the app manually to verify"
echo "2. Check database for session record:"
echo "   SELECT * FROM Session WHERE userId = (SELECT id FROM User WHERE email = '$TEST_EMAIL');"
echo "3. Check if user can access /verification-pending page"
echo "4. Verify user with admin account and test redirect to /vendor"
echo ""
