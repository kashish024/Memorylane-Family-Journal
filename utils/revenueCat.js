import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { setSubscriptionTier, SUBSCRIPTION_TIERS } from './subscription';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

// RevenueCat API Keys
// Get these from RevenueCat dashboard: https://app.revenuecat.com
// Add to your .env file or app.config.js extra section
const REVENUECAT_API_KEY_IOS = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS || 
                                process.env.REVENUECAT_API_KEY_IOS || 
                                'your_ios_api_key_here';
const REVENUECAT_API_KEY_ANDROID = Constants.expoConfig?.extra?.REVENUECAT_API_KEY_ANDROID || 
                                    process.env.REVENUECAT_API_KEY_ANDROID || 
                                    'your_android_api_key_here';

// Test Store API Key for Expo Go (RevenueCat provides this for testing in Expo Go)
// Get this from: https://app.revenuecat.com → Your Project → API Keys → Test Store
// This key allows RevenueCat to work in Expo Go (without native builds)
const REVENUECAT_TEST_STORE_API_KEY = Constants.expoConfig?.extra?.REVENUECAT_TEST_STORE_API_KEY || 
                                       process.env.REVENUECAT_TEST_STORE_API_KEY || 
                                       null;

// Product IDs (configure these in RevenueCat dashboard)
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
};

// IMPORTANT: RevenueCat Entitlement Configuration
// In your RevenueCat dashboard, you MUST create an entitlement named "premium"
// and attach it to your products (monthly/yearly). Without this, purchases will
// complete but premium won't be activated.
// 
// Steps:
// 1. Go to RevenueCat Dashboard > Entitlements
// 2. Create an entitlement with identifier: "premium"
// 3. Go to Products > Attach the "premium" entitlement to your products
// 4. Ensure production API keys are configured in .env file

let isInitialized = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when app starts (in App.js)
 */
export const initializeRevenueCat = async (userId = null) => {
  try {
    if (isInitialized) {
      console.log('RevenueCat already initialized');
      // If already initialized but userId provided, update user
      if (userId) {
        try {
          await Purchases.logIn(userId);
        } catch (loginError) {
          console.warn('Error logging in user to RevenueCat:', loginError);
        }
      }
      return;
    }

    // Check if running in Expo Go (RevenueCat requires native builds or Test Store key)
    // Expo Go has executionEnvironment === 'storeClient'
    // Production builds have executionEnvironment === 'standalone' or undefined
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    const hasTestStoreKey = REVENUECAT_TEST_STORE_API_KEY && 
                           !REVENUECAT_TEST_STORE_API_KEY.includes('your_') && 
                           REVENUECAT_TEST_STORE_API_KEY.length > 0;
    
    // Use Test Store API key ONLY in Expo Go (for local testing)
    // ALWAYS use production API key in production builds (TestFlight, App Store, etc.)
    let apiKey;
    if (isExpoGo && hasTestStoreKey) {
      // Only use Test Store key in Expo Go
      apiKey = REVENUECAT_TEST_STORE_API_KEY;
      console.log('📱 Using RevenueCat Test Store API key (Expo Go detected)');
    } else {
      // Use production API key (for development/production builds)
      apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEY_IOS 
        : REVENUECAT_API_KEY_ANDROID;
      
      if (isExpoGo && !hasTestStoreKey) {
        // Warn if running in Expo Go without Test Store key
        console.warn('⚠️ Running in Expo Go but Test Store API key not configured.');
        console.warn('⚠️ RevenueCat requires Test Store API key for Expo Go.');
        console.warn('⚠️ Get Test Store key from: https://app.revenuecat.com → API Keys → Test Store');
        console.warn('⚠️ Add to .env: REVENUECAT_TEST_STORE_API_KEY=your_test_store_key');
      } else {
        console.log('📱 Using RevenueCat Production API key (production build)');
      }
    }

    if (!apiKey || apiKey.includes('your_')) {
      console.warn('⚠️ RevenueCat API key not configured. Please add your keys in .env file');
      return;
    }

    await Purchases.configure({ apiKey });
    
    // Set user ID for RevenueCat
    if (userId) {
      await Purchases.logIn(userId);
    }

    isInitialized = true;
    console.log('✅ RevenueCat initialized successfully');

    // Sync subscription status (only if user is logged in)
    if (userId) {
      await syncSubscriptionStatus();
    }
  } catch (error) {
    console.error('❌ Error initializing RevenueCat:', error);
    isInitialized = false; // Reset on error
  }
};

