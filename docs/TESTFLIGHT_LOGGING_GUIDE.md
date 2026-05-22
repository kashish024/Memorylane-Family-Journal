# TestFlight Logging Guide

## Methods to View Logs from TestFlight Builds

### Method 1: Xcode Device Console (Recommended)

This is the easiest and most reliable method for iOS TestFlight builds.

#### Steps:
1. **Connect your iPhone to your Mac** via USB
2. **Open Xcode** on your Mac
3. **Go to Window → Devices and Simulators** (or press `Cmd + Shift + 2`)
4. **Select your iPhone** from the left sidebar
5. **Click "Open Console"** button at the bottom
6. **Filter logs**:
   - In the search box, type: `MemoryLane` or `🔍 Email Service Debug`
   - This will filter to only show your app's logs
7. **Launch your app** on the iPhone (from TestFlight)
8. **Perform the action** that triggers the email (generate summary, send invitation)
9. **Watch the console** - you'll see all `console.log()` output in real-time

#### Tips:
- The console shows logs in real-time
- You can filter by app name, log level, or specific text
- Logs persist even after the app is closed
- You can export logs for later review

---

### Method 2: macOS Console App

Similar to Xcode but uses the built-in Console app.

#### Steps:
1. **Connect your iPhone to your Mac** via USB
2. **Open Console.app** (Applications → Utilities → Console)
3. **Select your iPhone** from the left sidebar (under "Devices")
4. **Clear the console** (click the "Clear" button or press `Cmd + K`)
5. **Make sure "All Messages" tab is selected** (not "Errors and Faults")
6. **Launch your app** on the iPhone from TestFlight
7. **Wait a few seconds** for logs to start appearing
8. **Filter by your app** (optional, but helpful):
   - In the search box, type: `MemoryLane` or `com.kashish024.memorylane`
   - Or search for: `🔍 Email Service Debug` or `RESEND_API_KEY`
9. **Perform the action** (generate summary, send invitation)
10. **Watch logs appear** in real-time

#### Troubleshooting if no logs appear:
- **Make sure the app is actually running** on the iPhone (not just installed)
- **Try clearing the console** and starting fresh
- **Check the "Errors and Faults" tab** - sometimes errors appear there
- **Try without any filter** first to see all device logs
- **Make sure your iPhone is unlocked** and the app is in foreground
- **Restart the app** on the iPhone after connecting
- **Try Xcode Device Console instead** (Method 1) - it's more reliable

---

### Method 3: React Native Debugger (If Enabled)

If you have remote debugging enabled in your TestFlight build (not recommended for production).

#### Steps:
1. **Shake your device** or use a gesture to open the developer menu
2. **Enable Remote JS Debugging**
3. **Open Chrome** and go to `chrome://inspect`
4. **Click "inspect"** on your device
5. **Open the Console tab** in Chrome DevTools
6. **View logs** in real-time

**Note**: Remote debugging is usually disabled in production builds for security.

---

### Method 4: Add Alert-Based Debugging (Temporary)

For quick debugging, you can temporarily add alerts to show debug info.

#### Example:
```javascript
// In utils/emailService.js - temporary debug
Alert.alert('Debug Info', JSON.stringify({
  hasResendKey: !!RESEND_API_KEY,
  keyLength: RESEND_API_KEY?.length,
  keyPrefix: RESEND_API_KEY?.substring(0, 10),
}));
```

**Note**: Remove this before production builds!

---

### Method 5: Write Logs to File (Advanced)

You can write logs to a file that can be accessed via iTunes File Sharing.

#### Implementation:
```javascript
import * as FileSystem from 'expo-file-system';

const logToFile = async (message) => {
  const logPath = FileSystem.documentDirectory + 'app.log';
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  try {
    const existingLogs = await FileSystem.readAsStringAsync(logPath).catch(() => '');
    await FileSystem.writeAsStringAsync(logPath, existingLogs + logMessage);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};
```

Then access via:
- Settings → iTunes File Sharing → MemoryLane → Export `app.log`

---

## What to Look For

When testing email functionality, look for these log messages:

### Success Indicators:
```
🔍 Email Service Debug: {
  hasResendKey: true,
  keyLength: 40-50,
  keyPrefix: "re_..."
}
📧 Sending email to: user@example.com
📧 Email sent successfully! ID: ...
```

### Error Indicators:
```
❌ RESEND_API_KEY not found in environment variables
📧 Email error: {"message": "Unauthorized"}
Email failed: 401
```

---

## Quick Debug Checklist

1. **Connect iPhone to Mac** via USB
2. **Open Xcode → Window → Devices and Simulators**
3. **Select iPhone → Open Console**
4. **Filter by "MemoryLane" or "Email Service"**
5. **Launch app from TestFlight**
6. **Trigger email action** (generate summary, send invitation)
7. **Check console for debug logs**

---

## Troubleshooting

### No logs appearing?
- Make sure the iPhone is connected via USB (not just WiFi)
- Check that you selected the correct device in Xcode
- Try restarting the app on the device
- Make sure the app is actually running (not just installed)

### Can't see specific logs?
- Use the search/filter box in the console
- Try filtering by: `🔍`, `Email`, `RESEND`, or `401`
- Clear the console and try again

### Logs are too verbose?
- Use the filter to narrow down to your app
- Filter by specific keywords like `Email Service Debug`
- Export logs and search in a text editor

---

## Recommended Approach

For your current issue (checking if RESEND_API_KEY is accessible):

1. **Use Method 1 (Xcode Device Console)** - Most reliable
2. **Filter by**: `🔍 Email Service Debug` or `RESEND_API_KEY`
3. **Trigger email sending** (generate monthly summary)
4. **Look for**:
   - `hasResendKey: true` → Key is accessible ✅
   - `hasResendKey: false` → Key not accessible ❌
   - `keyPrefix: "re_..."` → Verify it matches your new key

This will tell you immediately if the EAS secret is working in the build.

