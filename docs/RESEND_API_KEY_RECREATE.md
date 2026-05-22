# Recreating Resend API Key - Step by Step Guide

## When to Recreate

Recreating the API key is a good idea if:
- You're getting 401 errors and want to verify the setup
- You suspect the key might be incorrect
- You want a fresh start for production

## Steps to Recreate

### Step 1: Create New API Key in Resend

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "MemoryLane Production")
4. Copy the new API key immediately (you won't see it again!)
5. **Important**: The key should start with `re_` (e.g., `re_abc123...`)

### Step 2: Update EAS Secret

```bash
# Delete the old secret
eas secret:delete --name RESEND_API_KEY

# Create new secret with the new key
eas secret:create --scope project --name RESEND_API_KEY --value "re_your_new_key_here"
```

### Step 3: Update .env File

Update your local `.env` file:
```env
RESEND_API_KEY=re_your_new_key_here
```

### Step 4: Verify Secret is Set

```bash
eas secret:list | grep RESEND_API_KEY
```

Should show the secret exists.

### Step 5: Rebuild the App

**Critical**: You MUST rebuild after updating the secret:

```bash
eas build --platform ios --profile production
```

### Step 6: Test

After the new build is deployed to TestFlight:
1. Try sending an email (monthly summary or invitation)
2. Check the debug logs for the key prefix to verify it's the new key
3. Should work without 401 errors

## Important Notes

- **Don't delete the old key in Resend until the new one is working** - Keep it as backup
- **The old key will stop working** once you delete it in Resend, so make sure the new one is set up first
- **Rebuild is required** - Secrets are only available in builds created after they're added
- **Test in TestFlight** - The new build must be deployed and tested

## Verification

After rebuilding, the debug logs should show:
```
🔍 Email Service Debug: {
  hasResendKey: true,
  keyLength: ~40-50 characters,
  keyPrefix: "re_..." (should match your new key)
}
```

If `hasResendKey: false`, the secret wasn't available during the build (rebuild needed).

