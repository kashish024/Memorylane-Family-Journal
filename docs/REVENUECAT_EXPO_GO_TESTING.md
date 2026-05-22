# RevenueCat Testing in Expo Go

## Issue: RevenueCat Doesn't Work in Expo Go

RevenueCat requires native store access, which is **not available in Expo Go**. You'll see this error:

```
Error: Invalid API key. The native store is not available when running inside Expo Go, 
please use your Test Store API Key or create a development build.
```

## Solution: Use RevenueCat Test Store API Key

RevenueCat provides a special **Test Store API Key** that works in Expo Go for testing purposes.

### Step 1: Get Test Store API Key

1. Go to **RevenueCat Dashboard**: https://app.revenuecat.com
2. Select your project: **MemoryLane**
3. Go to **API Keys** section (or **Settings** → **API Keys**)
4. Look for **"Test Store"** API key
5. Copy the key (it will be different from your production key)

### Step 2: Add to .env File

Add the Test Store API key to your `.env` file:

```env
# RevenueCat API Keys
REVENUECAT_API_KEY_IOS=appl_your_production_key_here
REVENUECAT_API_KEY_ANDROID=goog_your_production_key_here

# Test Store API Key (for Expo Go testing)
REVENUECAT_TEST_STORE_API_KEY=your_test_store_key_here
```

### Step 3: Restart Expo

After adding the key, restart your Expo dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npx expo start
```

### Step 4: Test in Expo Go

The app will now automatically:
- Detect if running in Expo Go
- Use the Test Store API key instead of production key
- Allow you to test purchases in Expo Go

## How It Works

The code automatically detects if you're running in Expo Go and uses the appropriate key:

- **Expo Go**: Uses `REVENUECAT_TEST_STORE_API_KEY`
- **Development/Production Build**: Uses `REVENUECAT_API_KEY_IOS` or `REVENUECAT_API_KEY_ANDROID`

## Important Notes

1. **Test Store Key is for Testing Only**: 
   - Works in Expo Go
   - Allows testing purchase flows
   - Uses RevenueCat's test environment

2. **Production Builds**:
   - Always use production API keys
   - Test Store key is ignored in production builds
   - Native store access is available

3. **For Apple Review**:
   - You need to test with a **development build** or **TestFlight build**
   - Expo Go won't work for Apple review testing
   - Create a development build: `eas build --profile development --platform ios`

## Alternative: Use Development Build

If you prefer not to use the Test Store key, create a development build:

```bash
eas build --profile development --platform ios
```

This gives you native store access and works with production RevenueCat keys.

## Testing Checklist

- [ ] Test Store API key added to `.env`
- [ ] App restarted after adding key
- [ ] Running in Expo Go
- [ ] RevenueCat initializes without errors
- [ ] Can see subscription packages
- [ ] Can test purchase flow (will use test environment)

## Troubleshooting

### Still getting "Invalid API key" error?
- Verify Test Store key is in `.env` file
- Restart Expo dev server
- Check that key doesn't have extra spaces or quotes
- Verify you're using the Test Store key (not production key)

### Can't find Test Store key in RevenueCat?
- Go to RevenueCat Dashboard → Your Project
- Look for "API Keys" or "Settings" → "API Keys"
- Test Store key should be listed separately
- If not available, contact RevenueCat support

### Need to test for Apple Review?
- Use a development build or TestFlight build
- Production API keys will work in these builds
- Test Store key is only for Expo Go

