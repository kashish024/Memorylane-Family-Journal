#!/bin/bash

# Email Production Configuration Check
# This script checks if email configuration is ready for production

echo "📧 Checking Email Production Configuration..."
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: RESEND_API_KEY
echo "1. Checking RESEND_API_KEY configuration..."
if command -v eas &> /dev/null && eas whoami &> /dev/null; then
    RESEND_ENV_CHECK=$(eas env:list --environment production 2>/dev/null | grep "RESEND_API_KEY" || true)
    if [ -n "$RESEND_ENV_CHECK" ]; then
        echo -e "${GREEN}✅ RESEND_API_KEY configured in EAS production environment${NC}"
    else
        echo -e "${RED}❌ RESEND_API_KEY not found in EAS production environment${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  Could not verify EAS environment (not logged in or eas missing)${NC}"
    ((WARNINGS++))
fi

if [ -f ".env" ] && grep -q "RESEND_API_KEY" .env 2>/dev/null; then
    echo -e "${GREEN}✅ RESEND_API_KEY found in .env file${NC}"
else
    echo -e "${YELLOW}⚠️  RESEND_API_KEY not found in .env (may be using EAS secrets)${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 2: Monthly Summary Email "from" address
echo "2. Checking Monthly Summary email configuration..."
MONTHLY_FROM=$(grep -o "from: '[^']*'" utils/emailService.js 2>/dev/null | head -1)
if echo "$MONTHLY_FROM" | grep -q "onboarding@resend.dev"; then
    echo -e "${RED}❌ Using test email domain: onboarding@resend.dev${NC}"
    echo -e "${RED}   This has production limitations (100 email limit)${NC}"
    echo -e "${YELLOW}   Action: Update to verified custom domain${NC}"
    ((ERRORS++))
elif echo "$MONTHLY_FROM" | grep -q "@"; then
    DOMAIN=$(echo "$MONTHLY_FROM" | grep -o "@[^>]*" | tr -d '@>' | tr -d "'")
    echo -e "${GREEN}✅ Monthly email from: $MONTHLY_FROM${NC}"
    echo -e "${YELLOW}⚠️  Verify domain '$DOMAIN' is verified in Resend dashboard${NC}"
    ((WARNINGS++))
else
    echo -e "${YELLOW}⚠️  Could not parse monthly email 'from' address${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 3: Invitation Email "from" address
echo "3. Checking Invitation email configuration..."
INVITE_FROM=$(grep -o "from: '[^']*'" utils/invitations.js 2>/dev/null | head -1)
if echo "$INVITE_FROM" | grep -q "mymemorlylane.com"; then
    echo -e "${YELLOW}⚠️  Using: $INVITE_FROM${NC}"
    echo -e "${YELLOW}   Verify domain 'mymemorlylane.com' is verified in Resend${NC}"
    ((WARNINGS++))
elif echo "$INVITE_FROM" | grep -q "@"; then
    DOMAIN=$(echo "$INVITE_FROM" | grep -o "@[^>]*" | tr -d '@>' | tr -d "'")
    echo -e "${GREEN}✅ Invitation email from: $INVITE_FROM${NC}"
    echo -e "${YELLOW}⚠️  Verify domain '$DOMAIN' is verified in Resend dashboard${NC}"
    ((WARNINGS++))
else
    echo -e "${YELLOW}⚠️  Could not parse invitation email 'from' address${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 4: No hardcoded API keys
echo "4. Checking for hardcoded API keys..."
if grep -r "re_[A-Za-z0-9]\{20,\}" utils/emailService.js utils/invitations.js 2>/dev/null | grep -v "process.env\|Constants.expoConfig" | grep -q "re_"; then
    echo -e "${RED}❌ Found hardcoded Resend API key${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ No hardcoded API keys found${NC}"
fi
echo ""

# Summary
echo "=============================================="
echo "Summary:"
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Email configuration is production-ready!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Email configuration needs attention before production${NC}"
    echo ""
    echo "Action Items:"
    echo "1. Verify email domains in Resend dashboard"
    echo "2. Update 'from' addresses if using test domain"
    echo "3. Test email sending"
    exit 0
else
    echo -e "${RED}❌ Email configuration has errors - will not work in production${NC}"
    echo ""
    echo "Critical Issues:"
    echo "1. Update test email domain to verified domain"
    echo "2. Verify domain in Resend dashboard"
    exit 1
fi

