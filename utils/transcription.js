import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

// Server-side secret: avoid shipping OpenAI key in client manifest.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || Constants.expoConfig?.extra?.OPENAI_API_KEY; 

export const transcribeAudio = async (audioUri) => {
  try {
    // Check if API key is configured
    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      throw new Error('Transcription service unavailable on client. Configure server-side OpenAI integration.');
    }

    console.log('🎤 Starting transcription for:', audioUri);
    
    // Fetch the audio file and convert to blob
    console.log('🎤 Fetching audio file...');
    const response = await fetch(audioUri);
    const blob = await response.blob();
    
    console.log('🎤 Audio file fetched, size:', blob.size, 'bytes');
    
    // Create form data
    const formData = new FormData();
    
    // Add the audio blob with proper filename
    // For React Native, we need to pass the blob with uri and type
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    });
    formData.append('model', 'whisper-1');
    
    console.log('🎤 Sending request to OpenAI Whisper...');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    console.log('🎤 Response status:', whisperResponse.status);

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('🎤 Whisper API error:', errorText);
      throw new Error(`Transcription failed: ${whisperResponse.status}`);
    }

    const data = await whisperResponse.json();
    console.log('🎤 Transcription successful:', data.text);
    
    return data.text;
  } catch (error) {
    console.error('🎤 Transcription error:', error);
    console.error('🎤 Error message:', error.message);
    console.error('🎤 Error stack:', error.stack);
    return null;
  }
};
