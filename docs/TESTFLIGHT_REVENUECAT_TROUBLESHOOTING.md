# TestFlight RevenueCat Subscription Troubleshooting Guide

## Quick Setup: Viewing Logs from TestFlight Build

### Step 1: Connect Your iPhone to Mac

1. **Connect your iPhone to your Mac** via USB cable
2. **Unlock your iPhone** and trust the computer if prompted
3. **Keep your iPhone unlocked** while debugging

### Step 2: Open Console (Choose One Method)

#### Method A: Xcode Device Console (Recommended)
1. **Open Xcode** on your Mac
2. **Go to Window → Devices and Simulators** (or press `Cmd + Shift + 2`)
3. **Select your iPhone** from the left sidebar
4. **Click "Open Console"** button at the bottom
5. **Clear the console** (press `Cmd + K`)

#### Method B: macOS Console App
1. **Open Console.app** (Applications → Utilities → Console)
2. **Select your iPhone** from the left sidebar (under "Devices")
3. **Clear the console** (press `Cmd + K`)
4. **Make sure "All Messages" tab is selected** (not "Errors and Faults")

### Step 3: Filter Logs

In the search/filter box, type one of these filters:
- `MemoryLane` - Shows all app logs
- `RevenueCat` - Shows RevenueCat-specific logs
- `PremiumScreen` - Shows premium screen logs
- `📦` - Shows package loading logs
- `🔑` - Shows API key logs

### Step 4: Launch App and Navigate to Premium Screen

1. **Launch MemoryLane** from TestFlight on your iPhone
2. **Navigate to Premium Screen** (Settings → Premium)
3. **Watch the console** - logs will appear in real-time

---

## What to Look For in Logs

### ✅ Success Indicators (What You Should See)

```
📱 Using RevenueCat Production API key (production build)
✅ RevenueCat initialized successfully
📦 Fetching RevenueCat offerings...
📦 Offerings received: { hasCurrent: true, availablePackagesCount: 2 }
✅ Found 2 packages: [ { identifier: '$rc_monthly', ... }, { identifier: '$rc_annual', ... } ]
📦 PremiumScreen: Loading packages...
📦 PremiumScreen: Received 2 packages
```

### ❌ Error Indicators (What to Check For)

#### 1. API Key Issues

**Look for:**
```
⚠️ RevenueCat API key not configured
🔑 RevenueCat iOS Key: undefined
🔑 Key exists? false
```

**Fix:**
- Check EAS secrets: `eas secret:list`
- Verify key is set for production environment
- Rebuild the app after adding/updating secrets

#### 2. Initialization Errors

**Look for:**
```
❌ Error initializing RevenueCat: [error details]
⚠️ RevenueCat not initialized and no user logged in
```

**Fix:**
- Check if user is logged in
- Check network connection
- Verify API key format (should start with `appl_`)

#### 3. No Packages Found

**Look for:**
```
⚠️ PremiumScreen: No packages found
⚠️ No current offering found in RevenueCat
📦 PremiumScreen: Received 0 packages
```

**Fix:**
- Check RevenueCat dashboard:
  1. Is an offering created?
  2. Is it set as "current"?
  3. Are products (premium_monthly, premium_yearly) attached?
  4. Are products linked to App Store Connect?

#### 4. Wrong API Key Type

**Look for:**
```
📱 Using RevenueCat Test Store API key (Expo Go detected)
```

**If you see this in TestFlight:** This is wrong! TestFlight should use production key.

**Fix:**
- Check `utils/revenueCat.js` - ensure it's using production key for non-Expo Go builds
- Verify `Constants.executionEnvironment` detection

---

## Step-by-Step Debugging Checklist

### 1. Check API Key Loading

**What to do:**
1. Navigate to Premium Screen
2. Look for these logs:
   ```
   🔑 RevenueCat iOS Key: appl_...
   🔑 Key exists? true
   🔑 Key starts with appl_? true
   ```

