# Complete Subscription Setup Guide: App Store Connect → RevenueCat

## Overview

You need to set up subscriptions in **both** App Store Connect (for iOS) and RevenueCat. Here's the correct order:

1. ✅ **App Store Connect** - Create subscription products (this is where Apple manages the actual subscriptions)
2. ✅ **RevenueCat** - Link to App Store products and configure offerings
3. ✅ **Test** - Verify everything works

---

## Step 1: App Store Connect Setup (iOS)

### 1.1 Create Subscription Group

1. Go to **App Store Connect**: https://appstoreconnect.apple.com
2. Select your app: **MemoryLane**
3. Go to **Features** → **In-App Purchases**
4. Click **+** to create a new subscription group
5. Name it: **"Premium Subscription"** or **"MemoryLane Premium"**
6. Click **Create**

### 1.2 Create Monthly Subscription

1. In your subscription group, click **+** to add subscription
2. **Reference Name**: `Premium Monthly`
3. **Product ID**: `premium_monthly` (must match what you use in RevenueCat)
4. **Subscription Duration**: 1 Month
5. Click **Create**

6. **Configure Subscription Details**:
   - **Display Name**: "Premium Monthly"
   - **Description**: "Unlock unlimited memories, children, and premium features"
   - **Price**: Set your price (e.g., $4.99/month)
   - **Review Information**: Add screenshots and description for App Review

7. **Localization**: Add details for each country/region
8. Click **Save**

### 1.3 Create Yearly Subscription

1. In the same subscription group, click **+** again
2. **Reference Name**: `Premium Yearly`
3. **Product ID**: `premium_yearly` (must match RevenueCat)
4. **Subscription Duration**: 1 Year
5. Click **Create**

6. **Configure Subscription Details**:
   - **Display Name**: "Premium Yearly"
   - **Description**: "Unlock unlimited memories, children, and premium features"
   - **Price**: Set your price (e.g., $49.99/year)
   - Make sure it's cheaper than 12x monthly price

7. **Localization**: Add details for each country/region
8. Click **Save**

### 1.4 Submit for Review (Important!)

1. Both subscriptions need to be **submitted for App Review**
2. Go to **App Store** → **Your App** → **In-App Purchases**
3. Select each subscription
4. Click **Submit for Review**
5. Add any required information
6. Submit

**Note**: Subscriptions must be approved by Apple before they can be used in production. For testing, you can use sandbox accounts.

---

## Step 2: RevenueCat Setup

### 2.1 Create Entitlement

1. Go to **RevenueCat Dashboard**: https://app.revenuecat.com
2. Select your project: **MemoryLane**
3. Go to **Entitlements** tab
4. Click **+ New** or **Create Entitlement**
5. **Identifier**: `premium`
6. **Display Name**: "Premium"
7. Click **Create**

### 2.2 Create Products in RevenueCat

#### Monthly Product:

1. Go to **Products** tab
2. Click **New product**
3. **Product Identifier**: `premium_monthly` (must match App Store Connect)
4. **Type**: Subscription
5. **Store**: App Store
6. **App**: Select "MemoryLane (App Store)"
7. Click **Create**

8. **Attach to Entitlement**:
   - Click on the product
   - Under **Entitlements**, click **Attach**
   - Select **"premium"** entitlement
   - Click **Attach**

#### Yearly Product:

1. Click **New product** again
2. **Product Identifier**: `premium_yearly` (must match App Store Connect)
3. **Type**: Subscription
4. **Store**: App Store
5. **App**: Select "MemoryLane (App Store)"
6. Click **Create**

7. **Attach to Entitlement**:
   - Click on the product
   - Under **Entitlements**, click **Attach**
   - Select **"premium"** entitlement
   - Click **Attach**

### 2.3 Create Offering

1. Go to **Offerings** tab
2. Click **+ New Offering** or **Create Offering**
3. **Identifier**: `default` (or any name you prefer)
4. **Display Name**: "Premium Plans"
5. Click **Create**

