import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, auth } from './firebase';
import * as FileSystem from 'expo-file-system/legacy';

// Get current user ID
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  return user.uid;
};

// Upload photo to Firebase Storage
export const uploadPhoto = async (localUri, memoryId) => {
  try {
    console.log('📸 Uploading photo:', localUri);
    
    const userId = getUserId();
    
    // Read file as blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // Create storage reference
    const filename = `photo_${memoryId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `users/${userId}/photos/${filename}`);
    
    console.log('📸 Storage path:', storageRef.fullPath);
    
    // Upload file
    await uploadBytes(storageRef, blob);
    
    console.log('📸 Upload complete, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('📸 Photo uploaded successfully:', downloadURL);
    
    return {
      url: downloadURL,
      path: storageRef.fullPath
    };
  } catch (error) {
    console.error('📸 Error uploading photo:', error);
    console.error('📸 Error details:', error.message);
    throw error;
  }
};

// Upload audio to Firebase Storage
export const uploadAudio = async (localUri, memoryId) => {
  try {
    console.log('🎤 Uploading audio:', localUri);
    
    const userId = getUserId();
    
    // Read file as blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // Create storage reference
    const filename = `audio_${memoryId}_${Date.now()}.m4a`;
    const storageRef = ref(storage, `users/${userId}/audio/${filename}`);
    
    console.log('🎤 Storage path:', storageRef.fullPath);
    
    // Upload file
    await uploadBytes(storageRef, blob);
    
    console.log('🎤 Upload complete, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('🎤 Audio uploaded successfully:', downloadURL);
    
    return {
      url: downloadURL,
      path: storageRef.fullPath
    };
  } catch (error) {
    console.error('🎤 Error uploading audio:', error);
    console.error('🎤 Error details:', error.message);
    throw error;
  }
};

// Delete photo from Firebase Storage
export const deletePhoto = async (storagePath) => {
  try {
    if (!storagePath) return;
    
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    
    console.log('📸 Photo deleted:', storagePath);
  } catch (error) {
    console.error('📸 Error deleting photo:', error);
  }
};

// Delete audio from Firebase Storage
export const deleteAudio = async (storagePath) => {
  try {
    if (!storagePath) return;
    
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    
    console.log('🎤 Audio deleted:', storagePath);
  } catch (error) {
    console.error('🎤 Error deleting audio:', error);
  }
};

// Upload child avatar photo to Firebase Storage
export const uploadChildAvatar = async (localUri, childId) => {
  try {
    console.log('👶 Uploading child avatar:', localUri);
    
    const userId = getUserId();
    
    // Read file as blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // Create storage reference
    const filename = `avatar_${childId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `users/${userId}/child_avatars/${filename}`);
    
    console.log('👶 Storage path:', storageRef.fullPath);
    
    // Upload file
    await uploadBytes(storageRef, blob);
    
    console.log('👶 Upload complete, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('👶 Avatar uploaded successfully:', downloadURL);
    
    return {
      url: downloadURL,
      path: storageRef.fullPath
    };
  } catch (error) {
    console.error('👶 Error uploading child avatar:', error);
    console.error('👶 Error details:', error.message);
    throw error;
  }
};

// Delete child avatar from Firebase Storage
export const deleteChildAvatar = async (storagePath) => {
  try {
    if (!storagePath) return;
    
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    
    console.log('👶 Child avatar deleted:', storagePath);
  } catch (error) {
    console.error('👶 Error deleting child avatar:', error);
  }
};