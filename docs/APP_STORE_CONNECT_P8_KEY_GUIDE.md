# How to Generate App Store Connect P8 Key (for RevenueCat)

## Step-by-Step Guide

### Step 1: Access App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Sign in with your Apple Developer account (the account that owns your app)

### Step 2: Navigate to Users and Access

1. Click on your **name/account** in the top right corner
2. Select **Users and Access** from the dropdown menu
   - Or go directly to: https://appstoreconnect.apple.com/access/users

### Step 3: Go to Keys Tab

1. In the left sidebar, click on **Keys** tab
2. You'll see a section for **App Store Connect API**

### Step 4: Generate a New Key

1. Click the **Generate API Key** button (or the **+** button)
2. Enter a **Key Name** (e.g., "RevenueCat MemoryLane" or "MemoryLane API Key")
3. Select **Access Level**: Choose **Admin** (required for in-app purchases)
4. Click **Generate**

### Step 5: Download the P8 Key

⚠️ **IMPORTANT**: You can only download the P8 key **ONCE** when it's first generated!

1. After generation, you'll see:
   - **Key ID** (e.g., `ABC123DEFG`) - **Copy this!**
   - **Issuer ID** (e.g., `57246542-96fe-1a63-e053-0824d0110`) - **Copy this!**
   - **Download** button for the `.p8` file - **Click to download!**

2. **Download the `.p8` file immediately** - you won't be able to download it again
3. Save it in a secure location (e.g., your project folder or a secure password manager)

### Step 6: File Naming

The downloaded file will be named something like:
- `AuthKey_ABC123DEFG.p8` (where `ABC123DEFG` is your Key ID)

**Note**: RevenueCat expects the file name format: `SubscriptionKey_XXXXXXXXXX.p8`

You can either:
- **Option A**: Rename the file to match RevenueCat's format (e.g., `SubscriptionKey_ABC123DEFG.p8`)
- **Option B**: Upload it as-is - RevenueCat will accept it

### Step 7: Upload to RevenueCat

1. Go back to RevenueCat dashboard
2. In the "New App Store app" form:
   - **P8 key file**: Upload the `.p8` file you just downloaded
   - **Key ID**: Paste the Key ID you copied (e.g., `ABC123DEFG`)
   - **Issuer ID**: Paste the Issuer ID you copied (e.g., `57246542-96fe-1a63-e053-0824d0110`)

## Important Notes

### ⚠️ Security Best Practices

1. **Never commit the P8 file to Git** - Add it to `.gitignore`:
   ```
   *.p8
   AuthKey_*.p8
   SubscriptionKey_*.p8
   ```

2. **Store securely**: Keep the P8 file in a secure location (password manager, encrypted storage)

3. **If you lose the P8 file**: You'll need to:
   - Revoke the old key in App Store Connect
   - Generate a new key
   - Update RevenueCat with the new key

### 🔑 What Each Field Does

- **P8 Key File**: Private key for authenticating API requests to App Store Connect
- **Key ID**: Identifier for your API key (visible in App Store Connect)
- **Issuer ID**: Your organization's unique identifier in App Store Connect

### 📝 Troubleshooting

**Q: I can't find the Keys section**
- Make sure you're logged in with an account that has Admin access
- The account must be part of the App Store Connect organization

**Q: I lost my P8 file**
- You cannot re-download it
- Revoke the old key and generate a new one
- Update RevenueCat with the new credentials

**Q: The file name doesn't match RevenueCat's format**
- That's okay! RevenueCat will accept any `.p8` file
- The important part is that it's a valid App Store Connect API key

**Q: Access Level options**
- **Admin**: Full access (required for in-app purchases) ✅ Use this
- **App Manager**: Limited access (may not work for IAP)
- **Developer**: Limited access (may not work for IAP)

## Quick Checklist

- [ ] Logged into App Store Connect
- [ ] Navigated to Users and Access → Keys
- [ ] Generated new API key with Admin access
- [ ] Downloaded the `.p8` file
- [ ] Copied Key ID
- [ ] Copied Issuer ID
- [ ] Uploaded all three to RevenueCat
- [ ] Added `.p8` files to `.gitignore`

## Next Steps After Uploading

1. RevenueCat will validate the key
2. Once validated, you can proceed to create products
3. Set up your subscription products in RevenueCat
4. Configure offerings

---

**Need Help?**
- App Store Connect Support: https://developer.apple.com/support/
- RevenueCat Docs: https://docs.revenuecat.com/docs/app-store-connect-api-key

