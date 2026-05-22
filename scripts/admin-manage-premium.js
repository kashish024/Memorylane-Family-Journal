/**
 * Admin Script: Manage User Premium Status
 * 
 * This script allows you to enable/disable premium for users from the backend.
 * 
 * Usage:
 *   node scripts/admin-manage-premium.js <userId> <action> [options]
 * 
 * Actions:
 *   enable    - Enable premium for user
 *   disable   - Disable premium for user
 *   status    - Check current premium status
 * 
 * Examples:
 *   node scripts/admin-manage-premium.js abc123 enable
 *   node scripts/admin-manage-premium.js abc123 disable
 *   node scripts/admin-manage-premium.js abc123 status
 * 
 * Prerequisites:
 *   1. Install Firebase Admin SDK: npm install firebase-admin
 *   2. Set up Firebase Admin credentials (see instructions below)
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
// Option 1: Use service account key file (recommended for production)
// Uncomment and set path to your service account key:
// const serviceAccount = require('./path/to/serviceAccountKey.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// Option 2: Use environment variable (recommended for cloud functions)
// Set GOOGLE_APPLICATION_CREDENTIALS environment variable
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    console.error('\n📝 Setup Instructions:');
    console.error('1. Install: npm install firebase-admin');
    console.error('2. Get service account key from Firebase Console:');
    console.error('   Project Settings > Service Accounts > Generate New Private Key');
    console.error('3. Save as serviceAccountKey.json in project root');
    console.error('4. Uncomment the serviceAccount initialization code above');
    console.error('\nOR set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    process.exit(1);
  }
}

const db = admin.firestore();

// Subscription tiers
const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
};

/**
 * Enable premium for a user
 */
async function enablePremium(userId, clearTrial = true) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error(`User ${userId} does not exist`);
    }
    
    const updateData = {
      subscriptionTier: SUBSCRIPTION_TIERS.PREMIUM,
      premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      premiumUpdatedBy: 'admin',
      preventAutoSync: true, // Prevent RevenueCat from overriding this manual setting
    };
    
    // Clear trial data if requested
    if (clearTrial) {
      updateData.trialUsed = false;
      updateData.trialStartDate = null;
      updateData.trialEndDate = null;
    }
    
    await userRef.update(updateData);
    
    console.log(`✅ Premium enabled for user: ${userId}`);
    if (clearTrial) {
      console.log('   Trial data cleared');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error enabling premium:`, error.message);
    throw error;
  }
}

/**
 * Disable premium for a user
 */
async function disablePremium(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error(`User ${userId} does not exist`);
    }
    
    await userRef.update({
      subscriptionTier: SUBSCRIPTION_TIERS.FREE,
      premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      premiumUpdatedBy: 'admin',
      preventAutoSync: true, // Prevent RevenueCat from overriding this manual setting
      // Clear trial data to prevent trial from overriding
      trialUsed: false,
      trialStartDate: null,
      trialEndDate: null,
    });
    
    console.log(`✅ Premium disabled for user: ${userId}`);
    console.log('   Trial data cleared');
    
    return true;
  } catch (error) {
    console.error(`❌ Error disabling premium:`, error.message);
    throw error;
  }
}

/**
 * Check premium status for a user
 */
async function checkStatus(userId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error(`User ${userId} does not exist`);
    }
    
    const userData = userDoc.data();
    const subscriptionTier = userData.subscriptionTier || SUBSCRIPTION_TIERS.FREE;
    const isTrial = userData.trialUsed && userData.trialStartDate && userData.trialEndDate;
    
    console.log(`\n📊 Premium Status for user: ${userId}`);
    console.log(`   Subscription Tier: ${subscriptionTier.toUpperCase()}`);
    console.log(`   On Trial: ${isTrial ? 'Yes' : 'No'}`);
    
    if (isTrial) {
      const trialStart = userData.trialStartDate?.toDate?.() || new Date(userData.trialStartDate);
      const trialEnd = userData.trialEndDate?.toDate?.() || new Date(userData.trialEndDate);
      const now = new Date();
      const isActive = now >= trialStart && now <= trialEnd;
      
      console.log(`   Trial Start: ${trialStart.toLocaleDateString()}`);
      console.log(`   Trial End: ${trialEnd.toLocaleDateString()}`);
      console.log(`   Trial Active: ${isActive ? 'Yes' : 'No'}`);
    }
    
    if (userData.premiumUpdatedAt) {
      const updatedAt = userData.premiumUpdatedAt?.toDate?.() || new Date(userData.premiumUpdatedAt);
      console.log(`   Last Updated: ${updatedAt.toLocaleDateString()}`);
      console.log(`   Updated By: ${userData.premiumUpdatedBy || 'Unknown'}`);
    }
    
    console.log('');
    
    return {
      subscriptionTier,
      isTrial,
      userData,
    };
  } catch (error) {
    console.error(`❌ Error checking status:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node scripts/admin-manage-premium.js <userId> <action> [options]');
    console.error('\nActions:');
    console.error('  enable    - Enable premium for user');
    console.error('  disable   - Disable premium for user');
    console.error('  status    - Check current premium status');
    console.error('\nExamples:');
    console.error('  node scripts/admin-manage-premium.js abc123 enable');
    console.error('  node scripts/admin-manage-premium.js abc123 disable');
    console.error('  node scripts/admin-manage-premium.js abc123 status');
    process.exit(1);
  }
  
  const userId = args[0];
  const action = args[1].toLowerCase();
  
  try {
    switch (action) {
      case 'enable':
        await enablePremium(userId);
        break;
      case 'disable':
        await disablePremium(userId);
        break;
      case 'status':
        await checkStatus(userId);
        break;
      default:
        console.error(`❌ Unknown action: ${action}`);
        console.error('Valid actions: enable, disable, status');
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Operation failed:`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  enablePremium,
  disablePremium,
  checkStatus,
};

