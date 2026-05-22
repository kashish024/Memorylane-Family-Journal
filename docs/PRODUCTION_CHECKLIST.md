# Production Readiness Checklist

## 🔴 CRITICAL - Must Fix Before Production

### 1. Remove Hardcoded API Keys
- [ ] **`utils/transcription.js`** (line 4): Remove hardcoded OpenAI API key
  - Move to environment variable: `process.env.OPENAI_API_KEY`
  - Update to: `const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;`
  
- [ ] **`utils/aiSummary.js`** (line 1): Remove hardcoded OpenAI API key
  - Move to environment variable: `process.env.OPENAI_API_KEY`
  - Update to: `const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;`

- [ ] **`utils/firebase.js`**: Firebase config is exposed (acceptable for client-side, but verify it's not sensitive)
  - Consider using environment variables if you have sensitive config

### 2. Remove Testing Features
- [ ] **`screens/SettingsScreen.js`** (lines 683-718): Remove entire testing section
  - Remove the `{__DEV__ && (...)}` block with "Testing Mode" tile
  - Remove import: `import { togglePremiumForTesting, checkPremiumStatus } from '../utils/testPremium';`

- [ ] **`utils/testPremium.js`**: Either delete this file OR add production guard
  - Option 1: Delete the file entirely
  - Option 2: Add `if (__DEV__) { ... }` guards around all functions
  - Update any remaining imports to check `__DEV__` before calling

### 3. Remove Debug Logging
- [ ] **`screens/PremiumScreen.js`** (lines 26-30): Remove debug logging for RevenueCat keys
  - Remove all `console.log('🔑 ...')` statements

- [ ] **`screens/ContributorsScreen.js`**: Remove debug logging
  - Remove `console.log('🔍 ContributorsScreen...')` statements (lines 35, 71, 74)

- [ ] **`screens/HomeScreen.js`**: Remove debug logging
  - Remove `console.log('🏠 HomeScreen...')` statements (lines 85, 99, 106)

- [ ] **`screens/TimelineScreen.js`**: Remove extensive debug logging
  - Remove all `console.log('📅 Timeline...')` statements (lines 92, 107, 111, 125, 129, 130, 142, 156, 163, 175, 178, 180, 181, 217)
  - Remove all `console.log('🎵 ...')` statements (lines 279-311)

- [ ] **`screens/AddMemoryScreen.js`**: Remove debug logging
  - Remove all `console.log('=== HANDLE SAVE STARTED ===')` and related logs (lines 321-444)
  - Remove `console.log('📸 ...')` statements (lines 209, 212)

- [ ] **`utils/subscription.js`**: Remove debug logging
  - Remove all `console.log('🔍 getSubscriptionTier...')` statements

- [ ] **General**: Consider removing or conditionally enabling all `console.log` statements
  - Option: Wrap in `if (__DEV__) { console.log(...) }`
  - Keep `console.error` for production error tracking

### 4. Remove Test Mode Flags
- [ ] **`utils/invitations.js`** (line 97): Remove or ensure `ALLOW_SELF_INVITE_FOR_TESTING` is `false`
  - Already set to `false`, but consider removing the flag entirely

### 5. Update Email Configuration
- [ ] **`utils/emailService.js`** (line 22): Update email "from" address
  - Change from: `'MemoryLane <onboarding@resend.dev>'` (test email)
  - Change to: Your production email domain (e.g., `'MemoryLane <noreply@yourdomain.com>'`)
  - Ensure you have verified the domain in Resend

- [ ] **`utils/invitations.js`** (line 681): Update email "from" address
  - Change from: `'MemoryLane <invitations@mymemorlylane.com>'` (check if this is correct)
  - Verify domain is correct and verified in Resend

## 🟡 IMPORTANT - Should Fix

### 6. Environment Variables Setup
- [ ] **`app.config.js`**: Verify all environment variables are properly configured
  - Ensure `.env` file is NOT committed to git (check `.gitignore`)
  - Set up EAS Secrets for production builds:
    ```bash
    eas secret:create --scope project --name OPENAI_API_KEY --value your_key
    eas secret:create --scope project --name RESEND_API_KEY --value your_key
    eas secret:create --scope project --name REVENUECAT_API_KEY_IOS --value your_key
    eas secret:create --scope project --name REVENUECAT_API_KEY_ANDROID --value your_key
    ```

### 7. App Configuration
- [ ] **`app.config.js`**: Review and update:
  - [ ] App version number (currently `1.1.2`)
  - [ ] iOS build number (currently `6`)
  - [ ] Android version code (currently `9`)
  - [ ] Bundle identifier/package name
  - [ ] App name and description

### 8. Security Review
- [ ] **`firestore.rules`**: Review security rules
  - Ensure all rules are production-ready
  - Test with production data structure
  - Verify no overly permissive rules

- [ ] **`storage.rules`**: Review Firebase Storage rules
  - Ensure proper access controls

### 9. Error Handling
- [ ] Review error messages for user-facing text
- [ ] Ensure all error messages are user-friendly
- [ ] Remove technical error details from user-facing alerts

### 10. Code Cleanup
- [ ] Remove unused imports
- [ ] Remove commented-out code
- [ ] Remove TODO/FIXME comments (or move to issue tracker)
- [ ] Review and clean up any temporary workarounds

## 🟢 RECOMMENDED - Nice to Have

### 11. Performance Optimization
- [ ] Review and optimize image loading
- [ ] Check for memory leaks
- [ ] Optimize list rendering (use FlatList where appropriate)
- [ ] Review bundle size

### 12. Analytics & Monitoring
- [ ] Set up error tracking (e.g., Sentry, Bugsnag)
- [ ] Set up analytics (e.g., Firebase Analytics, Mixpanel)
- [ ] Configure crash reporting

### 13. Testing
- [ ] Test on physical devices (iOS and Android)
- [ ] Test all premium features with real purchases (sandbox)
- [ ] Test invitation flow end-to-end
- [ ] Test monthly summary email delivery
- [ ] Test data export/import
- [ ] Test offline functionality

### 14. App Store Preparation
- [ ] Prepare app screenshots
- [ ] Write app description
- [ ] Prepare privacy policy URL
- [ ] Prepare terms of service URL
- [ ] Set up App Store Connect listing
- [ ] Set up Google Play Console listing
- [ ] Configure app pricing and availability

### 15. Documentation
- [ ] Update README with production setup instructions
- [ ] Document environment variables
- [ ] Document deployment process
- [ ] Create runbook for common issues

## 📋 Quick Action Items Summary

1. **Remove hardcoded API keys** → Move to environment variables
2. **Remove testing tile** from SettingsScreen
3. **Remove/disable testPremium.js** utility
4. **Remove debug console.logs** (especially in PremiumScreen, TimelineScreen, AddMemoryScreen)
5. **Update email "from" addresses** to production domains
6. **Set up EAS Secrets** for production builds
7. **Review and update app.config.js** version numbers
8. **Test all features** on physical devices
9. **Set up error tracking** and analytics
10. **Prepare App Store/Play Store** listings

## 🔧 Script to Help Clean Up Console Logs

You can create a script to conditionally disable console.logs in production:

```javascript
// utils/logger.js
const isDev = __DEV__;

export const log = (...args) => {
  if (isDev) {
    console.log(...args);
  }
};

export const error = (...args) => {
  console.error(...args); // Always log errors
};
```

Then replace `console.log` with `log` from this utility.

## ⚠️ Security Notes

- Never commit `.env` files
- Never commit API keys or secrets
- Use EAS Secrets for production builds
- Review Firebase security rules
- Ensure proper authentication checks
- Validate all user inputs

