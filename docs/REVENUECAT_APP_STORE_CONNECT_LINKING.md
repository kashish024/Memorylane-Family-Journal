# Fix: RevenueCat Cannot Fetch Products from App Store Connect

## Error Message
```
[RevenueCat] 🍎‼️ Error fetching offerings - The operation couldn't be completed. 
(RevenueCat.OfferingsManager.Error error 1.)

There's a problem with your configuration. None of the products registered in the 
RevenueCat dashboard could be fetched from App Store Connect (or the StoreKit Configuration 
file if one is being used).
```

## What This Means

RevenueCat has your products registered (`premium_monthly`, `premium_yearly`), but it **cannot fetch them from App Store Connect**. This usually means:

1. **Products not linked** between RevenueCat and App Store Connect
2. **Subscriptions don't exist** in App Store Connect
3. **Subscriptions not approved** or in wrong status
4. **Bundle ID mismatch** between RevenueCat and App Store Connect
5. **Product identifiers don't match** exactly

---

## Step-by-Step Fix

### Step 1: Verify Bundle ID Matches

**Check RevenueCat:**
1. Go to RevenueCat Dashboard → Project Settings
2. Note the Bundle ID (should be: `com.kashish024.memorylane`)

**Check App Store Connect:**
1. Go to App Store Connect → Your App → App Information
2. Verify Bundle ID matches: `com.kashish024.memorylane`

**If they don't match:**
- Update RevenueCat project settings to match App Store Connect
- OR update App Store Connect to match RevenueCat

---

### Step 2: Create Subscriptions in App Store Connect

**If subscriptions don't exist:**

1. **Go to App Store Connect:**
   - https://appstoreconnect.apple.com
   - Select your app: MemoryLane

2. **Navigate to Subscriptions:**
   - Click "Subscriptions" in the left sidebar
   - Click the "+" button to create a new subscription group

3. **Create Subscription Group:**
   - Name: "Premium" (or any name)
   - Click "Create"

4. **Create Monthly Subscription:**
   - Click "+" in the subscription group
   - **Reference Name:** Premium Monthly
   - **Product ID:** `premium_monthly` ⚠️ **Must match exactly!**
   - **Subscription Duration:** 1 Month
   - **Price:** Set your price
   - Click "Create"

5. **Create Yearly Subscription:**
   - Click "+" in the subscription group
   - **Reference Name:** Premium Yearly
   - **Product ID:** `premium_yearly` ⚠️ **Must match exactly!**
   - **Subscription Duration:** 1 Year
   - **Price:** Set your price
   - Click "Create"

6. **Submit for Review:**
   - For TestFlight: Subscriptions can be in "Ready to Submit" status
   - For App Store: Must be "Approved"
   - Click "Submit for Review" for each subscription

---

### Step 3: Link Products in RevenueCat Dashboard

**This is the critical step that's likely missing:**

1. **Go to RevenueCat Dashboard:**
   - https://app.revenuecat.com
   - Select your project

2. **Navigate to Products:**
   - Click "Products" in the left sidebar
   - You should see: `premium_monthly` and `premium_yearly`

3. **Link `premium_monthly`:**
   - Click on `premium_monthly`
   - Scroll to "Store Products" section
   - Click "Link Product" or "+" button
   - Select your App Store Connect subscription: `premium_monthly`
   - **Verify the Product ID matches exactly:** `premium_monthly`
   - Click "Link" or "Save"

4. **Link `premium_yearly`:**
   - Click on `premium_yearly`
   - Scroll to "Store Products" section
   - Click "Link Product" or "+" button
   - Select your App Store Connect subscription: `premium_yearly`
   - **Verify the Product ID matches exactly:** `premium_yearly`
   - Click "Link" or "Save"

---

### Step 4: Verify Offering Configuration

1. **Go to RevenueCat Dashboard → Offerings**

2. **Check Current Offering:**
   - Ensure an offering exists
   - Ensure it's set as "Current" (there's a toggle/button)

3. **Verify Packages:**
   - Click on your current offering
   - You should see packages attached:
     - `$rc_monthly` (or custom name) → linked to `premium_monthly`
     - `$rc_annual` (or custom name) → linked to `premium_yearly`

4. **If packages are missing:**
   - Click "Add Package" or "Attach Products"
   - Attach both `premium_monthly` and `premium_yearly`
   - Save the offering

---

### Step 5: Verify Product Identifiers Match Exactly

**Critical:** Product IDs must match **exactly** (case-sensitive) in:
- RevenueCat Dashboard → Products → Product ID
- App Store Connect → Subscriptions → Product ID
- Your code (if you reference them)

