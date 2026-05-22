import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  TRIAL: 'trial', // Trial is treated as premium but with expiration
};

// Trial configuration
export const TRIAL_CONFIG = {
  DURATION_DAYS: 14,
};

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_CHILDREN: 1,
  MAX_MEMORIES_PER_CHILD_PER_MONTH: 20,
  MAX_STORAGE_MB: 50,
  MAX_CONTRIBUTORS_PER_CHILD: 0, // Owner only
  AUTO_MONTHLY_SUMMARIES: false,
  AUTO_BACKUP: false,
  VIDEO_MEMORIES: false,
  MULTIPLE_PHOTOS_PER_MEMORY: false,
};

// Premium tier limits (unlimited or high limits)
export const PREMIUM_TIERS_LIMITS = {
  MAX_CHILDREN: Infinity,
  MAX_MEMORIES_PER_CHILD_PER_MONTH: Infinity,
  MAX_STORAGE_MB: Infinity,
  MAX_CONTRIBUTORS_PER_CHILD: Infinity,
  AUTO_MONTHLY_SUMMARIES: true,
  AUTO_BACKUP: true,
  VIDEO_MEMORIES: true,
  MULTIPLE_PHOTOS_PER_MEMORY: true,
};

/**
 * Check if trial is currently active
 * @param {Object} userData - User document data
 * @returns {boolean}
 */
export const isTrialActive = (userData) => {
  if (!userData || !userData.trialUsed || !userData.trialStartDate || !userData.trialEndDate) {
    return false;
  }

  const now = new Date();
  const trialStart = userData.trialStartDate.toDate ? userData.trialStartDate.toDate() : new Date(userData.trialStartDate);
  const trialEnd = userData.trialEndDate.toDate ? userData.trialEndDate.toDate() : new Date(userData.trialEndDate);

  return now >= trialStart && now <= trialEnd;
};

/**
 * Check if trial has expired
 * @param {Object} userData - User document data
 * @returns {boolean}
 */
export const hasTrialExpired = (userData) => {
  if (!userData || !userData.trialUsed || !userData.trialEndDate) {
    return false;
  }

  const now = new Date();
  const trialEnd = userData.trialEndDate.toDate ? userData.trialEndDate.toDate() : new Date(userData.trialEndDate);

  return now > trialEnd;
};

/**
 * Get days remaining in trial
 * @param {Object} userData - User document data
 * @returns {number|null} Days remaining or null if no active trial
 */
export const getTrialDaysRemaining = (userData) => {
  if (!isTrialActive(userData)) {
    return null;
  }

  const now = new Date();
  const trialEnd = userData.trialEndDate.toDate ? userData.trialEndDate.toDate() : new Date(userData.trialEndDate);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Activate 14-day premium trial for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Trial information
 */
export const activateTrial = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    // Check if user already has premium subscription (don't override)
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.subscriptionTier === SUBSCRIPTION_TIERS.PREMIUM && !isTrialActive(userData)) {
        console.log('User already has premium subscription, skipping trial');
        return null;
      }
      
      // Check if trial was already used
      if (userData.trialUsed) {
        console.log('User already used their trial');
        return null;
      }
    }

    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_CONFIG.DURATION_DAYS);

    const trialData = {
      trialUsed: true,
      trialStartDate: now.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      subscriptionTier: SUBSCRIPTION_TIERS.PREMIUM, // Set to premium during trial
    };

    await setDoc(userRef, trialData, { merge: true });

    console.log(`✅ 14-day premium trial activated for user ${userId}`);
    console.log(`   Trial ends: ${trialEndDate.toLocaleDateString()}`);

    return {
      startDate: now,
      endDate: trialEndDate,
      daysRemaining: TRIAL_CONFIG.DURATION_DAYS,
    };
  } catch (error) {
    console.error('Error activating trial:', error);
    throw error;
  }
};

/**
 * Check and expire trial if needed
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if trial was expired, false otherwise
 */
