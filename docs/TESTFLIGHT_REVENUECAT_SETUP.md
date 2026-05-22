# RevenueCat Setup for TestFlight Testing

## Overview

For **TestFlight builds**, you need to use **production API keys**, not the Test Store key. TestFlight builds are production builds and have native store access.

## Setup for TestFlight

### 1. Production API Key in EAS Secrets

Make sure your **production** RevenueCat API key is set in EAS secrets:

```bash
# Verify it's set
eas secret:list | grep REVENUECAT_API_KEY_IOS
```

Or check in EAS Dashboard:
- Go to: https://expo.dev/accounts/[your-account]/projects/memorylane/secrets
- Verify `REVENUECAT_API_KEY_IOS` exists with your production key (starts with `appl_`)

### 2. How It Works

**In TestFlight Builds:**
- ✅ Uses `REVENUECAT_API_KEY_IOS` from EAS secrets (production key)
- ✅ Has native store access (can make real purchases)
- ✅ Connects to App Store Connect subscriptions
- ✅ Works with sandbox testers for testing

**In Expo Go:**
- ✅ Uses `REVENUECAT_TEST_STORE_API_KEY` from `.env` (if available)
- ✅ Uses Test Store environment (no real purchases)
- ⚠️ Only for development testing

### 3. Build for TestFlight

```bash
eas build --platform ios --profile production
```

This build will:
- Use production API keys from EAS secrets
- Have native store access
- Work with App Store Connect subscriptions
- Allow testing with sandbox accounts

### 4. Testing in TestFlight

#### Option A: Sandbox Testing (Recommended)

1. **Create Sandbox Tester** in App Store Connect:
   - App Store Connect → Users and Access → Sandbox Testers
   - Create a test account (use different email than your real account)

2. **Sign Out of Real Apple ID** on your test device

3. **Install TestFlight Build** and open the app

4. **Try to Purchase**:
   - When prompted, sign in with sandbox tester account
   - Purchase will complete (no real charge)
   - Subscription will be active in sandbox environment

#### Option B: Real Purchase Testing

1. **Install TestFlight Build**
2. **Sign in with your real Apple ID**
3. **Make a real purchase** (will be charged)
4. **Test subscription features**

**Note**: Real purchases are charged, but you can request refunds from Apple.

## Key Differences

| Environment | API Key Used | Store Access | Purchases |
|------------|--------------|--------------|-----------|
| **Expo Go** | Test Store Key | ❌ No | Test Store (fake) |
| **Development Build** | Production Key | ✅ Yes | Sandbox/Real |
| **TestFlight** | Production Key | ✅ Yes | Sandbox/Real |
| **Production** | Production Key | ✅ Yes | Real only |

## Checklist for TestFlight Testing

- [ ] Production `REVENUECAT_API_KEY_IOS` in EAS secrets
- [ ] Subscriptions created in App Store Connect (`premium_monthly`, `premium_yearly`)
- [ ] Subscriptions submitted for review (or use sandbox)
- [ ] Products linked in RevenueCat
- [ ] Entitlement `premium` created and attached
- [ ] Offering created with packages
- [ ] Build created: `eas build --platform ios --profile production`
- [ ] TestFlight build installed
- [ ] Sandbox tester account created (for testing)
- [ ] Test purchase flow

## Important Notes

1. **TestFlight = Production Build**: TestFlight builds use production API keys automatically
2. **Sandbox Testing**: Use sandbox testers to test without real charges
3. **Subscriptions Must Be Approved**: For production purchases, subscriptions need App Review approval
4. **Sandbox Works Without Approval**: You can test with sandbox accounts even if subscriptions aren't approved yet

## Troubleshooting

### "Invalid API key" in TestFlight
- Verify production key is in EAS secrets
- Rebuild after adding/updating secret
- Check that key starts with `appl_` (iOS production key)

### "Product not available"
- Ensure subscriptions are created in App Store Connect
- Check Product IDs match exactly (`premium_monthly`, `premium_yearly`)
- For sandbox testing, subscriptions don't need to be approved
- For real purchases, subscriptions must be approved

### "No packages found"
- Verify offering is set as "current" in RevenueCat
- Check that products are attached to entitlement
- Ensure products are linked to App Store Connect

## Summary

✅ **Yes, production API key works in TestFlight!**

- TestFlight builds automatically use production keys from EAS secrets
- You can test with sandbox accounts (no real charges)
- Or test with real purchases (will be charged)
- The Test Store key is only for Expo Go development