**Your Product IDs should be:**
- `premium_monthly` (not `Premium_Monthly` or `premium-monthly`)
- `premium_yearly` (not `Premium_Yearly` or `premium-yearly`)

---

### Step 6: Check Subscription Status in App Store Connect

**For TestFlight:**
- Subscriptions can be in "Ready to Submit" status
- They don't need to be approved yet

**For App Store:**
- Subscriptions must be "Approved" or "Ready for Sale"

**To check:**
1. App Store Connect → Your App → Subscriptions
2. Check the status of each subscription
3. If not approved, submit for review

---

### Step 7: Wait for Propagation

After linking products:
- **Wait 5-10 minutes** for changes to propagate
- RevenueCat needs to sync with App Store Connect
- Sometimes it takes up to 30 minutes

---

### Step 8: Test Again

1. **Rebuild the app** (if you made bundle ID changes)
2. **Install from TestFlight**
3. **Navigate to Premium Screen**
4. **Check console logs:**
   - Should see: `📦 Offerings received: { hasCurrent: true, availablePackagesCount: 2 }`
   - Should see: `✅ Found 2 packages`

---

## Verification Checklist

Use this checklist to ensure everything is configured correctly:

### App Store Connect
- [ ] Bundle ID matches: `com.kashish024.memorylane`
- [ ] Subscription group created
- [ ] `premium_monthly` subscription exists
- [ ] `premium_yearly` subscription exists
- [ ] Product IDs match exactly: `premium_monthly` and `premium_yearly`
- [ ] Subscriptions are in "Ready to Submit" or "Approved" status

### RevenueCat Dashboard
- [ ] Bundle ID matches: `com.kashish024.memorylane`
- [ ] Product `premium_monthly` exists
- [ ] Product `premium_yearly` exists
- [ ] `premium_monthly` is **linked** to App Store Connect subscription
- [ ] `premium_yearly` is **linked** to App Store Connect subscription
- [ ] Offering exists and is set as "Current"
- [ ] Offering has packages attached (both monthly and yearly)

### Code
- [ ] Production API key (`appl_...`) in EAS secrets
- [ ] App rebuilt after configuration changes

---

## Common Mistakes

### ❌ Product IDs Don't Match
- RevenueCat: `premium_monthly`
- App Store Connect: `Premium_Monthly` (wrong case)
- **Fix:** Make them match exactly

### ❌ Products Not Linked
- Products exist in both places but aren't linked
- **Fix:** Go to RevenueCat → Products → Link Product

### ❌ Wrong Bundle ID
- RevenueCat: `com.kashish024.memorylane`
- App Store Connect: `com.kashish024.MemoryLane` (wrong case)
- **Fix:** Update to match exactly

### ❌ Subscriptions Not Created
- Products in RevenueCat but no subscriptions in App Store Connect
- **Fix:** Create subscriptions in App Store Connect first

### ❌ Subscriptions in Wrong Status
- Subscriptions exist but are "Removed from Sale"
- **Fix:** Set status to "Ready to Submit" or "Approved"

---

## Still Not Working?

### 1. Check RevenueCat Dashboard Logs
- Go to RevenueCat Dashboard → Project Settings → Debug Logs
- Look for errors related to App Store Connect

### 2. Verify API Key
- Ensure you're using the **production** API key (`appl_...`)
- Check EAS secrets: `eas secret:list`

### 3. Test with Sandbox Account
- Create a sandbox tester in App Store Connect
- Sign out of your real Apple ID
- Try to purchase (will use sandbox)

### 4. Contact RevenueCat Support
- If everything looks correct but still not working
- RevenueCat support can check their side

---

## Quick Reference: Product IDs

**Your app uses these product identifiers:**
- Monthly: `premium_monthly`
- Yearly: `premium_yearly`

**These must match exactly in:**
- RevenueCat Dashboard → Products
- App Store Connect → Subscriptions
- RevenueCat → Products → Store Products (linked)

---

## Next Steps After Fixing

1. **Wait 5-10 minutes** for propagation
2. **Rebuild app** if you changed bundle ID
3. **Test in TestFlight**
4. **Check console logs** for success messages
5. **Verify packages appear** in Premium Screen

---

## Additional Resources

- [RevenueCat: Why Are Offerings Empty?](https://rev.cat/why-are-offerings-empty)
- [RevenueCat: Linking App Store Products](https://docs.revenuecat.com/docs/entitlements)
- [App Store Connect: Creating Subscriptions](https://developer.apple.com/app-store/subscriptions/)

