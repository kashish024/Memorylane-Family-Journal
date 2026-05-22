# EAS Secrets Setup Guide

## Overview
EAS (Expo Application Services) requires environment variables to be set as secrets for production builds. The `.env` file is **NOT** included in production builds, so all API keys must be configured as EAS secrets.

## Required API Keys

Based on your `app.config.js`, the following environment variables need to be set as EAS secrets:

1. **RESEND_API_KEY** - For sending emails (monthly summaries, invitations)
2. **REVENUECAT_API_KEY_IOS** - For iOS in-app purchases
3. **REVENUECAT_API_KEY_ANDROID** - For Android in-app purchases (optional if iOS only)
4. **OPENAI_API_KEY** - For AI transcription and monthly summaries

## Setting Up EAS Secrets

### Method 1: Using EAS CLI (Recommended)

Run these commands in your terminal:

```bash
# Set Resend API key
eas secret:create --scope project --name RESEND_API_KEY --value "your_resend_api_key_here"

# Set OpenAI API key
eas secret:create --scope project --name OPENAI_API_KEY --value "your_openai_api_key_here"

# Set RevenueCat iOS API key
eas secret:create --scope project --name REVENUECAT_API_KEY_IOS --value "your_revenuecat_ios_key_here"

# Set RevenueCat Android API key (optional)
eas secret:create --scope project --name REVENUECAT_API_KEY_ANDROID --value "your_revenuecat_android_key_here"
```

### Method 2: Using EAS Dashboard

1. Go to https://expo.dev/accounts/[your-account]/projects/memorylane/secrets
2. Click "Create Secret"
3. Enter the secret name (e.g., `RESEND_API_KEY`)
4. Enter the secret value
5. Click "Create"

## Verifying Secrets

To list all configured secrets:

```bash
eas secret:list
```

This will show all secrets configured for your project.

## Important Notes

1. **Secrets are scoped to your project** - They apply to all builds for this project
2. **Secrets are encrypted** - They're stored securely and only available during builds
3. **Secrets are case-sensitive** - Make sure the names match exactly (e.g., `RESEND_API_KEY` not `resend_api_key`)
4. **Update secrets** - If you need to update a secret, delete the old one and create a new one:
   ```bash
   eas secret:delete --name RESEND_API_KEY
   eas secret:create --scope project --name RESEND_API_KEY --value "new_value"
   ```

## Checking Current Secrets

To verify all required secrets are configured:

```bash
# List all secrets
eas secret:list

# Check for specific secret
eas secret:list | grep RESEND_API_KEY
```

## Troubleshooting

### Secret not found during build
- Verify the secret name matches exactly (case-sensitive)
- Check that the secret is scoped to "project" (not "account")
- Ensure you're logged into the correct EAS account

### Build fails with "API key not configured"
- Verify all secrets are set using `eas secret:list`
- Check that secret names match those in `app.config.js`
- Rebuild the app after adding secrets

## Production Checklist

Before building for production, ensure:

- [ ] `RESEND_API_KEY` is set in EAS secrets
- [ ] `OPENAI_API_KEY` is set in EAS secrets
- [ ] `REVENUECAT_API_KEY_IOS` is set in EAS secrets
- [ ] `REVENUECAT_API_KEY_ANDROID` is set (if building for Android)
- [ ] All secrets verified using `eas secret:list`
- [ ] Test build completed successfully

