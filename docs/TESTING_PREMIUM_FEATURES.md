# Testing Premium Features Guide

This guide explains how to test your app as a premium member without making actual purchases.

## Method 1: Using the Testing Section in Settings (Easiest) ⭐

I've added a testing section to your Settings screen that only appears in development mode.

### Steps:
1. Open the **Settings** screen in your app
2. Scroll to the bottom - you'll see a yellow "🧪 Testing Mode" section
3. Click **"Enable Premium"** to become a premium member
4. Click **"Disable Premium"** to revert back to free tier

**Note:** This section only appears when `__DEV__` is true (development mode). It will automatically be hidden in production builds.

---

## Method 2: Direct Firestore Update (Manual)

You can manually update your subscription tier in Firebase Console:

### Steps:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `memorylane-51c8e`
3. Navigate to **Firestore Database**
4. Find the `users` collection
5. Open your user document (your user ID)
6. Add or update the field:
   - **Field name:** `subscriptionTier`
   - **Field value:** `premium` (or `free` to disable)
7. Save the document
8. Restart your app or navigate away and back to Settings

---

## Method 3: Using Code (Programmatic)

You can call the testing function directly in your code:

```javascript
import { togglePremiumForTesting } from './utils/testPremium';

// Enable premium
await togglePremiumForTesting(true);

// Disable premium
await togglePremiumForTesting(false);
```

---

## Method 4: RevenueCat Sandbox Testing (For Real Purchase Flow)

If you want to test the actual purchase flow with RevenueCat:

### iOS:
1. Create a **Sandbox Tester** account in App Store Connect
2. Sign out of your Apple ID on your device
3. When prompted during purchase, sign in with the sandbox account
4. The purchase will be free and won't charge your real account

### Android:
1. Add test accounts in Google Play Console
2. Add your email to the testers list
3. Purchases will be free for test accounts

**Note:** This requires your RevenueCat products to be set up in App Store Connect/Google Play Console.

---

## What Premium Features Can You Test?

Once you enable premium, you can test:

✅ **Unlimited Children** - Add more than 1 child
✅ **Unlimited Memories** - Create more than 20 memories per child per month
✅ **Unlimited Storage** - Upload more than 50MB of photos/audio
✅ **Add Contributors** - Invite family members to contribute
✅ **Auto Monthly Summaries** - Enable automatic email summaries
✅ **Auto Backup** - Enable weekly automatic backups
✅ **Photo Avatars** - Upload photos for child profiles instead of emojis

---

## Verifying Premium Status

To verify your premium status is working:

1. Go to **Settings** screen
2. Check if the "Upgrade to Premium" card is hidden
3. Try adding a second child - it should work without showing upgrade prompts
4. Try uploading a photo for a child avatar - the option should be available
5. Check the Premium screen - it should show you as a premium member

---

## Important Notes

⚠️ **Remove Testing Code Before Production:**
- The testing section in Settings uses `__DEV__` check, so it won't appear in production
- However, you may want to remove the `utils/testPremium.js` file or add additional checks
- Consider adding environment variable checks for extra security

⚠️ **Firestore Security:**
- Make sure your Firestore security rules allow users to update their own `subscriptionTier` field if you want to keep the testing utility
- Or restrict it to admin users only

---

## Troubleshooting

**Premium status not updating?**
- Try navigating away from Settings and back
- Or restart the app completely
- Check Firestore to verify the `subscriptionTier` field is set correctly

**Testing section not showing?**
- Make sure you're running in development mode (`__DEV__` is true)
- Check that the import is correct in SettingsScreen.js

**Features still showing as locked?**
- Some features check premium status on load - try navigating away and back
- Check the console for any errors
- Verify the `subscriptionTier` field in Firestore is exactly `"premium"` (lowercase)

---

## Quick Test Checklist

- [ ] Enable premium via Settings testing section
- [ ] Verify "Upgrade to Premium" card disappears
- [ ] Add a second child (should work)
- [ ] Upload a photo avatar for a child (should work)
- [ ] Create more than 20 memories in a month (should work)
- [ ] Enable Auto Backup toggle (should work)
- [ ] Try to add a contributor (should work)
- [ ] Disable premium and verify features are locked again

---

Happy Testing! 🎉

