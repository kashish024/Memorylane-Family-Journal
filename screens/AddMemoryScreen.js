import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image as RNImage, StatusBar } from 'react-native';
import { ArrowLeft, Camera, Mic, Sparkles, Heart, X, Image } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { addMemory, addPhotoMemory, addAudioMemory,loadChildren } from '../utils/storage.js';
import { startRecording, stopRecording, playAudio, pauseAudio, stopAudio, formatDuration } from '../utils/audioHelper';
import { parseLocalDate } from '../utils/dateHelper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar} from 'lucide-react-native';
import { Platform, Modal } from 'react-native';
import { Trash2, Check } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { checkNetworkConnection, showNetworkError } from '../utils/networkCheck';
import { getErrorMessage } from '../utils/errorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { canAddMemory } from '../utils/subscription';
import { loadMemories } from '../utils/storage';

const SELECTED_CHILD_ID_KEY = '@selectedChildId';


// Debug: Check if functions are imported
console.log('Storage functions imported:', {
  addMemory: typeof addMemory,
  addPhotoMemory: typeof addPhotoMemory,
  addAudioMemory: typeof addAudioMemory
});

export default function AddMemoryScreen({ navigation, route }) {
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const routeChildId = route?.params?.childId;
  const [milestone, setMilestone] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentChildId, setCurrentChildId] = useState(routeChildId || null);
  const [currentChild, setCurrentChild] = useState(null); // Store child object
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(null);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);


  const milestoneOptions = [
    '', 'First Word', 'First Steps', 'First Tooth', 'Birthday', 
    'First Day of School', 'First Laugh', 'Other'
  ];
 
  // Load childId from route params, AsyncStorage (last selected), or first child
  useEffect(() => {
    const loadChildId = async () => {
      if (routeChildId) {
        // Use childId from route params if provided
        setCurrentChildId(routeChildId);
        // Load child details
        const children = await loadChildren();
        const child = children.find(c => c.id === routeChildId);
        if (child) {
          setCurrentChild(child);
        }
      } else {
        // Try to get last selected child from AsyncStorage
        const children = await loadChildren();
        if (children && children.length > 0) {
          try {
            const lastSelectedChildId = await AsyncStorage.getItem(SELECTED_CHILD_ID_KEY);
            if (lastSelectedChildId) {
              const child = children.find(c => c.id === lastSelectedChildId);
              if (child) {
                setCurrentChildId(child.id);
                setCurrentChild(child);
                return;
              }
            }
          } catch (error) {
            console.error('Error reading selected child from storage:', error);
          }
          // Fallback to first child if no stored selection
          setCurrentChildId(children[0].id);
          setCurrentChild(children[0]);
        }
      }
    };
    loadChildId();
  }, [routeChildId]);

  // Update currentChild when currentChildId changes
  useEffect(() => {
    const updateChild = async () => {
      if (currentChildId) {
        const children = await loadChildren();
        const child = children.find(c => c.id === currentChildId);
        if (child) {
          setCurrentChild(child);
        }
      }
    };
    updateChild();
  }, [currentChildId]);

  // Update child when screen comes into focus (in case selected child changed on HomeScreen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // Only update if no route params (i.e., opened from tab)
      if (!routeChildId) {
        try {
          const lastSelectedChildId = await AsyncStorage.getItem(SELECTED_CHILD_ID_KEY);
          const children = await loadChildren();
          if (lastSelectedChildId && children && children.length > 0) {
            const child = children.find(c => c.id === lastSelectedChildId);
            if (child && child.id !== currentChildId) {
              setCurrentChildId(child.id);
              setCurrentChild(child);
            }
          } else if (children && children.length > 0 && (!currentChildId || !children.find(c => c.id === currentChildId))) {
            // If stored child doesn't exist, use first child
            setCurrentChildId(children[0].id);
            setCurrentChild(children[0]);
          }
        } catch (error) {
          console.error('Error updating child on focus:', error);
        }
      }
    });
    return unsubscribe;
  }, [navigation, routeChildId, currentChildId]);

  // Add this useEffect near your other useEffect hooks
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    // Reset form when screen comes into focus
    setTitle('');
    setContent('');
    setPhotoUri(null);
    setAudioUri(null);
    setSelectedMilestone(null);
    setUseCustomDate(false);
    setCustomDate(null);
    setIsRecording(null);
    setIsRecording(false);
    setAudioDuration(0);
  });

  return unsubscribe;
}, [navigation]);

  // Clear form when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setTitle('');
      setContent('');
      setMilestone('');
      setPhotoUri(null);
      setAudioUri(null);
      setAudioDuration(0);
      setIsPlayingAudio(false);
      setRecordingDuration(0);
      setTranscript('');  // Add this
      setIsTranscribing(false);  // Add this
      stopAudio();
    });
  
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    let interval;
    let startTime;
    
    if (isRecording) {
      startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingDuration(elapsed);
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Request camera permissions and take photo
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission',
          'We need camera permission to take photos',
          [{ text: 'OK' }]
        );
        return;
      }
  
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
  
      console.log('📸 Camera result:', result);  // Add this log
  
      if (!result.canceled) {
        console.log('📸 Setting photoUri to:', result.assets[0].uri);  // Add this log
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      console.error(error);
    }
  };

  // Pick from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Gallery Permission',
          'We need gallery permission to choose photos',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
  };

  const handleStartRecording = async () => {
    try {
      console.log('Starting recording...');
      await startRecording();
      setIsRecording(true);
      console.log('Recording state set to true');
      // Remove photo if exists
      if (photoUri) {
        setPhotoUri(null);
      }
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', `Failed to start recording: ${error.message}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const uri = await stopRecording();
      setIsRecording(false);
      setAudioUri(uri);
      setAudioDuration(recordingDuration);
      // NO ALERTS HERE
      // Start transcription
    if (uri) {
      setIsTranscribing(true);
      const { transcribeAudio } = require('../utils/transcription');
      const transcriptText = await transcribeAudio(uri);
      setTranscript(transcriptText || '');
      setIsTranscribing(false);
    }
    } catch (error) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const handlePlayAudio = async () => {
    try {
      if (isPlayingAudio) {
        await pauseAudio();
        setIsPlayingAudio(false);
      } else {
        if (!audioUri) {
          Alert.alert('Error', 'No audio file available');
          return;
        }
        await playAudio(audioUri);
        setIsPlayingAudio(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio: ' + error.message);
    }
  };

  const removeAudio = async () => {
    await stopAudio();
    setAudioUri(null);
    setAudioDuration(0);
    setIsPlayingAudio(false);
    setTranscript(''); 
    setIsTranscribing(false);  
  };

  const handleSave = async () => {
    console.log('=== HANDLE SAVE STARTED ===');
    console.log('currentChildId:', currentChildId);
    console.log('title:', title);
    console.log('content:', content);
    console.log('photoUri:', photoUri);
    console.log('audioUri:', audioUri);
    console.log('useCustomDate:', useCustomDate);
    console.log('customDate:', customDate);
  
    if (!currentChildId) {
      Alert.alert('Error', 'Please select a child');
      return;
    }
  
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
  
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
  
    console.log('Validation passed, starting save...');
  
    try {
      setSaving(true);

      // Check subscription limits before saving
      try {
        const allMemories = await loadMemories();
        const childMemories = allMemories.filter(m => m.childId === currentChildId);
        
        // Count memories for current month
        const now = new Date();
        const currentMonthMemories = childMemories.filter(memory => {
          // Parse date as local date to avoid timezone issues
          const memoryDate = parseLocalDate(memory.date);
          return memoryDate.getMonth() === now.getMonth() && 
                 memoryDate.getFullYear() === now.getFullYear();
        });
        
        const canAdd = await canAddMemory(currentChildId, currentMonthMemories.length);
        
        if (!canAdd.canAdd) {
          setSaving(false);
          Alert.alert(
            'Upgrade to Premium',
            canAdd.reason,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Upgrade', 
                onPress: () => navigation.navigate('Premium')
              }
            ]
          );
          return;
        }
      } catch (subError) {
        console.error('Error checking subscription:', subError);
        // Continue if subscription check fails
      }

      // Check network first
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      showNetworkError(Alert);
      setSaving(false);
      return;
    }

      // Use custom date or today
      const memoryDate = useCustomDate && customDate 
        ? customDate 
        : new Date();
  
      const memory = {
        title: title.trim(),
        content: content.trim(),
        author: 'You',
        milestone: selectedMilestone,
      };
  
      console.log('Memory data prepared:', memory);
      console.log('Memory date:', memoryDate.toISOString());
      console.log('Checking attachment types...');
      console.log('Has photo?', !!photoUri);
      console.log('Has audio?', !!audioUri);
  
      let result;
  
      if (photoUri && audioUri) {
        // Both photo and audio
        console.log('📸🎤 Saving memory with both photo and audio...');
        
        // First save photo memory
        const photoMemory = await addPhotoMemory(memory, photoUri, currentChildId);
        
        // Then add audio to it (you'll need to create a function for this)
        // For now, we'll just save photo
        result = photoMemory;
        
      } else if (photoUri) {
        // Photo only
        console.log('📸 Calling addPhotoMemory with photoUri:', photoUri);
        result = await addPhotoMemory(memory, photoUri, currentChildId, memoryDate);
        
      } else if (audioUri) {
        // Audio only
        console.log('🎤 Calling addAudioMemory...');
        const duration = audioDuration || 0;
        result = await addAudioMemory(memory, audioUri, duration, currentChildId, memoryDate);
        
      } else {
        // Text only
        console.log('📝 Calling addMemory (text only)...');
        result = await addMemory(memory, currentChildId, memoryDate);
      }
  
      console.log('Save result:', result);
  
      if (result) {
        console.log('Save successful!');
        setTitle('');
        setContent('');
        setPhotoUri(null);
        setAudioUri(null);
        setSelectedMilestone(null);
        setUseCustomDate(false);
        setCustomDate(null);
        
        Alert.alert(
          '✅ Memory Saved!',
          `Memory has been captured forever.`,
          [
            {
              text: 'View Timeline',
              onPress: () => {
                navigation.goBack();
                navigation.navigate('Timeline');
              }
            },
            {
              text: 'Add Another',
              onPress: () => {
                // Form already reset, just stay on screen
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving memory:', error);
      
      if (error.code === 'SUBSCRIPTION_LIMIT') {
        Alert.alert(
          'Upgrade to Premium',
          error.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade', 
              onPress: () => navigation.navigate('Premium')
            }
          ]
        );
      } else {
        Alert.alert('Save Failed',
          getErrorMessage(error),
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: () => handleSave() }
          ]
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-primary p-4 flex-row items-center" style={{ paddingTop: 70 }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="mr-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 8 }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">
              {currentChild ? `New Memory for ${currentChild.name}` : 'New Memory'}
            </Text>
          </View>
        </View>

                {/* Date Selection */}
                <View className="p-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">Memory Date</Text>
                
                {!useCustomDate ? (
                  <View>
                    <View className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <Text className="text-gray-800 font-semibold">Today</Text>
                      <Text className="text-gray-500 text-sm">{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</Text>
                    </View>
                    <TouchableOpacity 
                      className="mt-2 flex-row items-center justify-center py-2"
                      onPress={() => {
                        setUseCustomDate(true);
                        setCustomDate(new Date());
                      }}
                    >
                      <Calendar size={16} color="#E07A5F" />
                      <Text className="text-primary font-semibold ml-2">Backdate this memory</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View className="bg-primary/5 p-4 rounded-xl border-2 border-primary/20">
                      <Text className="text-gray-600 text-xs mb-2">Custom Date:</Text>
                      <TouchableOpacity 
                        className="flex-row items-center justify-between"
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Text className="text-gray-800 font-semibold">
                          {customDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </Text>
                        <Calendar size={20} color="#E07A5F" />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                      className="mt-2 flex-row items-center justify-center py-2"
                      onPress={() => {
                        setUseCustomDate(false);
                        setCustomDate(null);
                      }}
                    >
                      <X size={16} color="#ef4444" />
                      <Text className="text-red-600 font-semibold ml-2">Use today's date</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

        {/* Quick Capture Options */}
        <View className="p-6">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Choose capture method
          </Text>
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity 
              className="flex-1 bg-primary p-4 rounded-xl items-center"
              onPress={pickImage}
              disabled={isRecording || !!audioUri}
            >
              <Image size={24} color="white" />
              <Text className="text-white text-xs font-semibold mt-1">Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 bg-primary p-4 rounded-xl items-center"
              onPress={takePhoto}
              disabled={isRecording || !!audioUri}
            >
              <Camera size={24} color="white" />
              <Text className="text-white text-xs font-semibold mt-1">Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 p-4 rounded-xl items-center ${
                isRecording ? 'bg-red-500' : 'bg-primary'
              }`}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={!!photoUri}
            >
              <Mic size={24} color="white" />
              <Text className="text-white text-xs font-semibold mt-1">
                {isRecording ? 'Stop' : 'Voice'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo Preview */}
          {photoUri && (
            <View className="mb-6 relative">
              <RNImage
                source={{ uri: photoUri }}
                className="w-full h-64 rounded-2xl"
                resizeMode="cover"
              />
              <TouchableOpacity
                className="absolute top-3 right-3 bg-red-500 w-10 h-10 rounded-full items-center justify-center"
                onPress={removePhoto}
              >
                <X size={20} color="white" />
              </TouchableOpacity>
              <View className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-semibold">📷 Photo attached</Text>
              </View>
            </View>
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <View className="mb-6 bg-error/10 border-2 border-red-500 rounded-2xl p-6">
              <View className="flex-row items-center justify-center mb-3">
                <View className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse" />
                <Text className="text-red-600 font-bold text-lg">Recording...</Text>
              </View>
              <Text className="text-center text-3xl font-bold text-red-600">
                {formatDuration(recordingDuration)}
              </Text>
              <Text className="text-center text-sm text-gray-600 mt-2">
                Tap "Stop" when you're done
              </Text>
            </View>
          )}

          {/* Audio Playback */}
          {audioUri && !isRecording && (
            <View className="mb-6 bg-primary/5 border-2 border-purple-300 rounded-2xl p-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-primary rounded-full items-center justify-center mr-3">
                    <Mic size={24} color="white" />
                  </View>
                  <View>
                    <Text className="font-bold text-gray-800">Voice Recording</Text>
                    <Text className="text-sm text-gray-600">
                      {formatDuration(audioDuration)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="bg-red-100 p-2 rounded-lg"
                  onPress={removeAudio}
                >
                  <X size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              
              {/* Transcription Status */}
              {isTranscribing && (
                <View className="bg-background border border-blue-200 rounded-lg p-3 mb-3">
                  <Text className="text-blue-600 text-sm">
                    🎤 Transcribing audio...
                  </Text>
                </View>
              )}

              {/* Transcript Display */}
              {transcript && !isTranscribing && (
                <View className="bg-white border border-primary/20 rounded-lg p-3 mb-3">
                  <Text className="text-xs text-gray-500 mb-1">Transcript:</Text>
                  <Text className="text-gray-800">{transcript}</Text>
                </View>
              )}
              
              <TouchableOpacity
                className="bg-primary py-3 rounded-xl flex-row items-center justify-center"
                onPress={handlePlayAudio}
              >
                <Text className="text-white font-bold mr-2">
                  {isPlayingAudio ? '⏸ Pause' : '▶ Play'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Memory Title *
            </Text>
            <TextInput
              className="w-full p-3 border-2 border-gray-200 rounded-xl mb-1 text-gray-800"
              placeholder="e.g., First steps!"
              value={title}
              onChangeText={setTitle}
            />
            <Text className="text-xs text-gray-500 mb-4">
              e.g., "First words", "Park adventure", "Bedtime giggles"
            </Text>

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Is this a milestone? (Optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {milestoneOptions.map((option) => (
                  <TouchableOpacity
                    key={option || 'none'}
                    className={`px-4 py-3 rounded-xl border-2 ${
                      selectedMilestone === option 
                        ? 'bg-primary border-primary' 
                        : 'bg-white border-gray-200'
                    }`}
                    onPress={() => setSelectedMilestone(option)}
                  >
                    <Text className={`font-semibold ${
                      selectedMilestone === option ? 'text-white' : 'text-gray-700'
                    }`}>
                      {option === '' ? '✕ None' : option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Tell the story *
            </Text>
            <TextInput
              className="w-full p-3 border-2 border-gray-200 rounded-xl h-32 text-gray-800"
              placeholder="What happened? How did it make you feel? What do you want to remember?"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text className="text-xs text-gray-400 text-right mt-1">
              {content.length}/500 characters
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              💡 Tip: Capture the details you want to remember forever
            </Text>
            
            {/* AI Writing Assistant Section */}
            <View className="bg-primary/5 rounded-xl p-4 flex-row items-start gap-3 mt-4">
              <Sparkles size={20} color="#E07A5F" />
              <View className="flex-1">
                <Text className="text-sm text-purple-900 font-medium">
                  AI Writing Assistant
                </Text>
                <Text className="text-xs text-purple-700 mt-1">
                  Coming soon: AI help to expand your thoughts
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className={`py-4 rounded-xl flex-row items-center justify-center mt-6 ${
                saving ? 'bg-gray-400' : 'bg-primary'
              }`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">Saving...</Text>
                </>
              ) : (
                <>
                  <Check size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Save Memory</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity activeOpacity={1}>
              <View className="bg-white rounded-t-3xl">
                {/* Header */}
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-red-600 font-semibold text-lg">Cancel</Text>
                  </TouchableOpacity>
                  <Text className="font-bold text-gray-800 text-lg">Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-primary font-semibold text-lg">Done</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Date Picker */}
                <DateTimePicker
                  value={customDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setCustomDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                  textColor="#000000"
                />
                
                {/* Bottom padding for safe area */}
                <View className="h-8" />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}