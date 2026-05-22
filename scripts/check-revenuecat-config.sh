#!/bin/bash

# Check RevenueCat Production Configuration
# This script verifies that RevenueCat API keys are configured for production

echo "🔍 Checking RevenueCat Production Configuration..."
echo "================================================"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# 2. Check iOS API key
IOS_KEY=$(grep "^REVENUECAT_API_KEY_IOS=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$IOS_KEY" ] || [ "$IOS_KEY" = "" ]; then
    echo -e "${RED}❌ REVENUECAT_API_KEY_IOS not found in .env${NC}"
    ERRORS=$((ERRORS + 1))
else
    # Check if it's a production key (starts with appl_)
    if [[ "$IOS_KEY" == appl_* ]]; then
        echo -e "${GREEN}✅ REVENUECAT_API_KEY_IOS found and appears to be production key (starts with appl_)${NC}"
    else
        echo -e "${YELLOW}⚠️  REVENUECAT_API_KEY_IOS found but doesn't start with 'appl_' - verify it's a production key${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    # Show first few characters for verification (not full key)
    KEY_PREFIX="${IOS_KEY:0:10}..."
    echo "   Key prefix: $KEY_PREFIX"
fi

# 3. Check Android API key (optional, might not be set)
ANDROID_KEY=$(grep "^REVENUECAT_API_KEY_ANDROID=" .env 2>/dev/null | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$ANDROID_KEY" ] || [ "$ANDROID_KEY" = "" ]; then
    echo -e "${YELLOW}⚠️  REVENUECAT_API_KEY_ANDROID not found in .env (optional if iOS only)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    # Check if it's a production key (starts with goog_)
    if [[ "$ANDROID_KEY" == goog_* ]]; then
        echo -e "${GREEN}✅ REVENUECAT_API_KEY_ANDROID found and appears to be production key (starts with goog_)${NC}"
    else
        echo -e "${YELLOW}⚠️  REVENUECAT_API_KEY_ANDROID found but doesn't start with 'goog_' - verify it's a production key${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    # Show first few characters for verification (not full key)
    KEY_PREFIX="${ANDROID_KEY:0:10}..."
    echo "   Key prefix: $KEY_PREFIX"
fi

# 4. Check app.config.js references
if grep -q "REVENUECAT_API_KEY_IOS" app.config.js; then
    echo -e "${GREEN}✅ app.config.js references REVENUECAT_API_KEY_IOS${NC}"
else
    echo -e "${RED}❌ app.config.js missing REVENUECAT_API_KEY_IOS reference${NC}"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "REVENUECAT_API_KEY_ANDROID" app.config.js; then
    echo -e "${GREEN}✅ app.config.js references REVENUECAT_API_KEY_ANDROID${NC}"
else
    echo -e "${YELLOW}⚠️  app.config.js missing REVENUECAT_API_KEY_ANDROID reference (optional)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 5. Check for hardcoded test keys
if grep -r "appl_test\|goog_test" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | grep -v ".git" | grep -v "node_modules" > /dev/null; then
    echo -e "${RED}❌ Found test API keys in code files${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ No hardcoded test API keys found${NC}"
fi

# 6. Check for placeholder keys
if grep -r "your_ios_api_key\|your_android_api_key\|your_.*_api_key" --include="*.js" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null | grep -v ".git" | grep -v "node_modules" > /dev/null; then
    echo -e "${YELLOW}⚠️  Found placeholder API keys in code (check utils/revenueCat.js)${NC}"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ No placeholder API keys found${NC}"
fi

echo ""
echo "================================================"
echo "Summary:"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}Errors: $ERRORS${NC}"
else
    echo -e "${RED}Errors: $ERRORS${NC}"
fi
if [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}Warnings: $WARNINGS${NC}"
else
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ RevenueCat configuration looks good for production${NC}"
    exit 0
else
    echo -e "${RED}❌ RevenueCat configuration has errors - fix before building${NC}"
    exit 1
fi

