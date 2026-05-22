# RevenueCat Packages Not Showing in Premium Screen

## Problem
Subscriptions/packages are not appearing in the Premium screen in TestFlight builds.

## Common Causes

### 1. **No Current Offering Set**
RevenueCat requires an offering to be set as "current" for packages to appear.

**Fix:**
1. Go to RevenueCat Dashboard → Offerings
2. Create an offering (or use existing one)
3. **Set it as "Current"** (there's a toggle/button to make it current)
4. The offering must be marked as "Current" for the app to fetch packages

### 2. **Products Not Attached to Offering**
Even if an offering exists, packages won't show if products aren't attached.

**Fix:**
1. Go to RevenueCat Dashboard → Offerings → Your Current Offering
2. Click "Add Package" or "Attach Products"
3. Attach both:
   - `premium_monthly` (Monthly package)
   - `premium_yearly` (Yearly package)
4. Save the offering

### 3. **Products Not Linked to App Store Connect**
Products must be linked to App Store Connect subscriptions.

**Fix:**
1. Go to RevenueCat Dashboard → Products
2. For each product (`premium_monthly`, `premium_yearly`):
   - Click on the product
   - Under "Store Products", click "Link Product"
   - Select the corresponding App Store Connect subscription
   - Save

### 4. **Subscriptions Not Approved in App Store Connect**
For production builds (TestFlight), subscriptions must be approved.

**Fix:**
1. Go to App Store Connect → Your App → Subscriptions
2. Ensure both subscriptions are:
   - Created
   - Submitted for review
   - **Approved** (or at least in "Ready to Submit" status)
3. For sandbox testing, subscriptions don't need approval, but they must exist

### 5. **Wrong API Key**
Using test API key in production build (we fixed this, but verify).

**Fix:**
- Ensure production API key (`appl_...`) is in EAS secrets
- Rebuild the app after adding/updating secrets

## Debugging Steps

### Check Console Logs
When you open Premium screen, check the console logs for:

```
📦 Fetching RevenueCat offerings...
📦 Offerings received: { hasCurrent: true/false, ... }
✅ Found X packages: [...]
```

### What to Look For:

1. **If `hasCurrent: false`:**
   - No current offering set in RevenueCat dashboard
   - Fix: Set an offering as "Current"

2. **If `availablePackagesCount: 0`:**
   - Offering exists but no packages attached
   - Fix: Attach products to the offering

3. **If packages array is empty:**
   - Products not linked to App Store Connect
   - Or subscriptions not approved
   - Fix: Link products and ensure subscriptions are approved

4. **If error occurs:**
   - Check error message in logs
   - Common: Network error, API key issue, or initialization failure

## Verification Checklist

- [ ] RevenueCat offering created
- [ ] Offering set as "Current"
- [ ] Products (`premium_monthly`, `premium_yearly`) attached to offering
- [ ] Products linked to App Store Connect subscriptions
- [ ] Subscriptions exist in App Store Connect
- [ ] Subscriptions are approved (or ready for sandbox testing)
- [ ] Production API key (`appl_...`) in EAS secrets
- [ ] App rebuilt after configuration changes

## Quick Test

1. Open Premium screen in TestFlight
2. Check console logs (via Xcode Device Console or Console.app)
3. Look for the debug messages starting with `📦`
4. The logs will tell you exactly what's missing

## Still Not Working?

1. **Check RevenueCat Dashboard:**
   - Go to RevenueCat Dashboard → Project Settings → API Keys
   - Verify you're using the correct project
   - Check that the API key matches what's in EAS secrets

2. **Test in Sandbox:**
   - Create a sandbox tester in App Store Connect
   - Sign out of your real Apple ID
   - Try to purchase (will use sandbox)

3. **Check Network:**
   - Ensure device has internet connection
   - RevenueCat needs to fetch offerings from their servers

4. **Re-initialize:**
   - Sometimes RevenueCat needs a fresh initialization
   - Try logging out and back in
   - Or reinstall the app

## Code Changes Made

Added detailed logging to help debug:
- `utils/revenueCat.js`: Enhanced `getAvailablePackages()` with detailed logs
- `screens/PremiumScreen.js`: Added logging when loading packages

The logs will show exactly what RevenueCat is returning and why packages might be missing.