/**
 * Get available products/packages
 * @returns {Promise<Array>} Array of available packages
 */
export const getAvailablePackages = async () => {
  try {
    if (!isInitialized) {
      // Try to initialize if not already done
      const { auth } = require('./firebase');
      const userId = auth.currentUser?.uid;
      if (userId) {
        await initializeRevenueCat(userId);
      } else {
        console.warn('⚠️ RevenueCat not initialized and no user logged in');
        return [];
      }
    }

    // Double check initialization after attempting to initialize
    if (!isInitialized) {
      console.warn('⚠️ RevenueCat initialization failed');
      return [];
    }

    console.log('📦 Fetching RevenueCat offerings...');
    const offerings = await Purchases.getOfferings();
    
    console.log('📦 Offerings received:', {
      hasCurrent: offerings.current !== null,
      currentIdentifier: offerings.current?.identifier,
      allOfferings: Object.keys(offerings.all || {}),
      availablePackagesCount: offerings.current?.availablePackages?.length || 0
    });
    
    if (offerings.current !== null) {
      const packages = offerings.current.availablePackages || [];
      console.log(`✅ Found ${packages.length} packages:`, packages.map(p => ({
        identifier: p.identifier,
        productId: p.product?.identifier,
        price: p.product?.priceString
      })));
      return packages;
    } else {
      console.warn('⚠️ No current offering found in RevenueCat');
      console.warn('⚠️ Make sure you have:');
      console.warn('   1. Created an offering in RevenueCat dashboard');
      console.warn('   2. Set it as the "current" offering');
      console.warn('   3. Attached products (premium_monthly, premium_yearly) to the offering');
      console.warn('   4. Linked products to App Store Connect');
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting packages:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      userInfo: error.userInfo
    });
    return [];
  }
};

/**
 * Check if user has active premium subscription
 * @returns {Promise<boolean>}
 */
export const hasActiveSubscription = async () => {
  try {
    if (!isInitialized) {
      return false;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    
    // Debug: Log entitlements for troubleshooting
    const activeEntitlements = Object.keys(customerInfo.entitlements.active || {});
    if (activeEntitlements.length > 0) {
      console.log('🔍 Active entitlements:', activeEntitlements);
    }
    
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    
    // Check if admin has manually overridden subscription (prevent auto-sync from overriding)
    const user = auth.currentUser;
    
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // If admin has set preventAutoSync flag, don't override manual settings
        if (userData.preventAutoSync === true) {
          console.log('🔒 Admin override detected - skipping RevenueCat sync');
          // Return the current Firestore tier instead of syncing
          return userData.subscriptionTier === SUBSCRIPTION_TIERS.PREMIUM;
        }
      }
    }
    
    // Sync with Firestore
    // If user has real subscription from RevenueCat, clear trial data (they're no longer on trial)
    // If no subscription, don't set to FREE here - let getSubscriptionTier handle trial status
    if (isPremium) {
      await setSubscriptionTier(SUBSCRIPTION_TIERS.PREMIUM, true); // true = clear trial data
    }
    // Don't set to FREE here - user might still be on trial
    
    return isPremium;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
};

