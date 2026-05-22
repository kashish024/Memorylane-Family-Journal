import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, ActivityIndicator, Linking } from 'react-native';
import { ArrowLeft, Crown, Check, Sparkles, Users, Image, Mail, Database, Video, Lock, ExternalLink } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { isPremium, getSubscriptionTier, SUBSCRIPTION_TIERS, isOnTrial, getTrialInfo } from '../utils/subscription';
import { 
  getAvailablePackages, 
  purchasePackage, 
  restorePurchases, 
  hasActiveSubscription,
  syncSubscriptionStatus 
} from '../utils/revenueCat';

export default function PremiumScreen({ navigation }) {
  const [isUserPremium, setIsUserPremium] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(null);
  const [trialEndDate, setTrialEndDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    // Debug: Check if RevenueCat API key is being read
    console.log('🔑 RevenueCat iOS Key:', Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS);
    console.log('🔑 Key exists?', !!Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS);
    console.log('🔑 Key starts with appl_?', Constants.expoConfig?.extra?.REVENUECAT_API_KEY_IOS?.startsWith('appl_'));
    console.log('🔑 All extra keys:', Object.keys(Constants.expoConfig?.extra || {}));
    console.log('🔑 process.env check:', process.env.REVENUECAT_API_KEY_IOS ? 'Found in process.env' : 'Not in process.env');
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check premium status first (this doesn't require RevenueCat)
      const premium = await isPremium();
      setIsUserPremium(premium);
      
      const onTrial = await isOnTrial();
      setIsTrial(onTrial);
      
      if (onTrial) {
        const trialInfo = await getTrialInfo();
        if (trialInfo) {
          setTrialDaysRemaining(trialInfo.daysRemaining);
          setTrialEndDate(trialInfo.endDate);
        }
      } else {
        setTrialDaysRemaining(null);
        setTrialEndDate(null);
      }
      
      // Load available packages (this requires RevenueCat to be initialized)
      // If RevenueCat isn't ready, packages will be empty array
      try {
        console.log('📦 PremiumScreen: Loading packages...');
        const availablePackages = await getAvailablePackages();
        console.log(`📦 PremiumScreen: Received ${availablePackages.length} packages`);
        if (availablePackages.length === 0) {
          console.warn('⚠️ PremiumScreen: No packages found. Check RevenueCat dashboard:');
          console.warn('   1. Ensure an offering is created and set as "current"');
          console.warn('   2. Ensure products (premium_monthly, premium_yearly) are attached');
          console.warn('   3. Ensure products are linked to App Store Connect');
        }
        setPackages(availablePackages);
      } catch (packagesError) {
        console.error('❌ PremiumScreen: Error loading packages:', packagesError);
        setPackages([]);
      }
    } catch (error) {
      console.error('Error loading premium data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageToPurchase) => {
    if (purchasing) return;
    
    setPurchasing(true);
    try {
      const result = await purchasePackage(packageToPurchase);
      
      if (result.success) {
        // Refresh premium status and reload all data
        await syncSubscriptionStatus();
        // Reload all data to refresh premium status, trial status, and packages
        await loadData();
        
        Alert.alert(
          '🎉 Welcome to Premium!',
          'Your subscription is now active. Enjoy unlimited memories and all premium features!',
          [{ text: 'OK' }]
        );
      } else {
        if (result.error !== 'Purchase cancelled') {
          Alert.alert('Purchase Failed', result.error || 'Unable to complete purchase. Please try again.');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    
    setRestoring(true);
    try {
      const result = await restorePurchases();
      
      if (result.success) {
        // Refresh premium status and reload all data
        await syncSubscriptionStatus();
        // Reload all data to refresh premium status, trial status, and packages
        await loadData();
        
        Alert.alert(
          '✅ Purchases Restored',
          'Your subscription has been restored successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('No Purchases Found', result.error || 'We couldn\'t find any active subscriptions to restore.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const premiumFeatures = [
    {
      icon: Users,
      title: 'Children',
      description: 'Add as many children as you want',
      free: '1 child',
      premium: 'Unlimited',
    },
    {
      icon: Image,
      title: 'Memories',
      description: 'No monthly limits on memory creation',
      free: '20 per child/month',
      premium: 'Unlimited',
    },
    {
      icon: Database,
      title: 'Storage',
      description: 'Store all your photos and audio',
      free: '50MB',
      premium: 'Unlimited',
    },
    {
      icon: Users,
      title: 'Contributors',
      description: 'Share memories with family members',
      free: 'Owner only',
      premium: 'Unlimited',
    },
    {
      icon: Mail,
      title: 'Auto Monthly Summaries',
      description: 'Automatic email summaries each month',
      free: 'Manual only',
      premium: 'Automatic',
    },
    {
      icon: Database,
      title: 'Auto Backup',
      description: 'Weekly automatic data backups',
      free: 'Manual only',
      premium: 'Automatic',
    },
    {
      icon: Image,
      title: 'Photo Avatars',
      description: 'Upload photos instead of emojis for child profiles',
      free: 'Emoji only',
      premium: 'Photo uploads',
    },
  ];

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#87C38F" />
          <Text className="text-gray-600 mt-4">Loading subscription options...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-primary p-4 flex-row items-center" style={{ paddingTop: 70 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Premium</Text>
        </View>

        <View className="p-6">
          {/* Premium Status Card */}
          <View
            style={{
              backgroundColor: isUserPremium ? '#87C38F' : '#F59E0B',
              borderRadius: 20,
              padding: 32,
              marginBottom: 24,
              alignItems: 'center',
              shadowColor: isUserPremium ? '#87C38F' : '#F59E0B',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 12,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Shine/Gloss overlay effect */}
            <View
              style={{
                position: 'absolute',
                top: -60,
                left: -60,
                width: 250,
                height: 250,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 125,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 90,
                transform: [{ rotate: '-30deg' }],
              }}
            />
            
            <View style={{ zIndex: 1, alignItems: 'center' }}>
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Crown size={56} color="white" />
              </View>
              <Text style={{ 
                fontSize: 28, 
                fontWeight: '800', 
                color: 'white', 
                marginTop: 8,
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
              }}>
                {isUserPremium ? 'You\'re Premium!' : 'Upgrade to Premium'}
              </Text>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.95)', 
                textAlign: 'center', 
                marginTop: 12,
                fontSize: 16,
                fontWeight: '500',
                textShadowColor: 'rgba(0, 0, 0, 0.1)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}>
                {isUserPremium 
                  ? 'Enjoy all premium features' 
                  : 'Unlock unlimited memories and features'
                }
              </Text>
            </View>
          </View>

          {/* Features Comparison */}
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <View className="flex-row items-center mb-4">
              <Sparkles size={24} color="#E07A5F" />
              <Text className="text-xl font-bold text-gray-800 ml-2">Feature Comparison</Text>
            </View>

            {premiumFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <View key={index} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
                  <View className="flex-row items-start mb-2">
                    <View className="bg-primary/10 p-2 rounded-lg mr-3">
                      <Icon size={20} color="#87C38F" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800">{feature.title}</Text>
                      <Text className="text-sm text-gray-600 mt-1">{feature.description}</Text>
                    </View>
                  </View>
                  <View className="flex-row justify-between mt-2 ml-11">
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500 mb-1">Free</Text>
                      <Text className="text-sm text-gray-700">{feature.free}</Text>
                    </View>
                    <View className="flex-1 items-end">
                      <Text className="text-xs text-gray-500 mb-1">Premium</Text>
                      <View className="flex-row items-center">
                        <Check size={16} color="#87C38F" />
                        <Text className="text-sm text-primary font-semibold ml-1">{feature.premium}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* CRITICAL FIX: Always show subscription packages for Apple reviewers */}
          {/* Trial Users Section */}
          {isTrial && packages.length > 0 && (
            <View className="mb-6">
              {/* Show banner if user is already premium */}
              {isUserPremium && (
                <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
                  <Text className="text-primary text-sm font-semibold text-center">
                    ✅ You're currently a premium member!
                  </Text>
                  <Text className="text-text-light text-xs text-center mt-1">
                    You can manage or change your subscription below.
                  </Text>
                </View>
              )}

              <View className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 mb-4">
                <Text className="text-lg font-bold text-green-800 mb-2 text-center">
                  Upgrade Before Your Trial Ends
                </Text>
                <Text className="text-green-700 text-center mb-4">
                  {trialEndDate 
                    ? `Your trial ends on ${trialEndDate.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}. Upgrade now to keep all premium features!`
                    : 'Upgrade now to keep all premium features after your trial ends!'}
                </Text>
              </View>
              
              {packages.map((pkg, index) => {
                if (!pkg || !pkg.product) {
                  return null;
                }
                
                const packageId = pkg.identifier?.toLowerCase() || '';
                const productId = pkg.product?.identifier?.toLowerCase() || '';
                const isMonthly = packageId.includes('monthly') || productId.includes('monthly');
                const isYearly = packageId.includes('yearly') || packageId.includes('annual') || productId.includes('yearly');
                const packageTitle = pkg.storeProduct?.title || (isMonthly ? 'Monthly' : isYearly ? 'Yearly' : 'Premium');
                const priceString = pkg.product?.priceString || 'N/A';
                const price = pkg.product?.price || 0;
                
                return (
                  <TouchableOpacity
                    key={pkg.identifier || index}
                    className={`bg-white rounded-2xl p-6 shadow-lg mb-4 border-2 ${
                      isYearly ? 'border-primary' : 'border-gray-200'
                    }`}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchasing}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-xl font-bold text-gray-800">
                            {packageTitle}
                          </Text>
                          {isYearly && (
                            <View className="ml-2 bg-primary/20 px-2 py-1 rounded">
                              <Text className="text-xs text-primary font-semibold">BEST VALUE</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-2xl font-bold text-primary mt-1">
                          {priceString}
                        </Text>
                        {isYearly && packages.length > 0 && (
                          <Text className="text-sm text-gray-500 mt-1">
                            {(() => {
                              const monthlyPkg = packages.find(p => {
                                const pkgId = p?.identifier?.toLowerCase() || '';
                                const prodId = p?.product?.identifier?.toLowerCase() || '';
                                return pkgId.includes('monthly') || prodId.includes('monthly');
                              });
                              const monthlyPrice = monthlyPkg?.product?.price || 0;
                              if (monthlyPrice > 0 && price > 0) {
                                const savings = Math.round((1 - (price / (monthlyPrice * 12))) * 100);
                                return `Save ${savings}% vs monthly`;
                              }
                              return '';
                            })()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      className={`py-3 rounded-xl mt-4 ${
                        purchasing ? 'bg-gray-400' : 'bg-primary'
                      }`}
                      onPress={() => handlePurchase(pkg)}
                      disabled={purchasing}
                    >
                      {purchasing ? (
                        <View className="flex-row items-center justify-center">
                          <ActivityIndicator color="white" size="small" />
                          <Text className="text-white font-bold ml-2">Processing...</Text>
                        </View>
                      ) : (
                        <Text className="text-white font-bold text-center">Upgrade Now</Text>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              
              {/* Restore Purchases */}
              <TouchableOpacity
                className="py-3 rounded-xl border-2 border-gray-300 mb-4"
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator color="#636E72" size="small" />
                    <Text className="text-gray-600 font-semibold ml-2">Restoring...</Text>
                  </View>
                ) : (
                  <Text className="text-gray-600 font-semibold text-center">Restore Purchases</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* CRITICAL FIX: Non-trial users - show packages even for premium users */}
          {!isTrial && packages.length > 0 && (
            <View className="mb-6">
              {/* Show banner if user is already premium */}
              {isUserPremium && (
                <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
                  <Text className="text-primary text-sm font-semibold text-center">
                    ✅ You're currently a premium member!
                  </Text>
                  <Text className="text-text-light text-xs text-center mt-1">
                    You can manage or change your subscription below.
                  </Text>
                </View>
              )}

              <Text className="text-lg font-bold text-gray-800 mb-4 text-center">
                Choose Your Plan
              </Text>
              
              {packages.map((pkg, index) => {
                if (!pkg || !pkg.product) {
                  return null;
                }
                
                const packageId = pkg.identifier?.toLowerCase() || '';
                const productId = pkg.product?.identifier?.toLowerCase() || '';
                const isMonthly = packageId.includes('monthly') || productId.includes('monthly');
                const isYearly = packageId.includes('yearly') || packageId.includes('annual') || productId.includes('yearly');
                const packageTitle = pkg.storeProduct?.title || (isMonthly ? 'Monthly' : isYearly ? 'Yearly' : 'Premium');
                const priceString = pkg.product?.priceString || 'N/A';
                const price = pkg.product?.price || 0;
                
                return (
                  <TouchableOpacity
                    key={pkg.identifier || index}
                    className={`bg-white rounded-2xl p-6 shadow-lg mb-4 border-2 ${
                      isYearly ? 'border-primary' : 'border-gray-200'
                    }`}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchasing}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="text-xl font-bold text-gray-800">
                            {packageTitle}
                          </Text>
                          {isYearly && (
                            <View className="ml-2 bg-primary/20 px-2 py-1 rounded">
                              <Text className="text-xs text-primary font-semibold">BEST VALUE</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-2xl font-bold text-primary mt-1">
                          {priceString}
                        </Text>
                        {isYearly && packages.length > 0 && (
                          <Text className="text-sm text-gray-500 mt-1">
                            {(() => {
                              const monthlyPkg = packages.find(p => {
                                const pkgId = p?.identifier?.toLowerCase() || '';
                                const prodId = p?.product?.identifier?.toLowerCase() || '';
                                return pkgId.includes('monthly') || prodId.includes('monthly');
                              });
                              const monthlyPrice = monthlyPkg?.product?.price || 0;
                              if (monthlyPrice > 0 && price > 0) {
                                const savings = Math.round((1 - (price / (monthlyPrice * 12))) * 100);
                                return `Save ${savings}% vs monthly`;
                              }
                              return '';
                            })()}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      className={`py-3 rounded-xl mt-4 ${
                        purchasing ? 'bg-gray-400' : 'bg-primary'
                      }`}
                      onPress={() => handlePurchase(pkg)}
                      disabled={purchasing}
                    >
                      {purchasing ? (
                        <View className="flex-row items-center justify-center">
                          <ActivityIndicator color="white" size="small" />
                          <Text className="text-white font-bold ml-2">Processing...</Text>
                        </View>
                      ) : (
                        <Text className="text-white font-bold text-center">Subscribe</Text>
                      )}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
              
              {/* Restore Purchases */}
              <TouchableOpacity
                className="py-3 rounded-xl border-2 border-gray-300 mb-4"
                onPress={handleRestore}
                disabled={restoring}
              >
                {restoring ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator color="#636E72" size="small" />
                    <Text className="text-gray-600 font-semibold ml-2">Restoring...</Text>
                  </View>
                ) : (
                  <Text className="text-gray-600 font-semibold text-center">Restore Purchases</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Fallback if no packages loaded - always show restore */}
          {packages.length === 0 && !loading && (
            <TouchableOpacity
              className="bg-primary py-4 rounded-xl shadow-lg mb-4"
              onPress={handleRestore}
            >
              <View className="flex-row items-center justify-center">
                <Crown size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Restore Purchases</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Info Note */}
          <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
            <View className="flex-row items-start">
              <Lock size={20} color="#87C38F" style={{ marginTop: 2, marginRight: 8 }} />
              <View className="flex-1">
                <Text className="text-text-dark text-sm font-semibold mb-1">
                  Your Data is Safe
                </Text>
                <Text className="text-text-light text-xs leading-relaxed">
                  All your memories are stored securely. You can export your data anytime, even on the free tier.
                </Text>
              </View>
            </View>
          </View>

          {/* CRITICAL FIX: Legal Links - REQUIRED by Apple for subscriptions */}
          <View className="flex-row justify-center items-center py-4 border-t border-gray-200">
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://memorylaneapp.com/terms')}
              className="flex-row items-center"
            >
              <Text className="text-gray-600 text-xs mr-1">Terms of Use</Text>
              <ExternalLink size={12} color="#6B7280" />
            </TouchableOpacity>
            
            <Text className="text-gray-400 mx-3">•</Text>
            
            <TouchableOpacity 
              onPress={() => Linking.openURL('https://memorylaneapp.com/privacy')}
              className="flex-row items-center"
            >
              <Text className="text-gray-600 text-xs mr-1">Privacy Policy</Text>
              <ExternalLink size={12} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}