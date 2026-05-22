// storage.js - Updated with Contributors feature (Child-Centric Model)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db, storage } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { uploadPhoto as uploadPhotoHelper, uploadAudio as uploadAudioHelper } from './storageHelper';
import { transcribeAudio } from './transcription';
import { getErrorMessage } from './errorHandler';
import { parseLocalDate } from './dateHelper';

// ==================== USER HELPERS ====================

const getUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No user logged in!');
    return null;
  }
  console.log('✅ User ID:', user.uid);
  return user.uid;
};

const getUserName = async () => {
  const userId = getUserId();
  if (!userId) return 'Unknown';
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().name || 'You';
    }
    return 'You';
  } catch (error) {
    console.error('Error getting user name:', error);
    return 'You';
  }
};

// ==================== MIGRATION ====================

export const needsMigration = async () => {
  const userId = getUserId();
  if (!userId) return false;

  try {
    // Check if user document has migrationCompleted flag
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data().migrationCompleted) {
      return false;
    }

    // Check if there are old-style children
    const oldChildrenRef = collection(db, 'users', userId, 'children');
    const oldChildrenSnapshot = await getDocs(oldChildrenRef);
    
    return !oldChildrenSnapshot.empty;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

export const migrateToNewStructure = async () => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  console.log('🔄 Starting migration...');

  try {
    // 1. Get user's old children
    const oldChildrenRef = collection(db, 'users', userId, 'children');
    const oldChildrenSnapshot = await getDocs(oldChildrenRef);
    
    if (oldChildrenSnapshot.empty) {
      console.log('✅ No children to migrate');
      await markMigrationComplete(userId);
      return;
    }

    const childrenAccessList = [];

    // 2. Migrate each child
    for (const oldChildDoc of oldChildrenSnapshot.docs) {
      const oldChildData = oldChildDoc.data();
      const newChildId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`📦 Migrating child: ${oldChildData.name} → ${newChildId}`);

      // Create new child document in /children
      const newChildData = {
        id: newChildId,
        name: oldChildData.name,
        birthdate: oldChildData.birthdate,
        avatar: oldChildData.avatar || '👶',
        ownerId: userId,
        contributors: [], // Empty array initially
        createdAt: oldChildData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'children', newChildId), newChildData);
      childrenAccessList.push(newChildId);

      // 3. Migrate memories for this child
      const oldMemoriesRef = collection(db, 'users', userId, 'memories');
      const memoriesQuery = query(oldMemoriesRef, where('childId', '==', oldChildDoc.id));
      const oldMemoriesSnapshot = await getDocs(memoriesQuery);

      console.log(`📝 Migrating ${oldMemoriesSnapshot.size} memories for ${oldChildData.name}`);

      for (const oldMemoryDoc of oldMemoriesSnapshot.docs) {
        const oldMemoryData = oldMemoryDoc.data();
        
        // Add author information
        const newMemoryData = {
          ...oldMemoryData,
          authorId: userId,
          authorName: await getUserName(),
          childId: newChildId, // Update to new child ID
        };

        // Create new memory under /children/{childId}/memories
        await setDoc(
          doc(db, 'children', newChildId, 'memories', oldMemoryDoc.id),
          newMemoryData
        );
      }

      // 4. Delete old child document (optional - can keep for backup)
      // await deleteDoc(doc(db, 'users', userId, 'children', oldChildDoc.id));
    }

    // 5. Update user document with childrenAccess list
    await setDoc(doc(db, 'users', userId), {
      email: auth.currentUser.email,
      name: await getUserName(),
      childrenAccess: childrenAccessList,
      migrationCompleted: true,
      migratedAt: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Migration complete!');
    
    // Reload children to reflect changes
    await loadChildren();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const markMigrationComplete = async (userId) => {
  await setDoc(doc(db, 'users', userId), {
    migrationCompleted: true,
    migratedAt: new Date().toISOString(),
  }, { merge: true });
};

// ==================== CHILDREN ====================

let cachedChildren = [];

export const loadChildren = async () => {
  const userId = getUserId();
  if (!userId) return [];

  try {
    console.log('📥 Loading children...');

    // Check if migration is needed
    if (await needsMigration()) {
      console.log('⚠️ Migration needed, triggering migration...');
      await migrateToNewStructure();
      return cachedChildren;
    }

    // Get user's childrenAccess list
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists() || !userDoc.data().childrenAccess) {
      console.log('📭 No children access found');
      cachedChildren = [];
      return [];
    }

    const childrenAccessList = userDoc.data().childrenAccess;
    console.log('🔑 User has access to:', childrenAccessList.length, 'children');

    // Load each child
    const childrenPromises = childrenAccessList.map(async (childId) => {
      const childDoc = await getDoc(doc(db, 'children', childId));
      if (childDoc.exists()) {
        return { id: childDoc.id, ...childDoc.data() };
      }
      return null;
    });

    const children = (await Promise.all(childrenPromises)).filter(c => c !== null);
    // Enforce actual access from child document as source of truth.
    // This prevents removed contributors from seeing child profiles if stale childrenAccess remains.
    const accessibleChildren = children.filter((child) => {
      if (!child) return false;
      if (child.ownerId === userId) return true;
      const contributors = Array.isArray(child.contributors) ? child.contributors : [];
      return contributors.includes(userId);
    });

    // Best-effort cleanup of stale childrenAccess entries in current user's document.
    const accessibleIds = accessibleChildren.map((child) => child.id);
    const hasStaleEntries = accessibleIds.length !== childrenAccessList.length ||
      childrenAccessList.some((id) => !accessibleIds.includes(id));
    if (hasStaleEntries) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          childrenAccess: accessibleIds,
        });
      } catch (cleanupError) {
        console.warn('Could not clean stale childrenAccess entries:', cleanupError);
      }
    }
    
    cachedChildren = accessibleChildren;
    console.log('✅ Loaded', accessibleChildren.length, 'children');
    return accessibleChildren;
    
  } catch (error) {
    console.error('❌ Error loading children:', error);
    return [];
  }
};