export const checkAndExpireTrial = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    
    // If trial has expired and user is still on premium (from trial), check for real subscription
    if (hasTrialExpired(userData) && userData.subscriptionTier === SUBSCRIPTION_TIERS.PREMIUM) {
      // Check if they have a real premium subscription via RevenueCat
      try {
        const { hasActiveSubscription } = require('./revenueCat');
        const hasRealSubscription = await hasActiveSubscription();
        
        // Only revert to free if they don't have a real subscription
        if (!hasRealSubscription) {
          await setDoc(userRef, {
            subscriptionTier: SUBSCRIPTION_TIERS.FREE,
          }, { merge: true });

          console.log(`⏰ Trial expired for user ${userId}, reverted to free tier`);
          return true;
        } else {
          console.log(`✅ User ${userId} has real subscription, keeping premium despite expired trial`);
        }
      } catch (revenueCatError) {
        // If RevenueCat check fails, still revert to free (trial expired)
        console.warn('Error checking RevenueCat subscription, reverting to free:', revenueCatError);
        await setDoc(userRef, {
          subscriptionTier: SUBSCRIPTION_TIERS.FREE,
        }, { merge: true });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking trial expiration:', error);
    return false;
  }
};

/**
 * Get current user's subscription tier
 * @returns {Promise<string>} 'free', 'premium', or 'trial'
 */
export const getSubscriptionTier = async (forceRefresh = false) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('🔍 getSubscriptionTier: No user, returning FREE');
      return SUBSCRIPTION_TIERS.FREE;
    }

    const userRef = doc(db, 'users', user.uid);
    
    // If forceRefresh is true, add a small delay to ensure Firestore has processed the update
    if (forceRefresh) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Force a fresh read from server (no cache)
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('🔍 getSubscriptionTier: Raw userData.subscriptionTier =', userData.subscriptionTier);
      console.log('🔍 getSubscriptionTier: userData keys =', Object.keys(userData));
      
      // Check if trial has expired and needs to be reverted
      // Only check if subscriptionTier is PREMIUM (to avoid interfering with explicit FREE setting)
      if (userData.subscriptionTier === SUBSCRIPTION_TIERS.PREMIUM) {
        await checkAndExpireTrial(user.uid);
        
        // Re-fetch after potential update (force fresh read)
        const updatedUserDoc = await getDoc(userRef);
        const updatedUserData = updatedUserDoc.data();
        console.log('🔍 getSubscriptionTier: After checkAndExpireTrial, subscriptionTier =', updatedUserData.subscriptionTier);
        
        // If subscriptionTier is explicitly set to FREE, respect it (even if trial is active)
        // This allows testing/override functionality to work
        if (updatedUserData.subscriptionTier === SUBSCRIPTION_TIERS.FREE) {
          console.log('🔍 getSubscriptionTier: Returning FREE (explicitly set)');
          return SUBSCRIPTION_TIERS.FREE;
        }
        
        // Check if trial is active (only if subscriptionTier is not explicitly FREE)
        if (isTrialActive(updatedUserData)) {
          console.log('🔍 getSubscriptionTier: Returning PREMIUM (trial active)');
          return SUBSCRIPTION_TIERS.PREMIUM; // Trial users get premium access
        }
        
        // Return regular subscription tier
        const tier = updatedUserData.subscriptionTier || SUBSCRIPTION_TIERS.FREE;
        console.log('🔍 getSubscriptionTier: Returning tier =', tier);
        return tier;
      } else {
        // If subscriptionTier is already FREE, don't check trial expiration
        console.log('🔍 getSubscriptionTier: subscriptionTier is FREE, returning FREE');
        return SUBSCRIPTION_TIERS.FREE;
      }
    }

    // Default to free tier for new users
    console.log('🔍 getSubscriptionTier: User doc does not exist, returning FREE');
    return SUBSCRIPTION_TIERS.FREE;
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    return SUBSCRIPTION_TIERS.FREE;
  }
};

/**
 * Check if user has premium subscription (including active trial)
 * @returns {Promise<boolean>}
 */
export const isPremium = async () => {
  const tier = await getSubscriptionTier();
  return tier === SUBSCRIPTION_TIERS.PREMIUM;
};

/**
 * Check if user has premium access (own subscription OR inherited from child owner)
 * @param {string} childId - Optional child ID to check owner's premium status
 * @returns {Promise<boolean>}
 */
