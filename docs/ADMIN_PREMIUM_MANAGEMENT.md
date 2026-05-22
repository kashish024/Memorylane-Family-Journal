# Admin Guide: Managing User Premium Status

This guide explains how to enable/disable premium for users from the backend.

## Method 1: Using the Admin Script (Recommended)

### Setup

1. **Install Firebase Admin SDK:**
   ```bash
   npm install firebase-admin
   ```

2. **Get Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** > **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file as `serviceAccountKey.json` in your project root
   - **⚠️ IMPORTANT:** Add `serviceAccountKey.json` to `.gitignore` to keep it secure!

3. **Update the script:**
   - Open `scripts/admin-manage-premium.js`
   - Uncomment and update the service account initialization:
   ```javascript
   const serviceAccount = require('./serviceAccountKey.json');
   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });
   ```

### Usage

```bash
# Enable premium for a user
node scripts/admin-manage-premium.js <userId> enable

# Disable premium for a user
node scripts/admin-manage-premium.js <userId> disable

# Check premium status
node scripts/admin-manage-premium.js <userId> status
```

### Examples

```bash
# Enable premium for user abc123
node scripts/admin-manage-premium.js abc123 enable

# Disable premium for user xyz789
node scripts/admin-manage-premium.js xyz789 disable

# Check status for user abc123
node scripts/admin-manage-premium.js abc123 status
```

---

## Method 2: Using Firebase Console (Quick Manual Method)

### Steps

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Open the `users` collection
5. Find the user document (by user ID)
6. Click on the document to edit
7. Update the following fields:
   - Set `subscriptionTier` to `"premium"` to enable premium, or `"free"` to disable
   - **IMPORTANT:** Add a new field `preventAutoSync` and set it to `true` (boolean) - This prevents RevenueCat from overriding your manual setting
8. Optionally clear trial data:
   - Set `trialUsed` to `false`
   - Set `trialStartDate` to `null`
   - Set `trialEndDate` to `null`
9. Click **Update**

### How to Add the `preventAutoSync` Field in Firebase Console

**Step-by-step with screenshots:**

1. **Open the user document** in Firestore Database
2. **Click "Add field"** button (usually at the bottom of the document fields)
3. **Field name:** Type `preventAutoSync` (exactly as shown, case-sensitive)
4. **Field type:** Select `boolean` from the dropdown
5. **Field value:** Select `true` (checkbox or toggle)
6. **Click "Update"** to save

**Visual Guide:**
```
┌─────────────────────────────────────┐
│ users/{userId}                       │
├─────────────────────────────────────┤
│ subscriptionTier: "free"             │
│ trialUsed: false                     │
│ ...                                  │
│                                      │
│ [+ Add field]  ← Click here          │
│                                      │
│ Field name: preventAutoSync          │
│ Type: [boolean ▼]                    │
│ Value: [✓] true                      │
│                                      │
│ [Update]                             │
└─────────────────────────────────────┘
```

**⚠️ Important:** Without setting `preventAutoSync: true`, RevenueCat will automatically sync and override your manual setting when the user logs in!

### Finding User ID

- User ID is the document ID in the `users` collection
- You can also find it in the app's authentication section
- Or ask the user to check their account settings

---

## Method 3: Using Firebase Cloud Functions (For Production)

For production, you might want to create a Cloud Function that can be called via HTTP or triggered by events.

### Example Cloud Function

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.managePremium = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { userId, action } = data;
  
  const userRef = admin.firestore().collection('users').doc(userId);
  
  if (action === 'enable') {
    await userRef.update({
      subscriptionTier: 'premium',
      premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      premiumUpdatedBy: context.auth.uid,
      trialUsed: false,
      trialStartDate: null,
      trialEndDate: null,
    });
    return { success: true, message: 'Premium enabled' };
  } else if (action === 'disable') {
    await userRef.update({
      subscriptionTier: 'free',
      premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      premiumUpdatedBy: context.auth.uid,
      trialUsed: false,
      trialStartDate: null,
      trialEndDate: null,
    });
    return { success: true, message: 'Premium disabled' };
  }
  
  throw new functions.https.HttpsError('invalid-argument', 'Invalid action');
});
```

---

## Method 4: Using Firebase Admin SDK in Your Own Script

You can also use the exported functions from the admin script in your own Node.js scripts:

```javascript
const { enablePremium, disablePremium, checkStatus } = require('./scripts/admin-manage-premium');

// Enable premium
await enablePremium('user123');

// Disable premium
await disablePremium('user123');

// Check status
const status = await checkStatus('user123');
console.log(status);
```

---

## Important Notes

1. **Prevent Auto-Sync Flag:** When manually setting premium status, the `preventAutoSync: true` flag is automatically set. This prevents RevenueCat from overriding your manual setting when the user logs in. 
   - **To re-enable auto-sync:** Set `preventAutoSync` to `false` or remove the field
   - **When to use:** Always set this flag when manually managing premium (refunds, comps, etc.)
   - **When NOT to use:** If you want RevenueCat to manage the subscription automatically

2. **Trial Data:** When disabling premium, trial data is automatically cleared to prevent the trial from overriding the free tier.

3. **RevenueCat Sync:** If a user has an active RevenueCat subscription, you may also need to:
   - Cancel their subscription in RevenueCat dashboard
   - Or set `preventAutoSync: true` to prevent RevenueCat from re-enabling premium

4. **User Experience:** After updating premium status:
   - The user may need to restart the app
   - Or wait for the app to refresh subscription status
   - Changes are reflected immediately in Firestore

5. **Security:** 
   - Never commit `serviceAccountKey.json` to version control
   - Use environment variables in production
   - Restrict access to admin scripts

---

## Troubleshooting

### "User does not exist"
- Verify the user ID is correct
- Check that the user has logged in at least once (creates the user document)

### "Permission denied"
- Ensure you're using Firebase Admin SDK (not client SDK)
- Verify service account has proper permissions
- Check Firestore security rules allow admin access

### Changes not reflecting in app
- User may need to restart the app
- Check if app is checking subscription status correctly
- Verify `getSubscriptionTier()` is being called

### Premium status reverts after login
- **Cause:** RevenueCat is syncing and overriding your manual setting
- **Solution:** Make sure `preventAutoSync: true` is set in the user document
- **Check:** In Firebase Console, verify the user document has `preventAutoSync: true`
- **Note:** If you want RevenueCat to manage subscriptions automatically, set `preventAutoSync: false` or remove the field

---

## Common Use Cases

### Refund a User
```bash
node scripts/admin-manage-premium.js <userId> disable
```

### Comp a User (Give Free Premium)
```bash
node scripts/admin-manage-premium.js <userId> enable
```

### Check if User Has Premium
```bash
node scripts/admin-manage-premium.js <userId> status
```

### Bulk Operations
Create a script that reads user IDs from a file and processes them:

```javascript
const { enablePremium } = require('./scripts/admin-manage-premium');
const userIds = ['user1', 'user2', 'user3'];

for (const userId of userIds) {
  await enablePremium(userId);
  console.log(`Enabled premium for ${userId}`);
}
```

