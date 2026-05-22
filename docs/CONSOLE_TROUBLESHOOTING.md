# Console Logging Troubleshooting

## Issue: No Logs Appearing in Console.app

If you're not seeing logs in Console.app, try these steps:

### Step 1: Verify Setup
- [ ] iPhone is connected via USB (not just WiFi)
- [ ] iPhone is unlocked
- [ ] App is actually running on the iPhone (not just installed)
- [ ] Console.app shows your iPhone selected in the sidebar

### Step 2: Clear and Reset
1. Click **"Clear"** button in Console.app (or press `Cmd + K`)
2. Make sure **"All Messages"** tab is selected (not "Errors and Faults")
3. Close and reopen Console.app
4. Re-select your iPhone from the sidebar

### Step 3: Launch App Fresh
1. **Force quit the app** on your iPhone (swipe up and close it)
2. **Launch the app** from TestFlight again
3. **Wait 5-10 seconds** for logs to start appearing
4. **Perform an action** that generates logs (like generating a monthly summary)

### Step 4: Check Filters
1. **Remove any search filters** - clear the search box
2. **Check both tabs**: "All Messages" and "Errors and Faults"
3. **Look for any logs** - even if they're not from your app
4. If you see other app logs but not yours, the app might not be logging

### Step 5: Try Different Search Terms
Try searching for:
- `MemoryLane`
- `com.kashish024.memorylane`
- `🔍` (the emoji from debug logs)
- `Email Service`
- `RESEND`
- `console.log`

### Step 6: Verify App is Logging
The app should log when:
- App starts up
- You navigate between screens
- You perform actions (generate summary, send email)
- Errors occur

If you see NO logs at all (not even from other apps), the console might not be capturing device logs.

### Step 7: Alternative - Use Xcode Device Console
If Console.app still doesn't work:

1. **Open Xcode**
2. **Window → Devices and Simulators** (`Cmd + Shift + 2`)
3. **Select your iPhone**
4. **Click "Open Console"**
5. **Filter by**: `MemoryLane` or `🔍 Email Service Debug`

Xcode's console is usually more reliable for TestFlight builds.

### Step 8: Check if Logs Are Being Generated
To verify the app is actually logging, temporarily add an alert:

```javascript
// In App.js or any screen - temporary debug
useEffect(() => {
  console.log('🚀 App started - this should appear in console');
  Alert.alert('Debug', 'Check console for logs');
}, []);
```

If you see the alert but no console logs, the console isn't capturing them.

### Step 9: Check Console Settings
In Console.app:
1. Go to **View → Show Activity** (if available)
2. Make sure **"Include Info Messages"** is enabled
3. Check **View → Show Timestamps** to see when logs occur

### Step 10: Restart Everything
If nothing works:
1. **Disconnect iPhone**
2. **Quit Console.app**
3. **Reconnect iPhone**
4. **Open Console.app**
5. **Select iPhone**
6. **Launch app fresh**

## Why Logs Might Not Appear

1. **App not running** - Logs only appear when the app is actively running
2. **Console not capturing** - Sometimes Console.app doesn't capture all logs
3. **Filter too restrictive** - Try removing filters
4. **Wrong tab selected** - Check "All Messages" vs "Errors and Faults"
5. **App not logging** - The app might not be generating console.log statements
6. **TestFlight build** - Some logging might be disabled in production builds

## Recommended Solution

**Use Xcode Device Console instead** - it's more reliable:
1. Open Xcode
2. Window → Devices and Simulators
3. Select iPhone → Open Console
4. Filter by your app name

This method works better for TestFlight builds.

