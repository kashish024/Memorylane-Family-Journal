import Constants from 'expo-constants';

// Server-side secret: avoid shipping OpenAI key in client manifest.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || Constants.expoConfig?.extra?.OPENAI_API_KEY;

export const generateMonthlySummary = async (memories, childName, month, year) => {
  try {
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      throw new Error('AI summary service unavailable on client. Configure server-side OpenAI integration.');
    }

    console.log('🤖 Generating AI summary for', childName, month, year);
    console.log('🤖 Processing', memories.length, 'memories');
    
    // Prepare memories for AI
    const memoryText = memories.map(m => {
      let text = `${m.date} - ${m.title}: ${m.content}`;
      if (m.milestone) text += ` [MILESTONE: ${m.milestone}]`;
      if (m.transcript) text += ` [Voice note: ${m.transcript}]`;
      return text;
    }).join('\n');
    
    const prompt = `You are writing a warm, personal monthly summary for a parent about their child named ${childName}.

Here are all the memories captured in ${month} ${year}:

${memoryText}

Write a heartfelt, narrative summary (1 paragraph) that:
1. Captures the essence of ${childName}'s month
2. Highlights key moments and growth
3. Uses warm, personal language as if talking to a close friend
4. Focuses on emotional moments and development
5. Keep it under 150 words

Write ONLY the summary, no introduction or extra text.`;

    console.log('🤖 Sending to OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a warm, empathetic writer creating personalized monthly summaries for parents about their children.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🤖 OpenAI error:', errorText);
      throw new Error(`AI summary failed: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content.trim();
    
    console.log('🤖 Summary generated successfully');
    
    return summary;
  } catch (error) {
    console.error('🤖 Error generating summary:', error);
    return null;
  }
};