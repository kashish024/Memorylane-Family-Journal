# EAS Secrets Troubleshooting Guide

## Issue: 401 Unauthorized Error in Production Build

If you're getting a 401 error when sending emails from a TestFlight/production build, it usually means the API key is not accessible or incorrect.

## Common Causes

### 1. Secret Not Available During Build
**Problem**: EAS secrets must be set **before** building. If you added the secret after building, it won't be available in that build.

**Solution**: Rebuild the app after adding secrets:
```bash
eas build --platform ios --profile production
```

### 2. Wrong Secret Value
**Problem**: The secret might contain the wrong API key (test key instead of production, or incorrect value).

**Solution**: 
1. Verify the secret value:
   ```bash
   # List secrets to see what's configured
   eas secret:list
   ```
2. Check your `.env` file to get the correct value
3. Update the secret if needed:
   ```bash
   eas secret:delete --name RESEND_API_KEY
   eas secret:create --scope project --name RESEND_API_KEY --value "correct_key_here"
   ```
4. Rebuild the app

### 3. Secret Name Mismatch
**Problem**: The secret name must match exactly what's in `app.config.js` (case-sensitive).

**Solution**: 
- Secret name in EAS: `RESEND_API_KEY` (must match exactly)
- In `app.config.js`: `process.env.RESEND_API_KEY`
- In code: `Constants.expoConfig?.extra?.RESEND_API_KEY`

### 4. Secret Scope Issue
**Problem**: Secret might be scoped to account instead of project.

**Solution**: Ensure secrets are scoped to "project":
```bash
eas secret:create --scope project --name RESEND_API_KEY --value "your_key"
```

## Debugging Steps

### Step 1: Verify Secrets Are Configured
```bash
eas secret:list
```

Should show:
- `RESEND_API_KEY`
- `OPENAI_API_KEY`
- `REVENUECAT_API_KEY_IOS`

### Step 2: Check Debug Logs
The app now includes debug logging. When you try to send an email, check the console/logs for:
```
🔍 Email Service Debug: {
  hasConstants: true,
  hasExtra: true,
  extraKeys: [...],
  hasResendKey: true/false,
  keyLength: ...,
  keyPrefix: "..."
}
```

If `hasResendKey: false`, the secret is not accessible in the build.

### Step 3: Verify API Key Value
1. Get your Resend API key from: https://resend.com/api-keys
2. Ensure it's the **production** key (starts with `re_`)
3. Verify it matches what's in EAS secrets

### Step 4: Rebuild After Adding Secrets
**Important**: After adding or updating EAS secrets, you **must** rebuild:
```bash
eas build --platform ios --profile production
```

Secrets are only available in builds created **after** the secret was added.

## Quick Fix Checklist

- [ ] Secret exists in EAS: `eas secret:list`
- [ ] Secret name matches exactly: `RESEND_API_KEY`
- [ ] Secret is scoped to "project" (not "account")
- [ ] Secret value is correct (production API key from Resend)
- [ ] App was rebuilt **after** secret was added
- [ ] Check debug logs to see if key is accessible

## Testing

After rebuilding, test email sending and check the debug logs. The logs will show:
- Whether the key is accessible
- The key prefix (first 10 characters) for verification
- Available keys in `Constants.expoConfig.extra`

If the key is still not accessible after rebuilding, verify:
1. The secret is correctly named
2. The secret value is correct
3. You're logged into the correct EAS account
4. The project ID matches

