import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StatusBar, Modal, Image } from 'react-native';
import { ArrowLeft, Heart, Calendar, Camera, X, Crown, Image as ImageIcon } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { addChild, loadChildren } from '../utils/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import EmailTipModal from '../components/EmailTipModal';
import { canAddChild, isPremium } from '../utils/subscription';
import * as ImagePicker from 'expo-image-picker';
import { uploadChildAvatar } from '../utils/storageHelper';
import ChildAvatar from '../components/ChildAvatar';

export default function AddChildScreen({ navigation }) {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [selectedBirthdate, setSelectedBirthdate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('👶');
  const [avatarPhotoUri, setAvatarPhotoUri] = useState(null);
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEmailTip, setShowEmailTip] = useState(false);
  const [isUserPremium, setIsUserPremium] = useState(false);

  // Check if this is the first child being added and premium status
  useEffect(() => {
    checkIfFirstChild();
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const premium = await isPremium();
      setIsUserPremium(premium);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const checkIfFirstChild = async () => {
    try {
      const children = await loadChildren();
      // Show tip if this is the first child
      if (children.length === 0) {
        setShowEmailTip(true);
      }
    } catch (error) {
      console.error('Error checking children:', error);
    }
  };

  const avatars = ['👶', '👧', '👦', '🧒', '👨', '👩', '🧑', '👪'];

  const handlePickPhoto = async () => {
    // Check premium status
    const premium = await isPremium();
    if (!premium) {
      Alert.alert(
        'Premium Feature',
        'Photo avatars are a Premium feature. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Premium') }
        ]
      );
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to upload photos.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    // Check premium status
    const premium = await isPremium();
    if (!premium) {
      Alert.alert(
        'Premium Feature',
        'Photo avatars are a Premium feature. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Premium') }
        ]
      );
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera access to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    setAvatarPhotoUri(null);
    setAvatarPhotoUrl(null);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (event, selectedDate) => {
    if (selectedDate) {
      setSelectedBirthdate(selectedDate);
      setBirthdate(formatDate(selectedDate));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter a name');
      return;
    }

    if (!birthdate.trim() || !selectedBirthdate) {
      Alert.alert('Missing Info', 'Please select a birthdate');
      return;
    }

    // Check subscription limits before adding
    try {
      const children = await loadChildren();
      const canAdd = await canAddChild(children.length);
      
      if (!canAdd.canAdd) {
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
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    setSaving(true);
    try {
      let avatarPhotoUrlToSave = null;
      
      // Upload photo if selected (premium feature)
      if (avatarPhotoUri && isUserPremium) {
        setUploadingPhoto(true);
        try {
          // Create temporary child ID for upload
          const tempChildId = `temp_${Date.now()}`;
          const uploadResult = await uploadChildAvatar(avatarPhotoUri, tempChildId);
          avatarPhotoUrlToSave = uploadResult.url;
          setAvatarPhotoUrl(uploadResult.url);
        } catch (uploadError) {
          console.error('Error uploading avatar photo:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload photo. Saving with emoji avatar instead.');
        } finally {
          setUploadingPhoto(false);
        }
      }

    const newChild = await addChild({
      name: name.trim(),
      birthdate: birthdate.trim(),
      avatar: selectedAvatar,
        avatarPhotoUrl: avatarPhotoUrlToSave
    });
    setSaving(false);

    if (newChild) {
      Alert.alert('Success!', `${name} has been added!`, [
        { text: 'OK', onPress: () => navigation.navigate('Tabs', { screen: 'Home' }) }
      ]);
    } else {
      Alert.alert('Error', 'Failed to add child. Please try again.');
      }
    } catch (error) {
      setSaving(false);
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
        Alert.alert('Error', error.message || 'Failed to add child. Please try again.');
      }
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-primary p-4 flex-row items-center" style={{ paddingTop: 70 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Add Child</Text>
        </View>

        <View className="p-6">
          {/* Preview Card */}
          <View className="bg-gradient-to-br from-green-400 to-emerald-500 p-6 rounded-2xl mb-6 items-center">
          <View style={{ paddingTop: 8, paddingBottom: 8, marginBottom: 10, overflow: 'visible' }}>
              <ChildAvatar
                avatar={selectedAvatar}
                avatarPhotoUrl={avatarPhotoUrl || (avatarPhotoUri ? avatarPhotoUri : null)}
                size={120}
              />
          </View>
            <Text className="text-2xl font-bold text-gray-800">
              {name || 'Child Name'}
            </Text>
            {selectedBirthdate && (
              <Text className="text-gray-600 mt-1">
                {selectedBirthdate.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            )}
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Child's Name *
            </Text>
            <TextInput
              className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 text-gray-800"
              placeholder="e.g., Emma"
              value={name}
              onChangeText={setName}
            />

            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Birthdate *
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl mb-4 flex-row items-center justify-between"
            >
              <Text className={`text-gray-800 ${!selectedBirthdate ? 'text-gray-400' : ''}`}>
                {selectedBirthdate 
                  ? selectedBirthdate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : 'Tap to select birthdate'
                }
              </Text>
              <Calendar size={20} color="#87C38F" />
            </TouchableOpacity>

            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Choose Photo
            </Text>
            
            {/* Photo Upload (Premium Only) */}
            {isUserPremium && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Crown size={16} color="#F59E0B" />
                  <Text className="text-xs text-primary font-semibold ml-1">Premium Feature</Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleTakePhoto}
                    className="flex-1 bg-primary/10 border-2 border-primary/30 rounded-xl p-4 items-center"
                    disabled={uploadingPhoto}
                  >
                    <Camera size={24} color="#87C38F" />
                    <Text className="text-primary font-semibold mt-2 text-sm">Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePickPhoto}
                    className="flex-1 bg-primary/10 border-2 border-primary/30 rounded-xl p-4 items-center"
                    disabled={uploadingPhoto}
                  >
                    <ImageIcon size={24} color="#87C38F" />
                    <Text className="text-primary font-semibold mt-2 text-sm">Choose Photo</Text>
                  </TouchableOpacity>
                </View>
                {avatarPhotoUri && (
                  <TouchableOpacity
                    onPress={handleRemovePhoto}
                    className="mt-2 bg-red-50 border border-red-200 rounded-xl p-2 flex-row items-center justify-center"
                  >
                    <X size={16} color="#ef4444" />
                    <Text className="text-red-600 font-semibold ml-2 text-sm">Remove Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Emoji Avatars */}
            <Text className="text-sm text-gray-600 mb-2">
              {isUserPremium ? 'Or choose an emoji:' : 'Choose an emoji:'}
            </Text>
            <View className="flex-row flex-wrap gap-3 mb-4">
              {avatars.map((avatar) => (
                <TouchableOpacity
                  key={avatar}
                  onPress={() => {
                    setSelectedAvatar(avatar);
                    // Clear photo when emoji is selected
                    if (avatarPhotoUri) {
                      setAvatarPhotoUri(null);
                      setAvatarPhotoUrl(null);
                    }
                  }}
                  className={`w-16 h-16 rounded-xl items-center justify-center ${
                    selectedAvatar === avatar && !avatarPhotoUri
                      ? 'bg-primary-light border-2 border-primary'
                      : 'bg-gray-100'
                  }`}
                  disabled={!!avatarPhotoUri}
                >
                  <Text className="text-3xl">{avatar}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!isUserPremium && (
                <TouchableOpacity
                onPress={() => navigation.navigate('Premium')}
                className="mb-4 bg-primary/10 border border-primary/30 rounded-xl p-3 flex-row items-center justify-center"
              >
                <Crown size={16} color="#F59E0B" />
                <Text className="text-primary font-semibold ml-2 text-sm">
                  Upgrade to Premium to upload photos
                  </Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
              className={`w-full py-4 rounded-xl flex-row items-center justify-center ${
                saving || uploadingPhoto ? 'bg-gray-400' : 'bg-primary'
              }`}
              onPress={handleSave}
              disabled={saving || uploadingPhoto}
            >
              <Heart size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                {uploadingPhoto ? 'Uploading photo...' : saving ? 'Adding...' : 'Add Child'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Email Tip Modal */}
      <EmailTipModal 
        visible={showEmailTip} 
        onDismiss={() => setShowEmailTip(false)}
      />

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
                  <Text className="font-bold text-gray-800 text-lg">Select Birthdate</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text className="text-primary font-semibold text-lg">Done</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Date Picker */}
                <DateTimePicker
                  value={selectedBirthdate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateSelect}
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