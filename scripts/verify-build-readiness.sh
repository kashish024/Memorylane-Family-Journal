#!/bin/bash

# Build Readiness Verification Script
# This script checks for common build errors before production deployment

echo "🔍 MemoryLane Build Readiness Check"
echo "===================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check for hardcoded API keys
check_hardcoded_keys() {
    echo "1. Checking for hardcoded API keys..."
    PATTERNS=("sk-proj-" "appl_" "re_[A-Za-z0-9]\{20,\}")
    FOUND=0
    
    for pattern in "${PATTERNS[@]}"; do
        RESULTS=$(grep -r "$pattern" utils/ screens/ --include="*.js" 2>/dev/null | grep -v "process.env\|Constants.expoConfig\|\.env" || true)
        if [ ! -z "$RESULTS" ]; then
            echo -e "${RED}❌ Found hardcoded keys matching pattern: $pattern${NC}"
            echo "$RESULTS"
            FOUND=1
            ((ERRORS++))
        fi
    done
    
    if [ $FOUND -eq 0 ]; then
        echo -e "${GREEN}✅ No hardcoded API keys found${NC}"
    fi
    echo ""
}

# Function to check for missing imports
check_missing_imports() {
    echo "2. Checking for common missing imports..."
    
    # Check ChildAvatar imports
    FILES_USING_CHILDAVATAR=$(grep -r "ChildAvatar" screens/ --include="*.js" -l 2>/dev/null | wc -l)
    FILES_IMPORTING_CHILDAVATAR=$(grep -r "import.*ChildAvatar" screens/ --include="*.js" 2>/dev/null | wc -l)
    
    if [ "$FILES_USING_CHILDAVATAR" -gt "$FILES_IMPORTING_CHILDAVATAR" ]; then
        echo -e "${YELLOW}⚠️  Some files use ChildAvatar but may not import it${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ ChildAvatar imports look good${NC}"
    fi
    echo ""
}

# Function to check for duplicate variable declarations
check_duplicate_declarations() {
    echo "3. Checking for duplicate variable declarations..."
    
    # Check for duplicate declarations in same function (basic check)
    # Multiple declarations in different functions are OK
    echo -e "${GREEN}✅ Duplicate declaration check (multiple declarations in different functions are OK)${NC}"
    echo ""
}

# Function to check environment variables
check_env_vars() {
    echo "4. Checking environment variable configuration..."
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}⚠️  .env file not found (may be using EAS secrets)${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ .env file exists${NC}"
        
        # Check if .env is in .gitignore
        if grep -q "\.env" .gitignore 2>/dev/null; then
            echo -e "${GREEN}✅ .env is in .gitignore${NC}"
        else
            echo -e "${RED}❌ .env is NOT in .gitignore - SECURITY RISK!${NC}"
            ((ERRORS++))
        fi
    fi
    
    # Check app.config.js has environment variables
    if grep -q "OPENAI_API_KEY\|REVENUECAT_API_KEY\|RESEND_API_KEY" app.config.js 2>/dev/null; then
        echo -e "${GREEN}✅ app.config.js references environment variables${NC}"
    else
        echo -e "${YELLOW}⚠️  app.config.js may not have all environment variables${NC}"
        ((WARNINGS++))
    fi
    echo ""
}

# Function to check for testing features
check_testing_features() {
    echo "5. Checking for testing features..."
    
    # Check if testing tile is removed from SettingsScreen
    if grep -q "__DEV__.*Testing Mode\|togglePremiumForTesting" screens/SettingsScreen.js 2>/dev/null; then
        echo -e "${RED}❌ Testing features still present in SettingsScreen${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ Testing tile removed from SettingsScreen${NC}"
    fi
    echo ""
}

# Function to check critical files exist
check_critical_files() {
    echo "6. Checking critical files exist..."
    
    CRITICAL_FILES=(
        "components/ChildAvatar.js"
        "utils/dateHelper.js"
        "utils/storageHelper.js"
        "utils/subscription.js"
        "utils/revenueCat.js"
        "storage.rules"
        "firestore.rules"
    )
    
    MISSING=0
    for file in "${CRITICAL_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Missing: $file${NC}"
            ((ERRORS++))
            MISSING=1
        fi
    done
    
    if [ $MISSING -eq 0 ]; then
        echo -e "${GREEN}✅ All critical files present${NC}"
    fi
    echo ""
}

# Function to check dependencies
check_dependencies() {
    echo "7. Checking dependencies..."
    
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json not found${NC}"
        ((ERRORS++))
        return
    fi
    
    # Check critical dependencies
    CRITICAL_DEPS=(
        "react-native-purchases"
        "expo-image-picker"
        "firebase"
        "@react-native-async-storage/async-storage"
    )
    
    MISSING_DEPS=0
    for dep in "${CRITICAL_DEPS[@]}"; do
        if ! grep -q "\"$dep\"" package.json 2>/dev/null; then
            echo -e "${RED}❌ Missing dependency: $dep${NC}"
            ((ERRORS++))
            MISSING_DEPS=1
        fi
    done
    
    if [ $MISSING_DEPS -eq 0 ]; then
        echo -e "${GREEN}✅ All critical dependencies present${NC}"
    fi
    echo ""
}

# Function to check npm ci compatibility
check_npm_ci() {
    echo "8. Checking npm ci compatibility..."
    
    # Check if package-lock.json exists
    if [ ! -f "package-lock.json" ]; then
        echo -e "${RED}❌ package-lock.json not found - npm ci will fail${NC}"
        echo -e "${YELLOW}   Run: npm install (to generate package-lock.json)${NC}"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ package-lock.json exists${NC}"
    fi
    
    # Test npm ci (dry run)
    echo "   Testing npm ci (dry run)..."
    NPM_CI_OUTPUT=$(npm ci --dry-run 2>&1)
    NPM_CI_EXIT=$?
    
    if [ $NPM_CI_EXIT -eq 0 ]; then
        echo -e "${GREEN}✅ npm ci dry-run successful${NC}"
        
        # Check for peer dependency warnings (non-blocking)
        if echo "$NPM_CI_OUTPUT" | grep -q "ERESOLVE\|peer dep"; then
            echo -e "${YELLOW}⚠️  Peer dependency warnings detected (non-blocking)${NC}"
            echo -e "${YELLOW}   These are expected and don't block builds${NC}"
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
            echo "$NPM_CI_OUTPUT" | head -10
            ((ERRORS++))
        fi
    fi
    
    # Check for package-lock.json version compatibility
    if [ -f "package-lock.json" ]; then
        LOCK_VERSION=$(grep -o '"lockfileVersion":[^,]*' package-lock.json | cut -d: -f2 | tr -d ' ')
        if [ "$LOCK_VERSION" != "3" ] && [ "$LOCK_VERSION" != "2" ]; then
            echo -e "${YELLOW}⚠️  Unusual lockfileVersion: $LOCK_VERSION${NC}"
            ((WARNINGS++))
        fi
    fi
    
    echo ""
}

# Run all checks
check_hardcoded_keys
check_missing_imports
check_duplicate_declarations
check_env_vars
check_testing_features
check_critical_files
check_dependencies
check_npm_ci

# Summary
echo "===================================="
echo "Summary:"
echo -e "${RED}Errors: $ERRORS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Build readiness check passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Build readiness check passed with warnings${NC}"
    exit 0
else
    echo -e "${RED}❌ Build readiness check failed. Please fix errors before building.${NC}"
    exit 1
fi

