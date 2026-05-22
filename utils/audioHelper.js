import { Audio } from 'expo-av';

let recording = null;
let sound = null;

// Start recording
export const startRecording = async () => {
  try {
    console.log('Requesting permissions...');
    const { granted } = await Audio.requestPermissionsAsync();
    
    if (!granted) {
      throw new Error('Microphone permission denied');
    }

    console.log('Permission granted! Setting audio mode...');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    console.log('Creating recording...');
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    
    console.log('Recording started!');
    recording = newRecording;
    return recording;
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
};

// Stop recording - completely isolated from React state updates
export const stopRecording = async () => {
  return new Promise(async (resolve) => {
    if (!recording) {
      resolve(null);
      return;
    }

    try {
      console.log('Stopping recording...');
      
      // Get URI immediately
      const uri = recording.getURI();
      console.log('Got URI:', uri);
      
      // Store reference and clear global
      const recordingToStop = recording;
      recording = null; // Clear immediately to prevent re-renders from accessing it
      
      // Stop in background, don't wait for it
      recordingToStop.stopAndUnloadAsync().catch(() => {
        // Silently ignore expo-av cleanup errors
      });
      
      // Reset audio mode in background
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      }).catch(() => {
        // Silently ignore
      });

      console.log('Recording stopped successfully');
      
      // Return URI immediately without waiting for cleanup
      resolve(uri);
    } catch (error) {
      console.error('Critical stop error:', error);
      recording = null;
      resolve(null);
    }
  });
};

// Play audio
export const playAudio = async (uri) => {
  try {
    // Validate URI
    if (!uri || uri === null || uri === undefined || uri === '') {
      throw new Error('Audio URI is null or undefined');
    }

    console.log('🎵 Playing audio from URI:', uri);

    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true }
    );
    
    sound = newSound;
    return sound;
  } catch (error) {
    console.error('Failed to play audio:', error);
    throw error;
  }
};

// Pause audio
export const pauseAudio = async () => {
  try {
    if (sound) {
      await sound.pauseAsync();
    }
  } catch (error) {
    console.error('Failed to pause audio:', error);
  }
};

// Stop audio
export const stopAudio = async () => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
  } catch (error) {
    console.error('Failed to stop audio:', error);
  }
};

// Format duration
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};