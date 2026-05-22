# Where to Find RevenueCat API Keys

## RevenueCat Provides Separate Keys for Each Platform

RevenueCat gives you **different API keys** for iOS and Android. Each app you add to RevenueCat gets its own unique Public API Key.

## How to Find Your API Keys

### Step 1: Go to Your RevenueCat Project
1. Log in to https://app.revenuecat.com
2. Select your **MemoryLane** project

### Step 2: Navigate to Apps
1. Click **Apps** in the left sidebar
2. You'll see a list of apps you've added (iOS, Android, etc.)

### Step 3: Get iOS API Key
1. Click on your **iOS app** (or the app with bundle ID `com.kashish024.memorylane`)
2. You'll see a section called **Public API Key** or **SDK Key**
3. Copy this key - this is your `REVENUECAT_API_KEY_IOS`

### Step 4: Get Android API Key
1. Click on your **Android app** (or the app with package `com.kashish024.memorylane`)
2. You'll see a section called **Public API Key** or **SDK Key**
3. Copy this key - this is your `REVENUECAT_API_KEY_ANDROID`

## If You Only See One Key

### Scenario 1: You've Only Added One App
If you've only added your iOS app so far:
- You'll only see the iOS API key
- You need to add your Android app to get the Android key
- Go to **Apps** → **Add App** → Select **Android**

### Scenario 2: Both Apps Share the Same Key (Unlikely)
In some older RevenueCat setups, there might be a project-level key, but modern RevenueCat uses per-app keys.

### Scenario 3: You're Looking at the Wrong Place
Make sure you're looking at:
- **Apps** → [Your App] → **Public API Key** (or SDK Key)
- NOT the App Store Connect API key (that's the P8 key we discussed earlier)

## Visual Guide

```
RevenueCat Dashboard
├── Apps
│   ├── iOS App (com.kashish024.memorylane)
│   │   └── Public API Key: appl_xxxxxxxxxxxxx  ← iOS Key
│   └── Android App (com.kashish024.memorylane)
│       └── Public API Key: goog_xxxxxxxxxxxxx  ← Android Key
```

## Key Format

- **iOS keys** typically start with `appl_` or `rc_`
- **Android keys** typically start with `goog_` or `rc_`

## What to Do

1. **If you only have iOS app added:**
   - Add your Android app in RevenueCat
   - You'll get a separate Android API key

2. **If you have both apps but only see one key:**
   - Make sure you're clicking into each individual app
   - The keys are shown on each app's detail page

3. **For now (if testing on one platform):**
   - You can use the same key for both in `.env` temporarily
   - But you'll need separate keys when you deploy to both platforms

## Your .env File Should Have:

```env
# RevenueCat API Keys (different for each platform)
REVENUECAT_API_KEY_IOS=appl_xxxxxxxxxxxxx
REVENUECAT_API_KEY_ANDROID=goog_xxxxxxxxxxxxx
```

## Quick Check

To verify you have the right keys:
- iOS key should work when testing on iOS device/simulator
- Android key should work when testing on Android device/emulator
- The app will automatically use the correct key based on the platform

