# RevenueCat Setup Guide for MemoryLane

## Step 1: Create RevenueCat Account

1. Go to https://www.revenuecat.com
2. Sign up for a free account
3. Create a new project called "MemoryLane"

## Step 2: Add Your Apps

### iOS Setup:
1. In RevenueCat dashboard, go to **Apps** → **Add App**
2. Select **iOS**
3. Enter your bundle ID: `com.kashish024.memorylane`
4. RevenueCat will provide an **iOS API Key** - copy this

### Android Setup:
1. In RevenueCat dashboard, go to **Apps** → **Add App**
2. Select **Android**
3. Enter your package name: `com.kashish024.memorylane`
4. RevenueCat will provide an **Android API Key** - copy this

## Step 3: Configure Products

1. Go to **Products** in RevenueCat dashboard
2. Create two products:

   **Product 1: Premium Monthly**
   - Product ID: `premium_monthly`
   - Type: Subscription
   - Price: $4.99/month (or your preferred price)

   **Product 2: Premium Yearly**
   - Product ID: `premium_yearly`
   - Type: Subscription
   - Price: $49.99/year (or your preferred price)

3. Create an **Entitlement** called `premium`
4. Attach both products to the `premium` entitlement

## Step 4: Create Offerings

1. Go to **Offerings** in RevenueCat dashboard
2. Create a new offering called "default"
3. Add both packages:
   - `premium_monthly` package
   - `premium_yearly` package
4. Set "default" as the current offering

## Step 5: Add API Keys to Your App

### Option A: Using .env file (Recommended)

Create or update `.env` file in project root:

```env
REVENUECAT_API_KEY_IOS=your_ios_api_key_here
REVENUECAT_API_KEY_ANDROID=your_android_api_key_here
```

### Option B: Using app.config.js

Add to `app.config.js` extra section (already configured):

```javascript
extra: {
  REVENUECAT_API_KEY_IOS: process.env.REVENUECAT_API_KEY_IOS,
  REVENUECAT_API_KEY_ANDROID: process.env.REVENUECAT_API_KEY_ANDROID,
}
```

## Step 6: Test the Integration

### For iOS:
1. Use a sandbox tester account in App Store Connect
2. Build and run on a physical device or simulator
3. Test purchases will use sandbox mode

### For Android:
1. Add test accounts in Google Play Console
2. Build and run on a device
3. Test purchases will use test mode

## Step 7: Webhook Setup (Optional but Recommended)

RevenueCat can automatically update Firestore when subscriptions change:

1. Go to **Project Settings** → **Webhooks**
2. Add webhook URL (you'll need a Firebase Function for this)
3. Or use RevenueCat's Firestore integration

## Testing

### Test Purchase Flow:
1. Open Premium screen
2. Tap on a subscription package
3. Complete test purchase
4. Verify subscription status updates in app

### Test Restore:
1. Tap "Restore Purchases"
2. Verify existing subscriptions are restored

## Troubleshooting

### "RevenueCat API key not configured"
- Make sure you've added API keys to `.env` or `app.config.js`
- Restart Expo dev server after adding keys

### "No packages found"
- Verify offerings are created in RevenueCat dashboard
- Make sure "default" offering is set as current
- Check that products are attached to the offering

### Purchases not working
- Check that you're using test accounts (iOS sandbox / Android test)
- Verify products are approved in App Store Connect / Google Play Console
- Check RevenueCat dashboard for error logs

## Next Steps

1. Set up App Store Connect products (for iOS)
2. Set up Google Play Console products (for Android)
3. Submit app for review with in-app purchases
4. Configure webhooks for automatic subscription sync

## Support

- RevenueCat Docs: https://docs.revenuecat.com
- RevenueCat Support: support@revenuecat.com

