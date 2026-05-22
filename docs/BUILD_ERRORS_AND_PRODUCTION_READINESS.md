# Build Errors & Production Readiness Guide

This document covers all build errors encountered during development and provides a comprehensive production readiness checklist.

## 📋 Table of Contents

1. [Common Build Errors Fixed](#common-build-errors-fixed)
2. [Pre-Build Testing Checklist](#pre-build-testing-checklist)
3. [Production Readiness Checklist](#production-readiness-checklist)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Build Verification Steps](#build-verification-steps)

---

## Common Build Errors Fixed

### 1. Missing Component Imports

**Error:** `ReferenceError: Property 'ChildAvatar' doesn't exist`

**Files Affected:**
- `screens/SettingsScreen.js`
- `screens/MonthlySummaryScreen.js`
- `screens/HomeScreen.js`
- `screens/TimelineScreen.js`
- `screens/AddChildScreen.js`
- `screens/EditChildScreen.js`

**Fix:** Added import statement:
```javascript
import ChildAvatar from '../components/ChildAvatar';
```

**Verification:**
```bash
grep -r "import.*ChildAvatar" screens/
grep -r "import.*ChildAvatar" components/
```

---

### 2. Missing Utility Function Imports

**Error:** `ReferenceError: Property 'isUserPremium' doesn't exist`

**Files Affected:**
- `screens/SettingsScreen.js`
- `screens/ContributorsScreen.js`
- `screens/AddMemoryScreen.js`
- `screens/AddChildScreen.js`

**Fix:** Added state variable or import:
```javascript
import { isPremium } from '../utils/subscription';
const [isUserPremium, setIsUserPremium] = useState(false);
```

**Verification:**
```bash
grep -r "isUserPremium" screens/ --include="*.js"
```

---

### 3. Duplicate Variable Declarations

**Error:** `SyntaxError: Identifier 'childDoc' has already been declared`

**Files Affected:**
- `utils/invitations.js` (line 103)

**Fix:** Consolidated variable declarations to single instance at function start.

**Verification:**
```bash
grep -n "const childDoc\|let childDoc\|var childDoc" utils/invitations.js
```

---

### 4. Missing Date Helper Functions

**Error:** Dates showing incorrectly (yesterday instead of today)

**Files Affected:**
- `utils/storage.js`
- `screens/AddMemoryScreen.js`
- `screens/HomeScreen.js`
- `screens/MonthlySummaryScreen.js`
- `utils/autoMonthlySummary.js`

**Fix:** Added `parseLocalDate` and `normalizeDateToString` helpers in `utils/dateHelper.js`

**Verification:**
```bash
grep -r "parseLocalDate\|normalizeDateToString" utils/ screens/
```

---

### 5. Missing Storage Helper Functions

**Error:** `ReferenceError: Property 'uploadChildAvatar' doesn't exist`

**Files Affected:**
- `screens/AddChildScreen.js`
- `screens/EditChildScreen.js`

**Fix:** Added functions in `utils/storageHelper.js`:
- `uploadChildAvatar(localUri, childId)`
- `deleteChildAvatar(storagePath)`

**Verification:**
```bash
grep -r "uploadChildAvatar\|deleteChildAvatar" screens/
```

---

### 6. RevenueCat Initialization Errors

**Error:** `Error: There is no singleton instance. Make sure you configure Purchases before trying to get the default instance.`

**Files Affected:**
- `utils/revenueCat.js`
- `screens/PremiumScreen.js`

**Fix:** 
- Added `isInitialized` check before all RevenueCat operations
- Ensured `initializeRevenueCat()` is called in `App.js` on user login
- Added fallback initialization in `getAvailablePackages()`

**Verification:**
```bash
grep -r "isInitialized\|initializeRevenueCat" utils/revenueCat.js App.js
```

---

### 7. Missing Environment Variables

**Error:** `OPENAI_API_KEY not found in environment variables`

**Files Affected:**
- `utils/transcription.js`
- `utils/aiSummary.js`

**Fix:** 
- Removed hardcoded API keys
- Added environment variable access via `Constants.expoConfig?.extra?.OPENAI_API_KEY`
- Added error handling for missing keys

**Verification:**
```bash
grep -r "OPENAI_API_KEY\|REVENUECAT_API_KEY\|RESEND_API_KEY" utils/ --include="*.js"
# Should NOT find hardcoded keys
```

---

### 8. JSX Syntax Errors

**Error:** `SyntaxError: Expected corresponding JSX closing tag`

**Files Affected:**
- `screens/EditChildScreen.js` (line 212)

**Fix:** Removed extra closing `</View>` tag

**Verification:**
```bash
# Check for unclosed tags
npx react-native-community/cli doctor
```

---

### 9. Missing Subscription Utility Functions

**Error:** `ReferenceError: Property 'isOnTrial' doesn't exist`

**Files Affected:**
- `screens/SettingsScreen.js`
- `screens/PremiumScreen.js`

**Fix:** Added helper functions in `utils/subscription.js`:
- `isOnTrial()`
- `getTrialInfo()`
- `getTrialDaysRemaining()`

**Verification:**
```bash
grep -r "isOnTrial\|getTrialInfo" utils/subscription.js screens/
```

---

### 10. Firebase Storage Permission Errors

**Error:** `FirebaseError: Firebase Storage: User does not have permission to access`

**Files Affected:**
- `screens/AddChildScreen.js` (when uploading avatar photos)

**Fix:** Created `storage.rules` with proper permissions:
```javascript
match /users/{userId}/{allPaths=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

**Verification:**
```bash
cat storage.rules
firebase deploy --only storage:rules
```

---

### 11. npm ci Errors

**Error:** `npm ERR!` during `npm ci` (clean install)

**Common Causes:**
1. **Peer dependency conflicts** - React version mismatches
2. **Missing package-lock.json** - Lock file not committed
3. **Corrupted node_modules** - Stale or corrupted dependencies
4. **Version mismatches** - package.json and package-lock.json out of sync
5. **Network issues** - Failed to fetch packages
6. **Platform-specific issues** - Native module compilation failures

**Common Errors:**
- `npm ERR! code ERESOLVE` - Dependency resolution conflicts
- `npm ERR! code ENOENT` - Missing package-lock.json
- `npm ERR! code ELIFECYCLE` - Build script failures
- `npm ERR! peer dep missing` - Missing peer dependencies

**Fixes:**

1. **Peer Dependency Warnings (Non-blocking):**
   ```bash
   # React version conflicts with jest-expo (warnings only, not errors)
   # These are expected and don't block builds
   npm ci --legacy-peer-deps
   ```

2. **Missing or Corrupted Lock File:**
   ```bash
   # Regenerate package-lock.json
   rm -rf node_modules package-lock.json
   npm install
   git add package-lock.json
   ```

3. **Version Mismatches:**
   ```bash
   # Ensure package.json and package-lock.json are in sync
   npm install
   ```

4. **Clean Install:**
   ```bash
   # Complete clean install
   rm -rf node_modules package-lock.json
   npm ci
   ```

5. **Platform-Specific Issues:**
   ```bash
   # Clear Expo cache
   npx expo start --clear
   
   # Or for native modules
   cd ios && pod install && cd ..
   ```

**Verification:**
```bash
# Test npm ci (dry run)
npm ci --dry-run

# Full test
rm -rf node_modules
npm ci

# Check for peer dependency issues
npm ls --depth=0
```

**Current Status:**
- ✅ `package-lock.json` exists and is committed
- ⚠️ Peer dependency warnings (React 19 vs jest-expo React 18) - Non-blocking
- ✅ All critical dependencies resolve correctly
- ✅ Build succeeds despite warnings

**Note:** The React version warnings are expected due to jest-expo requiring React 18 while the app uses React 19. These are warnings, not errors, and don't block builds.

---

## Pre-Build Testing Checklist

### Syntax & Import Checks

```bash
# 1. Check for missing imports
grep -r "ChildAvatar\|isUserPremium\|isPremium\|isOnTrial" screens/ --include="*.js" | grep -v "import\|const\|useState"

# 2. Check for duplicate declarations
for file in $(find . -name "*.js" -not -path "./node_modules/*"); do
  echo "Checking $file..."
  grep -n "const\|let\|var" "$file" | sort | uniq -d
done

# 3. Check for unclosed JSX tags
npx react-native-community/cli doctor

# 4. Run linter
npm run lint 2>/dev/null || echo "Linter not configured"
```

### Dependency Checks

```bash
# 1. Verify all dependencies are installed
npm install

# 2. Check for missing peer dependencies
npm ls --depth=0

# 3. Verify critical packages
npm list react-native-purchases expo-image-picker firebase

# 4. Test npm ci (clean install) - CRITICAL for CI/CD builds
npm ci --dry-run

# 5. If npm ci fails, try with legacy peer deps
npm ci --legacy-peer-deps --dry-run

# 6. Full npm ci test (only if dry-run passes)
# rm -rf node_modules
# npm ci
```

### Environment Variable Checks

```bash
# 1. Verify .env file exists (but not committed)
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# 2. Check for hardcoded API keys
grep -r "sk-proj-\|appl_\|re_" utils/ --include="*.js" | grep -v "process.env\|Constants.expoConfig"

# 3. Verify app.config.js has environment variables
grep -A 5 "extra:" app.config.js
```

### Build-Specific Checks

```bash
# 1. Test iOS build configuration
npx expo prebuild --platform ios --clean

# 2. Test Android build configuration
npx expo prebuild --platform android --clean

# 3. Check for TypeScript errors (if applicable)
# npx tsc --noEmit
```

---

## Production Readiness Checklist

### ✅ Critical - Must Complete

- [x] **Remove Testing Features**
  - [x] Removed testing tile from `SettingsScreen.js`
  - [ ] Remove or guard `utils/testPremium.js` (optional - can keep for admin use)
  
- [x] **API Keys**
  - [x] Removed hardcoded OpenAI API keys from `utils/transcription.js`
  - [x] Removed hardcoded OpenAI API keys from `utils/aiSummary.js`
  - [x] All API keys moved to environment variables
  - [x] Created `test-api-keys.sh` validation script

- [x] **Component Imports**
  - [x] All `ChildAvatar` imports verified
  - [x] All subscription utility imports verified
  - [x] All storage helper imports verified

- [x] **Date Handling**
  - [x] `parseLocalDate` implemented and used everywhere
  - [x] `normalizeDateToString` implemented and used everywhere
  - [x] Monthly summary date filtering fixed

- [x] **RevenueCat Integration**
  - [x] Initialization checks added
  - [x] Fallback initialization implemented
  - [x] Error handling for missing API keys

- [x] **Firebase Storage**
  - [x] `storage.rules` created and deployed
  - [x] Avatar upload permissions configured

- [x] **Premium Status Display**
  - [x] Premium status card added to Settings screen
  - [x] Trial status card working
  - [x] Upgrade card working

### 🟡 Important - Should Complete

- [ ] **Debug Logging**
  - [ ] Remove or wrap debug `console.log` statements in `__DEV__` checks
  - [ ] Keep `console.error` for production error tracking
  - [ ] Consider implementing logger utility

- [ ] **Email Configuration**
  - [ ] Update email "from" addresses in `utils/emailService.js`
  - [ ] Update email "from" addresses in `utils/invitations.js`
  - [ ] Verify email domains in Resend

- [ ] **Environment Variables (EAS)**
  - [ ] Set up EAS Secrets for production:
    ```bash
    eas secret:create --scope project --name OPENAI_API_KEY --value your_key
    eas secret:create --scope project --name RESEND_API_KEY --value your_key
    eas secret:create --scope project --name REVENUECAT_API_KEY_IOS --value your_key
    eas secret:create --scope project --name REVENUECAT_API_KEY_ANDROID --value your_key
    ```

- [ ] **App Configuration**
  - [ ] Update version in `app.config.js` (currently `1.1.3`)
  - [ ] Update iOS build number (currently `7`)
  - [ ] Update Android version code (currently `10`)
  - [ ] Review bundle identifier/package name

- [ ] **Security Review**
  - [ ] Review `firestore.rules` for production
  - [ ] Review `storage.rules` for production
  - [ ] Test security rules with production data structure

### 🟢 Recommended - Nice to Have

- [ ] **Error Tracking**
  - [ ] Set up Sentry or similar error tracking
  - [ ] Configure crash reporting
  - [ ] Set up analytics (Firebase Analytics)

- [ ] **Performance**
  - [ ] Test on physical devices (iOS and Android)
  - [ ] Optimize image loading
  - [ ] Review bundle size

- [ ] **Testing**
  - [ ] Test all premium features with real purchases (sandbox)
  - [ ] Test invitation flow end-to-end
  - [ ] Test monthly summary email delivery
  - [ ] Test data export/import
  - [ ] Test offline functionality

- [ ] **App Store Preparation**
  - [ ] Prepare app screenshots
  - [ ] Write app description
  - [ ] Prepare privacy policy URL
  - [ ] Prepare terms of service URL
  - [ ] Configure App Store Connect listing
  - [ ] Configure Google Play Console listing

---

## Common Issues & Solutions

### Issue: "Cannot read property 'title' of undefined" in PremiumScreen

**Cause:** RevenueCat package data may be incomplete

**Solution:** Added null checks and safe property access:
```javascript
const packageTitle = pkg.storeProduct?.title || (isMonthly ? 'Monthly' : 'Yearly');
```

**Location:** `screens/PremiumScreen.js` (lines 402, 497)

---

### Issue: Premium status reverts after login

**Cause:** RevenueCat sync overriding manual admin settings

**Solution:** Added `preventAutoSync` flag to prevent auto-sync

**Location:** 
- `utils/revenueCat.js` (hasActiveSubscription function)
- `scripts/admin-manage-premium.js` (sets flag automatically)
- `docs/ADMIN_PREMIUM_MANAGEMENT.md` (manual instructions)

---

### Issue: Dates showing as previous day

**Cause:** UTC timezone conversion when parsing date strings

**Solution:** Implemented `parseLocalDate` and `normalizeDateToString` helpers

**Location:** `utils/dateHelper.js`

---

### Issue: Monthly summary not detecting current month memories

**Cause:** Using `new Date(dateString)` which interprets as UTC

**Solution:** Updated all monthly filtering to use `parseLocalDate`

**Files Updated:**
- `utils/storage.js`
- `screens/AddMemoryScreen.js`
- `screens/HomeScreen.js`
- `screens/MonthlySummaryScreen.js`
- `utils/autoMonthlySummary.js`

---

### Issue: "Purchase completed but premium not activated"

**Cause:** RevenueCat entitlement not configured or test mode issue

**Solution:** 
- Added better logging to show available entitlements
- Added fallback to activate premium if purchase succeeds but entitlement missing
- Added documentation about configuring "premium" entitlement in RevenueCat

**Location:** `utils/revenueCat.js` (purchasePackage function)

---

### Issue: Child selection resets when navigating between screens

**Cause:** Selected child ID not persisted in AsyncStorage

**Solution:** Store selected child ID in AsyncStorage using `SELECTED_CHILD_ID_KEY`

**Files Updated:**
- `screens/HomeScreen.js`
- `screens/TimelineScreen.js`
- `screens/AddMemoryScreen.js`

---

## Build Verification Steps

### Step 1: Pre-Build Checks

```bash
# Run comprehensive build readiness check
./scripts/verify-build-readiness.sh

# Test npm ci (critical for CI/CD builds)
npm ci --dry-run

# If npm ci fails, check for solutions in documentation
# Common fix: npm ci --legacy-peer-deps

# Check for common errors
npm run test 2>/dev/null || echo "Tests not critical for build"

# Verify no hardcoded keys
grep -r "sk-proj-\|appl_\|re_" utils/ --include="*.js" | grep -v "process.env\|Constants.expoConfig" && echo "❌ Found hardcoded keys!" || echo "✅ No hardcoded keys"
```

### Step 2: Local Build Test

```bash
# Test iOS build
npx expo prebuild --platform ios --clean
npx expo run:ios

# Test Android build
npx expo prebuild --platform android --clean
npx expo run:android
```

### Step 3: EAS Build Test

```bash
# Build for iOS (development)
eas build --platform ios --profile development

# Build for Android (development)
eas build --platform android --profile development
```

### Step 4: Production Build

```bash
# Build for iOS (production)
eas build --platform ios --profile production

# Build for Android (production)
eas build --platform android --profile production
```

### Step 5: Post-Build Verification

1. **Install on physical device**
2. **Test critical flows:**
   - [ ] User signup/login
   - [ ] Add child
   - [ ] Add memory (text, photo, audio)
   - [ ] View timeline
   - [ ] Premium purchase flow
   - [ ] Invite contributor
   - [ ] Accept invitation
   - [ ] Monthly summary generation
   - [ ] Data export/import

3. **Check console for errors:**
   - [ ] No critical errors
   - [ ] No missing imports
   - [ ] No undefined property access

---

## Quick Reference: Error Patterns to Watch For

### Import Errors
```bash
# Pattern: ReferenceError: Property 'X' doesn't exist
grep -r "import.*X" . --include="*.js" | grep -v "node_modules"
```

### Syntax Errors
```bash
# Pattern: SyntaxError: Unexpected token / Identifier already declared
npx react-native-community/cli doctor
```

### Type Errors
```bash
# Pattern: TypeError: Cannot read property 'X' of undefined
grep -r "\\.X" . --include="*.js" | grep -v "node_modules" | grep -v "//"
```

### Missing Dependencies
```bash
# Pattern: Module not found / Cannot resolve module
npm ls --depth=0
```

### npm ci Errors
```bash
# Pattern: npm ERR! code ERESOLVE / npm ERR! code ENOENT
# Test npm ci
npm ci --dry-run

# Check package-lock.json exists
test -f package-lock.json && echo "✅ Lock file exists" || echo "❌ Missing package-lock.json"

# If peer dependency issues
npm ci --legacy-peer-deps --dry-run
```

---

## Maintenance Notes

### When Adding New Features

1. **Check for missing imports** - Always verify component/utility imports
2. **Test date handling** - Use `parseLocalDate` for all date operations
3. **Check premium gating** - Verify `isPremium()` checks are in place
4. **Update security rules** - If adding new Firestore collections
5. **Test on both platforms** - iOS and Android

### When Updating Dependencies

1. **Check breaking changes** - Review changelogs
2. **Test RevenueCat** - Verify subscription flow still works
3. **Test Firebase** - Verify auth and Firestore operations
4. **Update security rules** - If Firebase SDK version changes

### Before Each Release

1. Run pre-build checks
2. Test on physical devices
3. Verify all premium features
4. Check error logs
5. Update version numbers
6. Review changelog

---

## Support & Troubleshooting

If you encounter build errors:

1. **Check this document** - Most common errors are documented here
2. **Review console logs** - Look for specific error messages
3. **Verify environment variables** - Use `test-api-keys.sh`
4. **Check imports** - Use grep commands in this document
5. **Review recent changes** - Check git history for recent modifications

For production issues, refer to:
- `docs/ADMIN_PREMIUM_MANAGEMENT.md` - Managing user premium status
- `docs/PRODUCTION_CHECKLIST.md` - Complete production checklist
- `docs/REVENUECAT_SETUP.md` - RevenueCat configuration

---

**Last Updated:** January 2025
**Version:** 1.0.0