**If key is undefined:**
- API key not in EAS secrets
- Need to rebuild app after adding secret

### 2. Check RevenueCat Initialization

**What to do:**
1. Look for initialization logs:
   ```
   ✅ RevenueCat initialized successfully
   ```

**If you see errors:**
- Check the error message
- Verify network connection
- Check if user is logged in

### 3. Check Package Fetching

**What to do:**
1. Look for package loading logs:
   ```
   📦 Fetching RevenueCat offerings...
   📦 Offerings received: { hasCurrent: true, availablePackagesCount: 2 }
   ```

**If packages count is 0:**
- Check RevenueCat dashboard configuration
- Verify offering is set as "current"
- Check product attachments

### 4. Check Premium Screen Loading

**What to do:**
1. Look for PremiumScreen logs:
   ```
   📦 PremiumScreen: Loading packages...
   📦 PremiumScreen: Received 2 packages
   ```

**If received 0 packages:**
- Check if packages are being filtered out
- Check package identifier matching logic

---

## Common Issues and Solutions

### Issue 1: "No packages found" in TestFlight

**Symptoms:**
- Premium screen shows "Restore Purchases" button only
- Console shows: `📦 PremiumScreen: Received 0 packages`

**Possible Causes:**
1. **RevenueCat Dashboard Not Configured**
   - Solution: Create offering, set as current, attach products

2. **Products Not Linked to App Store Connect**
   - Solution: Link products in RevenueCat dashboard

3. **Wrong API Key**
   - Solution: Verify production API key is in EAS secrets

4. **App Store Connect Products Not Approved**
   - Solution: Check App Store Connect → In-App Purchases → Status

**Debug Steps:**
1. Check console for: `📦 Offerings received:`
2. If `hasCurrent: false` → Offering not set as current
3. If `availablePackagesCount: 0` → Products not attached

### Issue 2: API Key Not Loading

**Symptoms:**
- Console shows: `🔑 RevenueCat iOS Key: undefined`
- Console shows: `⚠️ RevenueCat API key not configured`

**Solution:**
1. Check EAS secrets: `eas secret:list`
2. Verify key is for production environment
3. Rebuild app: `eas build --platform ios --profile production`
4. Secrets are only embedded during build, not at runtime

### Issue 3: Wrong API Key Type

**Symptoms:**
- Console shows: `📱 Using RevenueCat Test Store API key`
- But you're testing in TestFlight (not Expo Go)

**Solution:**
- Check `utils/revenueCat.js` - ensure it detects TestFlight correctly
- TestFlight builds should use production API key

---

## Quick Debug Commands

### Check EAS Secrets
```bash
eas secret:list
```

### Check Environment Variables in Build
```bash
eas env:list
```

### View Build Logs
```bash
eas build:list
eas build:view [BUILD_ID]
```

---

## What to Share for Further Help

If you need additional help, share these logs:

1. **API Key Loading:**
   ```
   🔑 RevenueCat iOS Key: [value or undefined]
   🔑 Key exists? [true/false]
   ```

2. **Initialization:**
   ```
   ✅ RevenueCat initialized successfully
   OR
   ❌ Error initializing RevenueCat: [error]
   ```

3. **Package Fetching:**
   ```
   📦 Offerings received: { hasCurrent: [true/false], availablePackagesCount: [number] }
   ```

4. **Premium Screen:**
   ```
   📦 PremiumScreen: Received [number] packages
   ```

---

## Next Steps

1. **Connect iPhone to Mac** and open Console
2. **Filter by "RevenueCat" or "📦"**
3. **Navigate to Premium Screen** in TestFlight app
4. **Copy relevant logs** from console
5. **Compare with success indicators** above
6. **Identify the issue** based on error patterns
7. **Apply the fix** from the solutions section

---

## Additional Resources

- [RevenueCat Dashboard](https://app.revenuecat.com)
- [RevenueCat Documentation](https://docs.revenuecat.com)
- [EAS Secrets Documentation](https://docs.expo.dev/build-reference/variables/)

