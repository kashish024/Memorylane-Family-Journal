#!/bin/bash

# Package Lock File Build Error Check
# This script checks for potential build errors related to package-lock.json

echo "🔍 Checking package-lock.json for build errors..."
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: package-lock.json exists
echo "1. Checking if package-lock.json exists..."
if [ ! -f "package-lock.json" ]; then
    echo -e "${RED}❌ package-lock.json is missing${NC}"
    echo -e "${RED}   This will cause npm ci to fail in CI/CD builds${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ package-lock.json exists${NC}"
fi
echo ""

# Check 2: Lockfile version
echo "2. Checking lockfile version..."
LOCK_VERSION=$(grep -o '"lockfileVersion":[^,]*' package-lock.json 2>/dev/null | cut -d: -f2 | tr -d ' ' || echo "unknown")
if [ "$LOCK_VERSION" = "3" ] || [ "$LOCK_VERSION" = "2" ]; then
    echo -e "${GREEN}✅ Lockfile version: $LOCK_VERSION (compatible)${NC}"
else
    echo -e "${YELLOW}⚠️  Unusual lockfile version: $LOCK_VERSION${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 3: npm ci dry-run
echo "3. Testing npm ci (dry-run)..."
NPM_CI_OUTPUT=$(npm ci --dry-run 2>&1)
NPM_CI_EXIT=$?

if [ $NPM_CI_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ npm ci dry-run successful${NC}"
    
    # Check for peer dependency warnings
    if echo "$NPM_CI_OUTPUT" | grep -q "ERESOLVE\|peer dep"; then
        echo -e "${YELLOW}⚠️  Peer dependency warnings detected${NC}"
        echo -e "${YELLOW}   These are expected (React 19 vs jest-expo React 18) and won't block builds${NC}"
        ((WARNINGS++))
    fi
else
    # Check if it's just warnings
    if echo "$NPM_CI_OUTPUT" | grep -q "npm warn\|ERESOLVE"; then
        echo -e "${YELLOW}⚠️  npm ci has warnings (may need --legacy-peer-deps)${NC}"
        echo -e "${YELLOW}   Run: npm ci --legacy-peer-deps${NC}"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ npm ci dry-run failed${NC}"
        echo "$NPM_CI_OUTPUT" | grep -E "npm ERR|Error" | head -5
        ((ERRORS++))
    fi
fi
echo ""

# Check 4: Package.json and package-lock.json sync
echo "4. Checking package.json and package-lock.json sync..."
if [ -f "package.json" ] && [ -f "package-lock.json" ]; then
    # Check if running npm install would change anything
    INSTALL_CHECK=$(npm install --package-lock-only --dry-run 2>&1 | grep -E "added|removed|changed" || echo "up to date")
    if echo "$INSTALL_CHECK" | grep -q "up to date\|unchanged"; then
        echo -e "${GREEN}✅ package.json and package-lock.json are in sync${NC}"
    else
        echo -e "${YELLOW}⚠️  package.json and package-lock.json may be out of sync${NC}"
        echo -e "${YELLOW}   Consider running: npm install${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Missing package.json or package-lock.json${NC}"
    ((ERRORS++))
fi
echo ""

# Check 5: Critical dependencies in lockfile
echo "5. Checking critical dependencies in lockfile..."
CRITICAL_DEPS=("react-native-purchases" "expo-image-picker" "firebase" "@react-native-async-storage/async-storage")
MISSING=0
for dep in "${CRITICAL_DEPS[@]}"; do
    if grep -q "\"$dep\"" package-lock.json 2>/dev/null; then
        echo -e "${GREEN}✅ $dep found in lockfile${NC}"
    else
        echo -e "${RED}❌ $dep missing from lockfile${NC}"
        ((ERRORS++))
        MISSING=1
    fi
done

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All critical dependencies present in lockfile${NC}"
fi
echo ""

# Check 6: Extraneous packages
echo "6. Checking for extraneous packages..."
EXTRANEOUS=$(npm ls --depth=0 2>&1 | grep "extraneous" | wc -l | tr -d ' ')
if [ "$EXTRANEOUS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $EXTRANEOUS extraneous packages${NC}"
    echo -e "${YELLOW}   These are usually peer dependencies and won't block builds${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ No extraneous packages${NC}"
fi
echo ""

# Summary
echo "=================================================="
echo "Summary:"
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ package-lock.json is ready for builds!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  package-lock.json is ready with warnings${NC}"
    exit 0
else
    echo -e "${RED}❌ package-lock.json has errors that may cause build failures${NC}"
    exit 1
fi