export const hasPremiumAccess = async (childId = null) => {
  try {
    // First check if user has their own premium subscription
    const ownPremium = await isPremium();
    if (ownPremium) {
      return true;
    }

    // If no childId provided, return false (can't check inheritance)
    if (!childId) {
      return false;
    }

    // Check if user is a contributor to a child whose owner has premium
    const { doc, getDoc } = require('firebase/firestore');
    const { db, auth } = require('./firebase');
    
    const childDoc = await getDoc(doc(db, 'children', childId));
    if (!childDoc.exists()) {
      return false;
    }

    const childData = childDoc.data();
    const ownerId = childData.ownerId;
    const contributors = childData.contributors || [];
    const currentUserId = auth.currentUser?.uid;

    // Check if current user is owner or contributor
    const isOwner = ownerId === currentUserId;
    const isContributor = contributors.includes(currentUserId);

    if (!isOwner && !isContributor) {
      return false; // User doesn't have access to this child
    }

    // If user is the owner, check their own premium (already checked above)
    // This ensures owners of their own children use their own premium status,
    // not inherited premium from other children they contribute to
    if (isOwner) {
      return ownPremium;
    }

    // If user is a contributor (not owner), check if owner has premium
    // This allows contributors to inherit premium features ONLY for this specific child
    if (isContributor && ownerId) {
      const ownerDoc = await getDoc(doc(db, 'users', ownerId));
      if (ownerDoc.exists()) {
        const ownerData = ownerDoc.data();
        // Check if owner has premium (including active trial)
        if (ownerData.subscriptionTier === SUBSCRIPTION_TIERS.PREMIUM) {
          // Check if owner's trial has expired
          if (hasTrialExpired(ownerData)) {
            return false; // Owner's trial expired
          }
          // Owner has premium (either real subscription or active trial)
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking premium access:', error);
    return false;
  }
};

/**
 * Check if user is on trial
 * @returns {Promise<boolean>}
 */
export const isOnTrial = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return false;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return isTrialActive(userData);
    }

    return false;
  } catch (error) {
    console.error('Error checking trial status:', error);
    return false;
  }
};

/**
 * Get trial information for current user
 * @returns {Promise<Object|null>} Trial info or null if no active trial
 */
export const getTrialInfo = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      if (isTrialActive(userData)) {
        const daysRemaining = getTrialDaysRemaining(userData);
        const trialStart = userData.trialStartDate.toDate ? userData.trialStartDate.toDate() : new Date(userData.trialStartDate);
        const trialEnd = userData.trialEndDate.toDate ? userData.trialEndDate.toDate() : new Date(userData.trialEndDate);
        
        return {
          isActive: true,
          daysRemaining,
          startDate: trialStart,
          endDate: trialEnd,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting trial info:', error);
    return null;
  }
};

/**
 * Get limits for current user's subscription tier
 * @param {string} childId - Optional child ID to check for inherited premium
 * @returns {Promise<Object>}
 */
export const getSubscriptionLimits = async (childId = null) => {
  const hasPremium = childId 
    ? await hasPremiumAccess(childId)
    : await isPremium();
  return hasPremium 
    ? PREMIUM_TIERS_LIMITS 
    : FREE_TIER_LIMITS;
};

/**
 * Set user's subscription tier (for admin/testing purposes)
 * @param {string} tier - 'free' or 'premium'
 * @param {boolean} clearTrial - If true, clears trial data (use when activating real subscription)
 */
export const setSubscriptionTier = async (tier, clearTrial = false) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }

    if (!Object.values(SUBSCRIPTION_TIERS).includes(tier)) {
      throw new Error('Invalid subscription tier');
    }

    const updateData = { subscriptionTier: tier };
    
    // If clearing trial (e.g., when real purchase is made), remove trial data
    if (clearTrial) {
      updateData.trialUsed = false;
      updateData.trialStartDate = null;
      updateData.trialEndDate = null;
      console.log('🧹 Clearing trial data as real subscription is now active');
    }

    await setDoc(
      doc(db, 'users', user.uid),
      updateData,
      { merge: true }
    );

    console.log(`✅ Subscription tier set to: ${tier}${clearTrial ? ' (trial cleared)' : ''}`);
  } catch (error) {
    console.error('Error setting subscription tier:', error);
    throw error;
  }
};

/**
 * Check if user can add another child
 * @param {number} currentChildrenCount - Current number of children
 * @returns {Promise<{canAdd: boolean, reason?: string}>}
 */
export const canAddChild = async (currentChildrenCount) => {
  const limits = await getSubscriptionLimits();
  
  if (currentChildrenCount >= limits.MAX_CHILDREN) {
    return {
      canAdd: false,
      reason: `Free tier allows only ${limits.MAX_CHILDREN} child. Upgrade to Premium for unlimited children.`,
    };
  }

  return { canAdd: true };
};