// addChild supports both: addChild({name, birthdate, avatar}) or addChild(name, birthdate, avatar)
export const addChild = async (nameOrData, birthdate, avatar) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    // Check subscription limits
    const { canAddChild } = require('./subscription');
    const currentChildren = await loadChildren();
    const canAdd = await canAddChild(currentChildren.length);
    
    if (!canAdd.canAdd) {
      const error = new Error(canAdd.reason);
      error.code = 'SUBSCRIPTION_LIMIT';
      throw error;
    }
    // Handle both calling patterns
    let name, birthdateValue, avatarValue;
    
    if (typeof nameOrData === 'object' && nameOrData.name) {
      // Called with object: addChild({name, birthdate, avatar})
      name = nameOrData.name;
      birthdateValue = nameOrData.birthdate;
      avatarValue = nameOrData.avatar;
    } else {
      // Called with individual params: addChild(name, birthdate, avatar)
      name = nameOrData;
      birthdateValue = birthdate;
      avatarValue = avatar;
    }

    const childId = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Handle additional properties if passed in object format
    const childData = {
      id: childId,
      name,
      birthdate: birthdateValue,
      avatar: avatarValue || '👶',
      avatarPhotoUrl: nameOrData?.avatarPhotoUrl || null, // Premium feature: photo URL
      ownerId: userId,
      contributors: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Preserve additional properties if called with object (like color)
    if (typeof nameOrData === 'object' && nameOrData) {
      Object.keys(nameOrData).forEach(key => {
        if (!['name', 'birthdate', 'avatar', 'avatarPhotoUrl'].includes(key)) {
          childData[key] = nameOrData[key];
        }
      });
    }

    // Create child document
    await setDoc(doc(db, 'children', childId), childData);

    // Add to user's childrenAccess
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentAccess = userDoc.exists() ? (userDoc.data().childrenAccess || []) : [];
    
    await setDoc(userRef, {
      childrenAccess: [...currentAccess, childId],
    }, { merge: true });

    await loadChildren();
    return childData;
    
  } catch (error) {
    console.error('❌ Error adding child:', error);
    throw error;
  }
};

