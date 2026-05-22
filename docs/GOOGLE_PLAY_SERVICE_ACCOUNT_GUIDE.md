# How to Get Google Play Service Account Credentials

## Overview

RevenueCat needs a **Service Account JSON file** to validate Android in-app purchases. This is similar to the P8 key for iOS, but for Android/Google Play.

## Step-by-Step Guide

### Step 1: Access Google Play Console

1. Go to https://play.google.com/console
2. Sign in with your Google account (the one that owns your app)
3. Select your app (or create one if you haven't yet)

### Step 2: Navigate to Setup → API Access

1. In the left sidebar, click **Setup** (or **Settings**)
2. Click **API access** (under "Services & APIs" section)
3. You'll see a page showing "Service accounts" and "OAuth clients"

### Step 3: Create or Use Existing Service Account

**Option A: If you see an existing service account:**
- You can use it, but you'll need to download the JSON key
- Skip to Step 5

**Option B: Create a new service account (Recommended):**

1. Scroll to the **"Service accounts"** section
2. Click **Create new service account** (or **Link service account**)
3. A dialog will open with instructions
4. Click **Google Cloud Platform** link (opens in new tab)

### Step 4: Create Service Account in Google Cloud Console

1. **In the new Google Cloud Console tab:**
   - You'll be taken to Google Cloud Platform
   - If prompted, select or create a project

2. **Navigate to Service Accounts:**
   - In the left sidebar, go to **IAM & Admin** → **Service Accounts**
   - Or go directly to: https://console.cloud.google.com/iam-admin/serviceaccounts

3. **Create Service Account:**
   - Click **+ CREATE SERVICE ACCOUNT** (top of page)
   - **Service account name**: Enter something like "RevenueCat MemoryLane" or "MemoryLane API"
   - **Service account ID**: Auto-generated (you can change it)
   - Click **CREATE AND CONTINUE**

4. **Grant Access (Optional but Recommended):**
   - **Role**: Select **Editor** or **Viewer** (Editor gives more permissions)
   - Click **CONTINUE**
   - Click **DONE**

5. **Create and Download JSON Key:**
   - You'll be back at the Service Accounts list
   - Find your newly created service account
   - Click on the service account name
   - Go to the **KEYS** tab
   - Click **ADD KEY** → **Create new key**
   - Select **JSON** format
   - Click **CREATE**
   - **The JSON file will automatically download** ⬇️
   - **SAVE THIS FILE SECURELY** - you can't download it again!

### Step 5: Link Service Account to Google Play Console

1. **Go back to Google Play Console** (the original tab)
2. In **Setup → API access**, you should see your service account listed
3. If not, click **Link service account** and select the one you created
4. **Grant Access:**
   - Click **Grant access** next to your service account
   - You'll see permissions for your app
   - Make sure it has access to your app
   - Click **Invite user** or **Grant access**

### Step 6: Enable API Access

1. Still in **Setup → API access**
2. Make sure **Google Play Android Developer API** is enabled
3. If not, click **Enable** or follow the prompts

### Step 7: Upload JSON to RevenueCat

1. **Go back to RevenueCat** (where you're setting up Android app)
2. In the **"Service Account Credentials JSON"** section:
   - Click the upload area or drag and drop
   - Select the JSON file you downloaded (e.g., `your-project-xxxxx-xxxxx.json`)
3. RevenueCat will validate the credentials

## What the JSON File Looks Like

The downloaded JSON file will contain something like:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Important Notes

### ⚠️ Security

1. **Never commit the JSON file to Git** - It's already in your `.gitignore` (`.p8`, `.key` files are ignored)
2. **Store securely** - Keep it in a password manager or secure location
3. **If you lose it** - You'll need to create a new service account and key

### 🔑 Permissions

The service account needs access to:
- **View financial data** (for RevenueCat to validate purchases)
- **View app information** (to link to your app)

### 📝 Troubleshooting

**Q: I don't see "API access" in Google Play Console**
- Make sure you're the owner or have admin access
- Some accounts may need to enable it first
- Try: **Settings** → **API access**

**Q: The JSON file won't upload to RevenueCat**
- Make sure it's a valid JSON file (not corrupted)
- Check that the file extension is `.json`
- Try downloading it again if it seems corrupted

**Q: RevenueCat says "Invalid credentials"**
- Make sure the service account is linked to your Google Play app
- Verify the service account has the correct permissions
- Check that Google Play Android Developer API is enabled

**Q: I can't find my downloaded JSON file**
- Check your Downloads folder
- The filename will be something like: `your-project-xxxxx-xxxxx.json`
- If lost, create a new key (you can have multiple keys per service account)

## Quick Checklist

- [ ] Logged into Google Play Console
- [ ] Navigated to Setup → API access
- [ ] Created service account in Google Cloud Console
- [ ] Downloaded JSON key file
- [ ] Linked service account to Google Play Console
- [ ] Granted access to the service account
- [ ] Enabled Google Play Android Developer API
- [ ] Uploaded JSON to RevenueCat
- [ ] Added JSON file to secure storage (not in Git)

## Alternative: If You Already Have a Service Account

If you've set up Google Play API access before:
1. Go to **Google Cloud Console** → **IAM & Admin** → **Service Accounts**
2. Find your existing service account
3. Go to **KEYS** tab
4. Click **ADD KEY** → **Create new key** → **JSON**
5. Download and use this JSON file

---

**Need Help?**
- Google Play Console Help: https://support.google.com/googleplay/android-developer
- RevenueCat Android Setup: https://docs.revenuecat.com/docs/google-play-setup

