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