export const updateChild = async (childId, updates) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    const childRef = doc(db, 'children', childId);
    const childDoc = await getDoc(childRef);
    
    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    // Check if user is owner
    if (childDoc.data().ownerId !== userId) {
      throw new Error('Only the owner can edit child details');
    }

    await updateDoc(childRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    await loadChildren();
    
    // Return the updated child data
    const updatedChildDoc = await getDoc(childRef);
    return updatedChildDoc.exists() ? { id: childId, ...updatedChildDoc.data() } : null;
    
  } catch (error) {
    console.error('❌ Error updating child:', error);
    throw error;
  }
};

export const deleteChild = async (childId, deleteMemories = false) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    const childRef = doc(db, 'children', childId);
    const childDoc = await getDoc(childRef);
    
    if (!childDoc.exists()) {
      throw new Error('Child not found');
    }

    // Check if user is owner
    if (childDoc.data().ownerId !== userId) {
      throw new Error('Only the owner can delete a child');
    }

    // Delete all memories for this child
    const memoriesRef = collection(db, 'children', childId, 'memories');
    const memoriesSnapshot = await getDocs(memoriesRef);
    
    for (const memoryDoc of memoriesSnapshot.docs) {
      await deleteDoc(memoryDoc.ref);
    }

    // Delete child document
    await deleteDoc(childRef);

    // Remove from user's childrenAccess
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentAccess = userDoc.data().childrenAccess || [];
    
    await updateDoc(userRef, {
      childrenAccess: currentAccess.filter(id => id !== childId),
    });

    await loadChildren();
    
    return true; // Return success
    
  } catch (error) {
    console.error('❌ Error deleting child:', error);
    throw error;
  }
};

export const getChildren = () => cachedChildren;

// Compatibility function: saveChildren
export const saveChildren = async (children) => {
  // In new structure, children are saved individually when added
  // This is kept for backward compatibility but doesn't do much
  return true;
};

// Legacy function - kept for backward compatibility
export const loadChild = async () => {
  try {
    const children = await loadChildren();
    if (children && children.length > 0) {
      return children[0];
    }
    return {
      name: 'Emma',
      birthdate: '2023-06-15',
      avatar: '👧'
    };
  } catch (error) {
    console.error('Error loading child:', error);
    return {
      name: 'Emma',
      birthdate: '2023-06-15',
      avatar: '👧'
    };
  }
};

// Legacy function - kept for backward compatibility
export const saveChild = async (child) => {
  try {
    await AsyncStorage.setItem('@child', JSON.stringify(child));
    return true;
  } catch (error) {
    console.error('Error saving child:', error);
    return false;
  }
};

// ==================== MEMORIES ====================

let cachedMemories = [];

export const loadMemories = async (childId = null) => {
  const userId = getUserId();
  if (!userId) return [];

  try {
    console.log('📥 Loading memories...');

    let allMemories = [];

    if (childId) {
      // Load memories for specific child
      const memoriesRef = collection(db, 'children', childId, 'memories');
      const memoriesSnapshot = await getDocs(memoriesRef);
      
      allMemories = memoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      // Load memories for all accessible children
      const children = await loadChildren();
      
      for (const child of children) {
        const memoriesRef = collection(db, 'children', child.id, 'memories');
        const memoriesSnapshot = await getDocs(memoriesRef);
        
        const childMemories = memoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        allMemories = [...allMemories, ...childMemories];
      }
    }

    // Sort by date (newest first)
    allMemories.sort((a, b) => {
      const dateA = a.date ? new Date(`${a.date} ${a.time || ''}`) : new Date(a.createdAt);
      const dateB = b.date ? new Date(`${b.date} ${b.time || ''}`) : new Date(b.createdAt);
      return dateB - dateA;
    });

    cachedMemories = allMemories;
    console.log('✅ Loaded', allMemories.length, 'memories');
    return allMemories;
    
  } catch (error) {
    console.error('❌ Error loading memories:', error);
    return [];
  }
};

