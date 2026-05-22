# RevenueCat Purchase Flow Explanation

## Restore Purchases vs. Purchase Flow

### 🔄 Restore Purchases (`restorePurchases`)

**What it does:**
- **Does NOT trigger payment** - No money is charged
- Checks with App Store/Google Play for existing purchases
- Restores subscriptions that were previously purchased
- Updates the app's subscription status

**When to use:**
- User reinstalled the app
- User switched devices
- User logged in on a new device
- App lost track of subscription status

**What the user sees:**
1. User taps "Restore Purchases" button
2. Brief loading indicator ("Restoring...")
3. One of two outcomes:
   - ✅ **Success Alert**: "Your subscription has been restored successfully!"
   - ❌ **No Purchases Alert**: "We couldn't find any active subscriptions to restore."

**No payment UI appears** - It's just a background check.

---

### 💳 Purchase Flow (`purchasePackage`)

**What it does:**
- **Triggers the actual payment flow**
- Shows native App Store/Google Play payment UI
- User enters payment method (if not saved)
- User confirms purchase
- Money is charged

**When to use:**
- User wants to buy a new subscription
- User taps on a subscription package (Monthly/Yearly)

**What the user sees:**

#### iOS (App Store):
1. User taps "Subscribe" button on a package
2. **Native iOS payment sheet appears** (system modal):
   - Shows subscription details
   - Price and billing period
   - "Subscribe" button at bottom
   - User can cancel or confirm
3. If user confirms:
   - Face ID/Touch ID authentication (if enabled)
   - Payment processes
   - Success confirmation
4. App shows: "🎉 Welcome to Premium!" alert

#### Android (Google Play):
1. User taps "Subscribe" button on a package
2. **Native Google Play payment UI appears**:
   - Shows subscription details
   - Price and billing period
   - Payment method selection
   - "Subscribe" button
3. If user confirms:
   - Payment processes
   - Success confirmation
4. App shows: "🎉 Welcome to Premium!" alert

---

## Visual Flow Comparison

### Restore Purchases Flow:
```
User taps "Restore Purchases"
    ↓
Loading spinner appears
    ↓
Background check with App Store/Play Store
    ↓
Alert appears (Success or No Purchases Found)
    ↓
Done (no payment UI)
```

### Purchase Flow:
```
User taps "Subscribe" on a package
    ↓
Native payment sheet/UI appears (iOS/Android)
    ↓
User reviews subscription details
    ↓
User confirms purchase
    ↓
Face ID/Touch ID (iOS) or payment processing
    ↓
Payment completes
    ↓
App shows success alert
    ↓
Subscription activated
```

---

## Code Flow

### Restore Purchases:
```javascript
// utils/revenueCat.js
export const restorePurchases = async () => {
  // Just checks existing purchases - NO payment UI
  const customerInfo = await Purchases.restorePurchases();
  // Returns subscription status
}
```

### Purchase:
```javascript
// utils/revenueCat.js
export const purchasePackage = async (packageToPurchase) => {
  // This triggers native payment UI
  const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
  // Payment UI appears here (native iOS/Android)
  // User confirms or cancels
  // Returns success/failure
}
```

---

## Summary

| Feature | Restore Purchases | Purchase Package |
|---------|------------------|------------------|
| Triggers Payment? | ❌ No | ✅ Yes |
| Shows Payment UI? | ❌ No | ✅ Yes (Native) |
| Charges Money? | ❌ No | ✅ Yes |
| Use Case | Recover existing subscription | Buy new subscription |
| User Action | Tap button → Wait → Alert | Tap button → Payment UI → Confirm → Alert |

---

## Current Implementation

In your app:
- **"Restore Purchases" button** → Calls `restorePurchases()` → No payment, just checks
- **"Subscribe" button on packages** → Calls `purchasePackage()` → Shows native payment UI

The payment UI is handled entirely by iOS/Android - you don't need to build it yourself!