/**
 * Check if user can add another memory for a child this month
 * @param {string} childId - Child ID
 * @param {number} currentMonthMemoriesCount - Number of memories this month
 * @returns {Promise<{canAdd: boolean, reason?: string, limit?: number}>}
 */
export const canAddMemory = async (childId, currentMonthMemoriesCount) => {
  const limits = await getSubscriptionLimits(childId);
  
  if (currentMonthMemoriesCount >= limits.MAX_MEMORIES_PER_CHILD_PER_MONTH) {
    return {
      canAdd: false,
      reason: `You've reached the free tier limit of ${limits.MAX_MEMORIES_PER_CHILD_PER_MONTH} memories per child per month. Upgrade to Premium for unlimited memories.`,
      limit: limits.MAX_MEMORIES_PER_CHILD_PER_MONTH,
    };
  }

  return { 
    canAdd: true,
    remaining: limits.MAX_MEMORIES_PER_CHILD_PER_MONTH - currentMonthMemoriesCount,
  };
};

/**
 * Check if user can add contributors
 * @param {number} currentContributorsCount - Current number of contributors (excluding owner)
 * @param {string} childId - Optional child ID to check for inherited premium
 * @returns {Promise<{canAdd: boolean, reason?: string}>}
 */
export const canAddContributor = async (currentContributorsCount, childId = null) => {
  const limits = await getSubscriptionLimits(childId);
  const tier = await getSubscriptionTier();
  
  console.log('🔍 canAddContributor:', {
    currentContributorsCount,
    maxContributors: limits.MAX_CONTRIBUTORS_PER_CHILD,
    tier,
    canAdd: currentContributorsCount < limits.MAX_CONTRIBUTORS_PER_CHILD
  });
  
  if (currentContributorsCount >= limits.MAX_CONTRIBUTORS_PER_CHILD) {
    return {
      canAdd: false,
      reason: 'Adding contributors is a Premium feature. Upgrade to share memories with family members.',
    };
  }

  return { canAdd: true };
};

/**
 * Check if user can use auto monthly summaries
 * @returns {Promise<boolean>}
 */
export const canUseAutoMonthlySummaries = async () => {
  const limits = await getSubscriptionLimits();
  return limits.AUTO_MONTHLY_SUMMARIES;
};

/**
 * Check if user can use auto backup
 * @returns {Promise<boolean>}
 */
export const canUseAutoBackup = async () => {
  const limits = await getSubscriptionLimits();
  return limits.AUTO_BACKUP;
};

/**
 * Get storage usage in MB
 * @param {Array} memories - Array of memory objects
 * @returns {number} Storage used in MB (approximate)
 */
export const calculateStorageUsage = (memories) => {
  // Approximate: photos ~2MB each, audio ~1MB per minute
  let totalMB = 0;
  
  memories.forEach(memory => {
    if (memory.photoUrl || memory.photoUri) {
      totalMB += 2; // Approximate 2MB per photo
    }
    if (memory.audioUrl || memory.audioUri) {
      // Assume average 1 minute = 1MB
      const duration = memory.duration || 60; // Default 1 minute
      totalMB += duration / 60; // Convert seconds to minutes, then to MB
    }
  });
  
  return Math.round(totalMB * 100) / 100; // Round to 2 decimal places
};

/**
 * Check if user can add more storage
 * @param {Array} memories - Array of all memories
 * @param {number} newItemSizeMB - Size of new item in MB
 * @returns {Promise<{canAdd: boolean, reason?: string, currentUsage?: number, limit?: number}>}
 */
export const canAddStorage = async (memories, newItemSizeMB = 2) => {
  const limits = await getSubscriptionLimits();
  const currentUsage = calculateStorageUsage(memories);
  const projectedUsage = currentUsage + newItemSizeMB;
  
  if (projectedUsage > limits.MAX_STORAGE_MB) {
    return {
      canAdd: false,
      reason: `You've reached the free tier storage limit of ${limits.MAX_STORAGE_MB}MB. Upgrade to Premium for unlimited storage.`,
      currentUsage,
      limit: limits.MAX_STORAGE_MB,
    };
  }

  return {
    canAdd: true,
    currentUsage,
    remaining: limits.MAX_STORAGE_MB - currentUsage,
  };
};

