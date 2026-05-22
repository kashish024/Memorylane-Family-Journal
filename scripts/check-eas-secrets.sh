#!/bin/bash

# Check EAS Environment Variables/Secrets
# This script verifies that required API keys are configured in EAS environment variables

echo "🔍 Checking EAS Secrets Configuration..."
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0
MISSING_SECRETS=0
TARGET_ENVIRONMENT="${1:-production}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Required secrets based on app.config.js
REQUIRED_SECRETS=(
  "RESEND_API_KEY"
  "OPENAI_API_KEY"
  "REVENUECAT_API_KEY_IOS"
)

# Optional secrets
OPTIONAL_SECRETS=(
  "REVENUECAT_API_KEY_ANDROID"
)

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}❌ EAS CLI not found. Install it with: npm install -g eas-cli${NC}"
    echo -e "${YELLOW}   Or use: npx eas-cli env:list${NC}"
    ERRORS=$((ERRORS + 1))
    exit 1
fi

# Check if logged in to EAS
if ! eas whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to EAS. Run: eas login${NC}"
    ERRORS=$((ERRORS + 1))
    exit 1
fi

# Get list of configured environment variables
echo "Fetching EAS environment variables for environment: ${TARGET_ENVIRONMENT}..."
SECRETS_LIST=$(eas env:list --environment "${TARGET_ENVIRONMENT}" 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to fetch EAS env variables for '${TARGET_ENVIRONMENT}'${NC}"
    echo "$SECRETS_LIST"
    exit 1
fi

# Check each required secret
echo ""
echo "Checking required secrets..."
for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$SECRETS_LIST" | grep -q "$secret"; then
        echo -e "${GREEN}✅ $secret is configured${NC}"
    else
        echo -e "${RED}❌ $secret is NOT configured${NC}"
        ERRORS=$((ERRORS + 1))
        MISSING_SECRETS=$((MISSING_SECRETS + 1))
    fi
done

# Check optional secrets
echo ""
echo "Checking optional secrets..."
for secret in "${OPTIONAL_SECRETS[@]}"; do
    if echo "$SECRETS_LIST" | grep -q "$secret"; then
        echo -e "${GREEN}✅ $secret is configured${NC}"
    else
        echo -e "${YELLOW}⚠️  $secret is not configured (optional for iOS-only builds)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Display current secrets (names only, not values)
echo ""
echo "Currently configured secrets:"
if echo "$SECRETS_LIST" | grep -q "Name"; then
    echo "$SECRETS_LIST" | grep -E "Name|ID" | head -20
else
    echo "$SECRETS_LIST"
fi

echo ""
echo "=========================================="
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

if [ $MISSING_SECRETS -gt 0 ]; then
    echo -e "${RED}❌ Missing $MISSING_SECRETS required secret(s)${NC}"
    echo ""
    echo "To set missing secrets, run:"
    echo "  eas env:create --name <SECRET_NAME> --value <SECRET_VALUE> --environment ${TARGET_ENVIRONMENT}"
    exit 1
elif [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All required EAS secrets are configured${NC}"
    exit 0
else
    exit 1
fi