/**
 * Purchase a package
 * @param {Package} packageToPurchase - RevenueCat package object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const purchasePackage = async (packageToPurchase) => {
  try {
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    
    // Debug: Log all entitlements to see what's available
    console.log('🔍 Purchase completed. Customer info:', {
      activeEntitlements: Object.keys(customerInfo.entitlements.active || {}),
      allEntitlements: Object.keys(customerInfo.entitlements.all || {}),
      activeSubscriptions: Object.keys(customerInfo.activeSubscriptions || {}),
    });
    
    // Check if purchase was successful
    // First check for 'premium' entitlement
    const premiumEntitlement = customerInfo.entitlements.active['premium'];
    const isPremium = premiumEntitlement !== undefined;
    
    console.log('🔍 Entitlement check:', {
      isPremium,
      premiumEntitlement: premiumEntitlement ? {
        identifier: premiumEntitlement.identifier,
        isActive: premiumEntitlement.isActive,
        willRenew: premiumEntitlement.willRenew,
      } : null,
      allActiveEntitlements: Object.keys(customerInfo.entitlements.active || {}),
    });
    
    // If we have premium entitlement, activate it
    if (isPremium) {
      // Update Firestore and clear trial data (user is now on real subscription, not trial)
      await setSubscriptionTier(SUBSCRIPTION_TIERS.PREMIUM, true); // true = clear trial data
      console.log('✅ Premium activated in Firestore (trial cleared)');
      return { success: true };
    } 
    // No premium entitlement found - this should not happen in production
    else {
      console.error('❌ Purchase completed but "premium" entitlement not found.');
      console.error('❌ Active entitlements:', Object.keys(customerInfo.entitlements.active || {}));
      console.error('❌ Please ensure the "premium" entitlement is configured in RevenueCat dashboard');
      return { 
        success: false, 
        error: 'Purchase completed but premium not activated. Please contact support or check RevenueCat entitlement configuration.' 
      };
    }
  } catch (error) {
    console.error('Purchase error:', error);
    
    if (error.userCancelled) {
      return { success: false, error: 'Purchase cancelled' };
    }
    
    return { success: false, error: error.message || 'Purchase failed' };
  }
};

/**
 * Restore purchases (for users who already purchased)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const restorePurchases = async () => {
  try {
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    const customerInfo = await Purchases.restorePurchases();
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    
    if (isPremium) {
      // Clear trial data when restoring real subscription
      await setSubscriptionTier(SUBSCRIPTION_TIERS.PREMIUM, true); // true = clear trial data
      return { success: true };
    } else {
      // No active subscription found - check if trial has expired and revert to free
      const { checkAndExpireTrial } = require('./subscription');
      const user = auth.currentUser;
      if (user) {
        await checkAndExpireTrial(user.uid);
      }
      return { success: false, error: 'No active subscription found' };
    }
  } catch (error) {
    console.error('Restore error:', error);
    // Even on error, check trial expiration
    const { checkAndExpireTrial } = require('./subscription');
    const user = auth.currentUser;
    if (user) {
      await checkAndExpireTrial(user.uid);
    }
    return { success: false, error: error.message || 'Failed to restore purchases' };
  }
};

/**
 * Sync subscription status from RevenueCat to Firestore
 */
export const syncSubscriptionStatus = async () => {
  try {
    const isPremium = await hasActiveSubscription();
    // hasActiveSubscription already handles setting PREMIUM and clearing trial
    // If no subscription, don't set to FREE here - let getSubscriptionTier handle trial status
    if (!isPremium) {
      // Only set to FREE if we're sure there's no subscription AND no active trial
      // This is handled by getSubscriptionTier, so we don't need to do it here
      console.log('🔍 No active subscription found, but not setting to FREE (may be on trial)');
    }
    return isPremium;
  } catch (error) {
    console.error('Error syncing subscription status:', error);
    return false;
  }
};

/**
 * Get subscription expiration date
 * @returns {Promise<Date|null>}
 */
export const getExpirationDate = async () => {
  try {
    if (!isInitialized) {
      return null;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    const premiumEntitlement = customerInfo.entitlements.active['premium'];
    
    if (premiumEntitlement) {
      return new Date(premiumEntitlement.expirationDate);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting expiration date:', error);
    return null;
  }
};

/**
 * Check if subscription is in trial period
 * @returns {Promise<boolean>}
 */
export const isInTrialPeriod = async () => {
  try {
    if (!isInitialized) {
      // Try to initialize if not already done
      const { auth } = require('./firebase');
      const userId = auth.currentUser?.uid;
      if (userId) {
        await initializeRevenueCat(userId);
      } else {
        return false;
      }
    }

    // Double check initialization
    if (!isInitialized) {
      return false;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    const premiumEntitlement = customerInfo.entitlements.active['premium'];
    
    return premiumEntitlement?.isActive === true && 
           premiumEntitlement?.willRenew === false &&
           premiumEntitlement?.periodType === 'TRIAL';
  } catch (error) {
    console.error('Error checking trial status:', error);
    return false;
  }
};