// New API: addMemory(title, content, milestone, date, childId, type)
const addMemoryNew = async (title, content, milestone, date, childId, type = 'text') => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');
  if (!childId) throw new Error('Child ID required');

  try {
    // Check subscription limits for memories
    const { canAddMemory } = require('./subscription');
    const allMemories = await loadMemories();
    const childMemories = allMemories.filter(m => m.childId === childId);
    
    // Count memories for current month
    const now = new Date();
    const currentMonthMemories = childMemories.filter(memory => {
      // Parse date as local date to avoid timezone issues
      const memoryDate = parseLocalDate(memory.date);
      return memoryDate.getMonth() === now.getMonth() && 
             memoryDate.getFullYear() === now.getFullYear();
    });
    
    const canAdd = await canAddMemory(childId, currentMonthMemories.length);
    
    if (!canAdd.canAdd) {
      const error = new Error(canAdd.reason);
      error.code = 'SUBSCRIPTION_LIMIT';
      throw error;
    }
    
    const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const authorName = await getUserName();

    const memoryData = {
      id: memoryId,
      title,
      content,
      milestone: milestone || null,
      date: date || normalizeDateToString(new Date()),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      childId,
      type,
      authorId: userId,
      authorName: authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'children', childId, 'memories', memoryId), memoryData);
    await triggerBackfillSummaryCheck(childId, [memoryData.date]);

    console.log('✅ Memory saved successfully!');
    await loadMemories();
    
    return memoryData;
  } catch (error) {
    console.error('❌ Error adding memory:', error);
    throw error;
  }
};

