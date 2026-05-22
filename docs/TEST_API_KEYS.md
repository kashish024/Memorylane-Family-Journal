# Testing API Keys Configuration

## Quick Validation Tests

### 1. Check Environment Variable Setup

**Test 1: Verify .env file has OPENAI_API_KEY**
```bash
# In your project root, check if .env file exists and contains:
grep OPENAI_API_KEY .env
```

Expected output:
```
OPENAI_API_KEY=sk-proj-...
```

**Test 2: Verify app.config.js reads the key**
```bash
# Check app.config.js includes OPENAI_API_KEY in extra section
grep -A 5 "extra:" app.config.js | grep OPENAI_API_KEY
```

Expected output:
```
OPENAI_API_KEY: process.env.OPENAI_API_KEY,
```

### 2. Runtime Tests

**Test 3: Check if key is accessible in app**
1. Start your Expo dev server:
   ```bash
   npx expo start
   ```

2. Open the app and navigate to a screen that uses transcription or AI summary
3. Check the console/logs - you should NOT see:
   - `❌ OPENAI_API_KEY not found in environment variables`
   - `OpenAI API key not configured`

**Test 4: Test Audio Transcription**
1. Add a memory with a voice note
2. Record a short audio clip
3. Save the memory
4. Check if transcription appears (should work if API key is configured)
5. If it fails, check console for error message

**Test 5: Test Monthly Summary Generation**
1. Navigate to Monthly Summary screen
2. Generate a summary for a child with memories
3. Check if summary is generated successfully
4. If it fails, check console for error message

### 3. Code Validation Tests

**Test 6: Verify hardcoded keys are removed**
```bash
# Search for any remaining hardcoded OpenAI keys
grep -r "sk-proj" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.expo
```

Expected: No results (or only in .env file)

**Test 7: Verify environment variable usage**
```bash
# Check that files use Constants.expoConfig
grep -r "Constants.expoConfig?.extra?.OPENAI_API_KEY" utils/
```

Expected output:
```
utils/transcription.js:const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;
utils/aiSummary.js:const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;
```

### 4. Production Build Test

**Test 8: Test with EAS Build (for production)**
1. Set up EAS Secrets:
   ```bash
   eas secret:create --scope project --name OPENAI_API_KEY --value your_actual_key_here
   ```

2. Create a test build:
   ```bash
   eas build --platform ios --profile preview
   ```

3. Install the build and test transcription/summary features

### 5. Error Handling Test

**Test 9: Test error handling when key is missing**
1. Temporarily remove OPENAI_API_KEY from .env
2. Restart Expo dev server
3. Try to use transcription or AI summary
4. Should see user-friendly error message, not crash

**Test 10: Test with invalid key**
1. Set OPENAI_API_KEY to an invalid value in .env
2. Try transcription or AI summary
3. Should handle error gracefully

## Quick Test Script

Run this in your terminal to quickly validate:

```bash
#!/bin/bash
echo "🔍 Testing API Key Configuration..."
echo ""

echo "1. Checking .env file..."
if grep -q "OPENAI_API_KEY=" .env 2>/dev/null; then
    echo "✅ .env contains OPENAI_API_KEY"
else
    echo "❌ .env missing OPENAI_API_KEY"
fi

echo ""
echo "2. Checking app.config.js..."
if grep -q "OPENAI_API_KEY: process.env.OPENAI_API_KEY" app.config.js; then
    echo "✅ app.config.js includes OPENAI_API_KEY"
else
    echo "❌ app.config.js missing OPENAI_API_KEY"
fi

echo ""
echo "3. Checking for hardcoded keys..."
if grep -r "sk-proj" utils/transcription.js utils/aiSummary.js 2>/dev/null | grep -v "Constants.expoConfig"; then
    echo "❌ Found hardcoded keys!"
else
    echo "✅ No hardcoded keys found"
fi

echo ""
echo "4. Checking environment variable usage..."
if grep -q "Constants.expoConfig?.extra?.OPENAI_API_KEY" utils/transcription.js && \
   grep -q "Constants.expoConfig?.extra?.OPENAI_API_KEY" utils/aiSummary.js; then
    echo "✅ Both files use environment variables"
else
    echo "❌ Files not using environment variables"
fi

echo ""
echo "✅ Validation complete!"
```

Save this as `test-api-keys.sh`, make it executable (`chmod +x test-api-keys.sh`), and run it.

## Manual Testing Checklist

- [ ] Audio transcription works when recording voice notes
- [ ] Monthly summary generation works
- [ ] No console errors about missing API key
- [ ] Error messages are user-friendly when API key is missing
- [ ] App doesn't crash when API key is invalid
- [ ] Hardcoded keys are completely removed from codebase

