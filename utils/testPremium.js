/**
 * Testing Utility for Premium Features
 * 
 * This file provides utilities to test premium features without making actual purchases.
 * 
 * IMPORTANT: Remove or disable this in production builds!
 */

import { setSubscriptionTier, getSubscriptionTier, SUBSCRIPTION_TIERS } from './subscription';
import { Alert } from 'react-native';

/**
 * Toggle premium status for testing
 * @param {boolean} enable - true to enable premium, false to disable
 */
export const togglePremiumForTesting = async (enable = true) => {
  try {
    const { doc, getDoc, setDoc } = require('firebase/firestore');
    const { db, auth } = require('./firebase');
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (enable) {
      // Enable premium - set tier to premium
      const tier = SUBSCRIPTION_TIERS.PREMIUM;
      await setDoc(userRef, {
        subscriptionTier: tier,
        // Clear trial data if disabling trial
        trialUsed: false,
        trialStartDate: null,
        trialEndDate: null,
      }, { merge: true });
    } else {
      // Disable premium - set tier to free AND clear trial data
      const tier = SUBSCRIPTION_TIERS.FREE;
      await setDoc(userRef, {
        subscriptionTier: tier,
        // Clear trial data to prevent trial from overriding
        trialUsed: false,
        trialStartDate: null,
        trialEndDate: null,
      }, { merge: true });
    }
    
    const currentTier = await getSubscriptionTier();
    Alert.alert(
      'Premium Status Updated',
      `Your account is now set to: ${currentTier.toUpperCase()}\n\nTrial data has been cleared. Please navigate away and back to see changes.`,
      [{ text: 'OK' }]
    );
    
    return currentTier;
  } catch (error) {
    console.error('Error toggling premium:', error);
    Alert.alert('Error', 'Failed to update premium status. ' + error.message);
    throw error;
  }
};

/**
 * Check current premium status
 */
export const checkPremiumStatus = async () => {
  try {
    const tier = await getSubscriptionTier();
    return tier;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return SUBSCRIPTION_TIERS.FREE;
  }
};