// Helper function to normalize date to YYYY-MM-DD format in local timezone
// This prevents timezone issues where dates shift to previous/next day
const normalizeDateToString = (date) => {
  if (!date) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's already a string in YYYY-MM-DD format, return it
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Convert Date object to local date string (YYYY-MM-DD)
  // Use local date methods to avoid timezone conversion issues
  const dateObj = date instanceof Date ? date : new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const triggerBackfillSummaryCheck = async (childId, affectedDates = []) => {
  try {
    const validDates = affectedDates.filter(Boolean);
    if (!childId || validDates.length === 0) return;

    const { queuePastMonthSummaryRefreshes } = require('./autoMonthlySummary');
    queuePastMonthSummaryRefreshes(childId, validDates).catch((error) => {
      console.warn('Queue past-month summary refresh failed:', error);
    });
  } catch (error) {
    console.warn('Backfill monthly summary module unavailable:', error);
  }
};

// Compatibility API: addMemory(memory, childId, customDate)
export const addMemory = async (memory, childId, customDate = null) => {
  try {
    const date = normalizeDateToString(customDate);
    
    return await addMemoryNew(
      memory.title || '',
      memory.content || '',
      memory.milestone || null,
      date,
      childId,
      'text'
    );
  } catch (error) {
    console.error('❌ Error adding memory:', error);
    const message = getErrorMessage(error);
    throw new Error(message);
  }
};

// Add photo memory (using storageHelper for upload)
export const addPhotoMemory = async (memory, photoUri, childId, customDate = null) => {
  try {
    console.log('🔵 addPhotoMemory FUNCTION CALLED');
    
    const userId = getUserId();
    if (!userId) {
      throw new Error('You must be logged in to add memories');
    }
    
    const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoryDate = customDate || new Date();
    const dateString = normalizeDateToString(memoryDate);
    
    console.log('🔵 Uploading photo to Firebase Storage...');
    const photoData = await uploadPhotoHelper(photoUri, memoryId);
    
    console.log('🔵 Photo uploaded successfully!');
    
    const authorName = await getUserName();
    
    const newMemory = {
      id: memoryId,
      title: memory.title || '',
      content: memory.content || '',
      photoUrl: photoData.url,
      photoPath: photoData.path,
      childId: childId,
      type: 'photo',
      date: dateString,
      time: memoryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      authorId: userId,
      authorName: authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await setDoc(doc(db, 'children', childId, 'memories', memoryId), newMemory);
    await triggerBackfillSummaryCheck(childId, [newMemory.date]);
    await loadMemories();
    return newMemory;
  } catch (error) {
    console.error('🔴 ERROR in addPhotoMemory:', error);
    const message = getErrorMessage(error);
    throw new Error(message);
  }
};

// Add audio memory (using storageHelper for upload)
export const addAudioMemory = async (memory, audioUri, duration, childId, customDate = null) => {
  try {
    console.log('🔵 addAudioMemory FUNCTION CALLED');
    
    const userId = getUserId();
    if (!userId) {
      throw new Error('You must be logged in to add memories');
    }
    
    const memoryId = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoryDate = customDate || new Date();
    const dateString = normalizeDateToString(memoryDate);
    
    console.log('🔵 Uploading audio to Firebase Storage...');
    const audioData = await uploadAudioHelper(audioUri, memoryId);
    
    console.log('🔵 Audio uploaded successfully!');
    console.log('🔵 Starting transcription...');
    
    // Transcription with better error handling
    let transcript = '';
    try {
      transcript = await transcribeAudio(audioUri);
      if (transcript) {
        console.log('🔵 Transcription successful');
      } else {
        console.log('🔵 Transcription returned null, continuing without transcript');
      }
    } catch (transcriptError) {
      console.error('🔵 Transcription failed, continuing without transcript:', transcriptError);
      // Continue without transcript - don't fail the whole operation
    }
    
    const authorName = await getUserName();
    
    const newMemory = {
      id: memoryId,
      title: memory.title || '',
      content: memory.content || transcript || '',
      audioUrl: audioData.url,
      audioPath: audioData.path,
      audioDuration: Number(duration) || 0,
      transcript: transcript || '',
      childId: childId,
      type: 'audio',
      date: dateString,
      time: memoryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      authorId: userId,
      authorName: authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await setDoc(doc(db, 'children', childId, 'memories', memoryId), newMemory);
    await triggerBackfillSummaryCheck(childId, [newMemory.date]);
    await loadMemories();
    return newMemory;
  } catch (error) {
    console.error('🔴 ERROR in addAudioMemory:', error);
    const message = getErrorMessage(error);
    throw new Error(message);
  }
};

export const updateMemory = async (memoryId, updatedData) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    // Try to find the memory - need to search across all accessible children
    const children = await loadChildren();
    let memoryFound = false;
    let memoryChildId = null;

    for (const child of children) {
      const memoryRef = doc(db, 'children', child.id, 'memories', memoryId);
      const memoryDoc = await getDoc(memoryRef);
      
      if (memoryDoc.exists()) {
        memoryFound = true;
        memoryChildId = child.id;
        break;
      }
    }

    if (!memoryFound || !memoryChildId) {
      throw new Error('Memory not found');
    }

    const memoryRef = doc(db, 'children', memoryChildId, 'memories', memoryId);
    const memoryDoc = await getDoc(memoryRef);
    
    // Check if user is the author or owner of the child
    const childDoc = await getDoc(doc(db, 'children', memoryChildId));
    const isOwner = childDoc.exists() && childDoc.data().ownerId === userId;
    const isAuthor = memoryDoc.data().authorId === userId;
    
    if (!isOwner && !isAuthor) {
      throw new Error('You can only edit your own memories');
    }

    const previousDate = memoryDoc.data().date;
    const nextDate = updatedData.date || previousDate;

    await updateDoc(memoryRef, {
      ...updatedData,
      updatedAt: new Date().toISOString(),
    });

    await triggerBackfillSummaryCheck(memoryChildId, [previousDate, nextDate]);
    await loadMemories();
    return true;
    
  } catch (error) {
    console.error('❌ Error updating memory:', error);
    throw error;
  }
};

export const deleteMemory = async (memoryId, childId = null) => {
  const userId = getUserId();
  if (!userId) throw new Error('User not logged in');

  try {
    let memoryFound = false;
    let memoryChildId = childId;

    // If childId not provided, search for the memory
    if (!memoryChildId) {
      const children = await loadChildren();
      for (const child of children) {
        const memoryRef = doc(db, 'children', child.id, 'memories', memoryId);
        const memoryDoc = await getDoc(memoryRef);
        
        if (memoryDoc.exists()) {
          memoryFound = true;
          memoryChildId = child.id;
          break;
        }
      }
    } else {
      const memoryRef = doc(db, 'children', memoryChildId, 'memories', memoryId);
      const memoryDoc = await getDoc(memoryRef);
      memoryFound = memoryDoc.exists();
    }

    if (!memoryFound || !memoryChildId) {
      throw new Error('Memory not found');
    }

    const memoryRef = doc(db, 'children', memoryChildId, 'memories', memoryId);
    const memoryDoc = await getDoc(memoryRef);

    // Check if user is the author or owner of the child
    const childDoc = await getDoc(doc(db, 'children', memoryChildId));
    const isOwner = childDoc.exists() && childDoc.data().ownerId === userId;
    const isAuthor = memoryDoc.data().authorId === userId;
    
    if (!isOwner && !isAuthor) {
      throw new Error('You can only delete your own memories');
    }

    await deleteDoc(memoryRef);
    // Intentionally no backfill email on delete — avoids inbox clutter when cleaning up memories.
    await loadMemories();
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting memory:', error);
    throw error;
  }
};

export const getMemories = () => cachedMemories;

// Get memories for specific child
export const getMemoriesForChild = async (childId) => {
  try {
    console.log('🔍 getMemoriesForChild called with childId:', childId);
    
    const memoriesRef = collection(db, 'children', childId, 'memories');
    const snapshot = await getDocs(memoriesRef);
    
    console.log('🔍 Query complete. Documents found:', snapshot.docs.length);
    
    const memories = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('🔍 Memory found:', data.id, 'childId:', data.childId);
      return { id: doc.id, ...data };
    });
    
    // Sort by date (newest first)
    memories.sort((a, b) => {
      const dateA = a.date ? new Date(`${a.date} ${a.time || ''}`) : new Date(a.createdAt);
      const dateB = b.date ? new Date(`${b.date} ${b.time || ''}`) : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    console.log('🔍 Returning', memories.length, 'memories for child', childId);
    
    return memories;
  } catch (error) {
    console.error('🔍 Error getting child memories:', error);
    console.error('🔍 Error message:', error.message);
    return [];
  }
};

// Compatibility function: saveMemories
export const saveMemories = async (memories) => {
  // In new structure, memories are saved individually when added
  // This is kept for backward compatibility but doesn't do much
  return true;
};

// ==================== UTILITY FUNCTIONS ====================

// Clear all data
export const clearAllData = async () => {
  try {
    const userId = getUserId();
    
    // Delete all accessible children and their memories
    const children = await loadChildren();
    for (const child of children) {
      await deleteChild(child.id);
    }
    
    // Clear AsyncStorage
    await AsyncStorage.clear();
    
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};

// ==================== PHOTO/AUDIO UPLOAD (Exported for compatibility) ====================

export const uploadPhoto = async (uri, childId) => {
  // Use storageHelper for consistency
  const memoryId = `temp_${Date.now()}`;
  const result = await uploadPhotoHelper(uri, memoryId);
  return result.url;
};

export const uploadAudio = async (uri, childId) => {
  // Use storageHelper for consistency
  const memoryId = `temp_${Date.now()}`;
  const result = await uploadAudioHelper(uri, memoryId);
  return result.url;
};