6. **Add Packages**:
   - Click **+ Add Package**
   - **Package Identifier**: `monthly` (or `\$rc_monthly`)
   - **Product**: Select "premium_monthly"
   - Click **Add**

   - Click **+ Add Package** again
   - **Package Identifier**: `yearly` (or `\$rc_yearly`)
   - **Product**: Select "premium_yearly"
   - Click **Add**

7. **Set as Current Offering**:
   - Toggle **"Set as current offering"** to ON
   - This makes it the default offering that your app will fetch

8. Click **Save**

---

## Step 3: Verify Setup

### Check App Store Connect:
- ✅ Subscription group created
- ✅ `premium_monthly` product created and submitted
- ✅ `premium_yearly` product created and submitted
- ✅ Both have prices set

### Check RevenueCat:
- ✅ `premium` entitlement created
- ✅ `premium_monthly` product linked to App Store
- ✅ `premium_yearly` product linked to App Store
- ✅ Both products attached to `premium` entitlement
- ✅ Offering created with both packages
- ✅ Offering set as "current"

---

## Step 4: Testing

### Test in Sandbox Mode:

1. **Create Sandbox Tester**:
   - App Store Connect → **Users and Access** → **Sandbox Testers**
   - Create a test account (use a different email than your real account)

2. **Test in App**:
   - Sign out of your real Apple ID on the device
   - Open your app
   - Try to purchase (will use sandbox)
   - Sign in with sandbox tester account when prompted

3. **Verify**:
   - Purchase should complete
   - App should show premium status
   - RevenueCat dashboard should show the purchase

---

## Common Issues & Solutions

### Issue: "Missing Metadata" in RevenueCat
**Solution**: 
- Make sure the product exists in App Store Connect
- Make sure the Product ID matches exactly
- Wait a few minutes for RevenueCat to sync with App Store

### Issue: Products not showing in app
**Solution**:
- Check that offering is set as "current"
- Verify API keys are correct in `.env`
- Make sure RevenueCat is initialized in app
- Check console logs for errors

### Issue: "Product not available"
**Solution**:
- Ensure subscription is submitted for review in App Store Connect
- For testing, use sandbox accounts
- Check that product IDs match exactly

### Issue: Can't attach entitlement
**Solution**:
- Make sure entitlement is created first
- Refresh the page
- Check that product type is "Subscription"

---

## Product ID Reference

Make sure these match **exactly** in both places:

| Location | Monthly | Yearly |
|----------|--------|--------|
| **App Store Connect** | `premium_monthly` | `premium_yearly` |
| **RevenueCat Product** | `premium_monthly` | `premium_yearly` |
| **Your Code** | `premium_monthly` | `premium_yearly` |

---

## Next Steps After Setup

1. ✅ Add RevenueCat API keys to `.env`
2. ✅ Restart your app
3. ✅ Test purchases with sandbox account
4. ✅ Verify subscription status updates
5. ✅ Test restore purchases
6. ✅ Submit app for review (with subscriptions)

---

## Quick Checklist

### App Store Connect:
- [ ] Subscription group created
- [ ] Monthly subscription created (`premium_monthly`)
- [ ] Yearly subscription created (`premium_yearly`)
- [ ] Both subscriptions submitted for review
- [ ] Prices configured

### RevenueCat:
- [ ] Entitlement created (`premium`)
- [ ] Monthly product created and linked
- [ ] Yearly product created and linked
- [ ] Both products attached to entitlement
- [ ] Offering created with both packages
- [ ] Offering set as current

### App:
- [ ] API keys added to `.env`
- [ ] App restarted
- [ ] Packages loading correctly
- [ ] Subscribe buttons visible
- [ ] Test purchase works

---

**Need Help?**
- App Store Connect Help: https://help.apple.com/app-store-connect/
- RevenueCat Docs: https://docs.revenuecat.com/docs/ios-products

