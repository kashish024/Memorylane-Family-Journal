import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, StatusBar } from 'react-native';
import { ArrowLeft, Baby, Trash2, Download, Upload, Info, Users, Edit, Bell, Palette, LogOut, UserCircle, Crown } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { loadChildren, deleteChild, loadMemories } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { Mail, Sparkles,Database} from 'lucide-react-native';
import { getLastBackupDateString } from '../utils/autoBackup';
import { canUseAutoBackup, isPremium, isOnTrial, getTrialInfo } from '../utils/subscription';
import ChildAvatar from '../components/ChildAvatar';
import {
  enableNotifications,
  disableNotifications,
  getNotificationPermissionStatus,
  isPhysicalDevice,
  scheduleDailyReminder,
} from '../utils/notifications';

const PREFERENCES_KEY = '@preferences';

export default function SettingsScreen({ navigation }) {
  const [children, setChildren] = useState([]);
  const [memories, setMemories] = useState([]);
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    autoBackup: false,
  });
  const [lastBackupDate, setLastBackupDate] = useState('Never');
  const [isUserPremium, setIsUserPremium] = useState(null); // null = not checked yet, false/true = determined
  const [isTrial, setIsTrial] = useState(null); // null = not checked yet, false/true = determined
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(null);
  const [notificationsBusy, setNotificationsBusy] = useState(false);

  useEffect(() => {
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    // Load premium status separately (non-blocking)
    loadPremiumStatus();
    
    // Load main content in parallel for faster rendering
    const [childrenData, memoriesData, prefs, backupDate] = await Promise.all([
      loadChildren(),
      loadMemories().catch(err => {
        console.error('Error loading memories:', err);
        return [];
      }),
      AsyncStorage.getItem(PREFERENCES_KEY).catch(() => null),
      getLastBackupDateString().catch(() => 'Never'),
    ]);
    
    setChildren(childrenData);
    setMemories(memoriesData || []);
    
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs);
        // Sync notifications preference with actual permission (e.g. user denied in OS settings)
        if (parsed.notifications && isPhysicalDevice()) {
          const status = await getNotificationPermissionStatus();
          if (status === 'granted') {
            scheduleDailyReminder().catch((err) =>
              console.warn('Could not reschedule reminder:', err)
            );
          } else if (status === 'denied') {
            parsed.notifications = false;
            await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(parsed));
          }
        }
        setPreferences(parsed);
      } catch (error) {
        console.error('Error parsing preferences:', error);
      }
    }

    setLastBackupDate(backupDate);
  };

  const loadPremiumStatus = async () => {
    try {
      const [premium, onTrial] = await Promise.all([
        isPremium(),
        isOnTrial(),
      ]);
      
      setIsUserPremium(premium);
      setIsTrial(onTrial);
      
      if (onTrial) {
        const trialInfo = await getTrialInfo();
        if (trialInfo) {
          setTrialDaysRemaining(trialInfo.daysRemaining);
        }
      } else {
        setTrialDaysRemaining(null);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
      // Set to false on error so UI doesn't stay in loading state
      setIsUserPremium(false);
      setIsTrial(false);
    }
  };

  const savePreferences = async (newPrefs) => {
    try {
      // Check if trying to enable auto backup without premium
      if (newPrefs.autoBackup && !preferences.autoBackup) {
        const canUse = await canUseAutoBackup();
        if (!canUse) {
          Alert.alert(
            'Upgrade to Premium',
            'Automatic backups are a Premium feature. Upgrade to enable weekly automatic backups.',
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
      }
      
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
      
      // Refresh last backup date when auto backup is enabled
      if (newPrefs.autoBackup) {
        const backupDate = await getLastBackupDateString();
        setLastBackupDate(backupDate);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleEditChild = (child) => {
    navigation.navigate('EditChild', { child });
  };

  const handleDeleteChild = (child) => {
    Alert.alert(
      `Delete ${child.name}?`,
      `This will permanently delete ${child.name} and all their memories. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChild(child.id, true);
              await loadData();
              Alert.alert('Success', `${child.name} has been deleted.`);
            } catch (error) {
              console.error('Error deleting child:', error);
              Alert.alert('Error', 'Failed to delete child.');
            }
          }
        }
      ]
    );
  };


  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation will be handled by auth state listener
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
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
        <Text className="text-xl font-bold text-white">Settings</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Manage Children */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Users size={24} color="#E07A5F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Manage Children</Text>
          </View>
          
          {children.length === 0 ? (
            <Text className="text-gray-500 mb-4">No children added yet.</Text>
          ) : (
            <>
              {children.map((child, index) => (
                <View 
                  key={`${child.id}-${index}`}
                  className="flex-row items-center justify-between p-4 bg-primary/5 rounded-xl mb-2"
                >
                  <View className="flex-row items-center flex-1">
                    <ChildAvatar
                      avatar={child.avatar}
                      avatarPhotoUrl={child.avatarPhotoUrl}
                      size={48}
                      style={{ marginRight: 12 }}
                    />
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">{child.name}</Text>
                      <Text className="text-sm text-gray-500">Born {child.birthdate}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleEditChild(child)}
                      className="bg-primary/10 p-2 rounded-lg"
                    >
                      <Edit size={18} color="#E07A5F" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteChild(child)}
                      className="bg-red-100 p-2 rounded-lg"
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}
          
          <TouchableOpacity
            className="bg-primary py-3 rounded-xl mt-4 items-center"
            onPress={() => navigation.navigate('AddChild')}
          >
            <Text className="text-white font-semibold">Add New Child</Text>
          </TouchableOpacity>
          </View>

         {/* Monthly Summary */}
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <View className="flex-row items-center mb-4">
              <Mail size={24} color="#E07A5F" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Monthly Summaries</Text>
            </View>
            
            {children.length === 0 ? (
              <Text className="text-gray-500">Add a child to generate summaries</Text>
            ) : (
              <>
                {children.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    className="bg-primary/5 p-4 rounded-xl mb-2 flex-row items-center justify-between"
                    onPress={() => navigation.navigate('MonthlySummary', { child })}
                  >
                    <View className="flex-row items-center">
                      <ChildAvatar
                        avatar={child.avatar}
                        avatarPhotoUrl={child.avatarPhotoUrl}
                        size={40}
                        style={{ marginRight: 12 }}
                      />
                      <Text className="text-lg font-semibold text-gray-800">{child.name}</Text>
                    </View>
                    <Sparkles size={20} color="#E07A5F" />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>

        {/* Premium Status Card (Active Premium Subscription) */}
        {/* Only show premium tiles once status is determined (not null) */}
        {isUserPremium === true && isTrial === false && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.9}
            style={{
              backgroundColor: '#87C38F',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#87C38F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center mb-2">
              <Crown size={24} color="white" />
              <Text className="text-white font-bold text-xl ml-2">Premium Active</Text>
            </View>
            <Text className="text-white text-base mb-1">
              You're enjoying all premium features
            </Text>
            <Text className="text-white/90 text-sm">
              Unlimited memories, children, contributors, and more
            </Text>
          </TouchableOpacity>
        )}

        {/* Trial Status Card */}
        {isTrial === true && trialDaysRemaining !== null && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.9}
            style={{
              backgroundColor: '#10B981',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View className="flex-row items-center mb-2">
              <Crown size={24} color="white" />
              <Text className="text-white font-bold text-xl ml-2">Premium Trial Active</Text>
            </View>
            <Text className="text-white text-base mb-1">
              {trialDaysRemaining === 0 
                ? 'Your trial expires today!' 
                : trialDaysRemaining === 1
                ? '1 day remaining in your trial'
                : `${trialDaysRemaining} days remaining in your trial`}
            </Text>
            <Text className="text-white/90 text-sm">
              Enjoy all premium features. Upgrade to keep access after your trial ends.
            </Text>
          </TouchableOpacity>
        )}

        {/* Premium Upgrade Card */}
        {/* Only show upgrade card if status is determined and user is not premium/trial */}
        {isUserPremium === false && isTrial === false && (
          <TouchableOpacity
            style={{
              backgroundColor: '#F59E0B',
              borderRadius: 20,
              padding: 24,
              marginBottom: 24,
              // Multiple shadow layers for depth
              shadowColor: '#F59E0B',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 12,
              // Border for glossy effect
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              // Overflow for shine effect
              overflow: 'hidden',
            }}
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.9}
          >
            {/* Shine/Gloss overlay effect */}
            <View
              style={{
                position: 'absolute',
                top: -50,
                left: -50,
                width: 200,
                height: 200,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 100,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 150,
                height: 150,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 75,
                transform: [{ rotate: '-30deg' }],
              }}
            />
            
            <View className="flex-row items-center justify-between" style={{ zIndex: 1 }}>
              <View className="flex-1">
                <View className="flex-row items-center mb-3">
                  <View
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 12,
                      padding: 8,
                      marginRight: 8,
                    }}
                  >
                    <Crown size={28} color="white" />
                  </View>
                  <Text style={{ 
                    fontSize: 22, 
                    fontWeight: '800', 
                    color: 'white', 
                    textShadowColor: 'rgba(0, 0, 0, 0.2)',
                    textShadowOffset: { width: 0, height: 2 },
                    textShadowRadius: 4,
                  }}>
                    Upgrade to Premium
                  </Text>
                </View>
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.95)', 
                  fontSize: 15,
                  fontWeight: '500',
                  textShadowColor: 'rgba(0, 0, 0, 0.1)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}>
                  Unlock unlimited memories, children, and premium features
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 12,
                }}
              >
                <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>→</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* App Preferences */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Palette size={24} color="#E07A5F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Preferences</Text>
          </View>
          
          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <Bell size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-gray-800">Notifications</Text>
                <Text className="text-sm text-gray-500">
                  {isPhysicalDevice()
                    ? 'Daily reminder to capture a moment'
                    : 'Use a device to enable reminders'}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.notifications}
              onValueChange={async (value) => {
                if (notificationsBusy) return;
                setNotificationsBusy(true);
                try {
                  if (value) {
                    const result = await enableNotifications();
                    if (result.success) {
                      await savePreferences({ ...preferences, notifications: true });
                    } else {
                      if (result.message?.includes('denied')) {
                        Alert.alert(
                          'Permission denied',
                          'Enable notifications in your device settings to get daily reminders.',
                          [{ text: 'OK' }]
                        );
                      } else {
                        Alert.alert('Couldn\'t enable', result.message || 'Please try again.');
                      }
                    }
                  } else {
                    await disableNotifications();
                    await savePreferences({ ...preferences, notifications: false });
                  }
                } catch (err) {
                  console.error('Notifications toggle error:', err);
                  Alert.alert('Error', 'Something went wrong. Please try again.');
                } finally {
                  setNotificationsBusy(false);
                }
              }}
              trackColor={{ false: '#d1d5db', true: '#E07A5F' }}
              thumbColor={preferences.notifications ? '#ffffff' : '#f3f4f6'}
              disabled={!isPhysicalDevice() || notificationsBusy}
            />
          </View>

          <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
            <View className="flex-row items-center flex-1">
              <Palette size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-gray-800">Dark Mode</Text>
                <Text className="text-sm text-gray-500">Coming soon</Text>
              </View>
            </View>
            <Switch
              value={preferences.darkMode}
              onValueChange={(value) => savePreferences({ ...preferences, darkMode: value })}
              trackColor={{ false: '#d1d5db', true: '#E07A5F' }}
              thumbColor={preferences.darkMode ? '#ffffff' : '#f3f4f6'}
              disabled={true}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center flex-1">
              <Download size={20} color="#6b7280" />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="font-semibold text-gray-800">Auto Backup</Text>
                  {isUserPremium === false && (
                    <View className="ml-2 bg-primary/20 px-2 py-0.5 rounded">
                      <Text className="text-xs text-primary font-semibold">Premium</Text>
                    </View>
                  )}
                </View>
                <Text className="text-sm text-gray-500">
                  Weekly automatic backups
                  {preferences.autoBackup && (
                    <Text className="text-primary"> • Last: {lastBackupDate}</Text>
                  )}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.autoBackup}
              onValueChange={(value) => savePreferences({ ...preferences, autoBackup: value })}
              trackColor={{ false: '#d1d5db', true: '#E07A5F' }}
              thumbColor={preferences.autoBackup ? '#ffffff' : '#f3f4f6'}
              disabled={isUserPremium === false && !preferences.autoBackup}
            />
          </View>
        </View>

        {/* Account Section */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <UserCircle size={24} color="#E07A5F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Account</Text>
          </View>
          
          <TouchableOpacity
            className="bg-red-50 p-4 rounded-xl border border-red-200"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                <LogOut size={20} color="#ef4444" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800">Logout</Text>
                <Text className="text-sm text-gray-600">Sign out of your account</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Data Management */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Database size={24} color="#E07A5F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Data Management</Text>
          </View>
          
          <View className="bg-gray-50 p-4 rounded-xl mb-3">
            <Text className="text-sm text-gray-600 mb-2">Storage Used</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {memories?.length || 0} {(memories?.length || 0) === 1 ? 'memory' : 'memories'}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              Across {children.length} {children.length === 1 ? 'child' : 'children'}
            </Text>
          </View>
          
          <TouchableOpacity
            className="bg-primary/5 p-4 rounded-xl border border-primary/20"
            onPress={() => navigation.navigate('DataManagement')}
          >
            <View className="flex-row items-center">
              <View className="bg-primary w-10 h-10 rounded-full items-center justify-center mr-3">
                <Database size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800">Manage Data</Text>
                <Text className="text-sm text-gray-600">Export, import, or clear all data</Text>
              </View>
              <View>
                <Text className="text-gray-400">›</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Info size={24} color="#E07A5F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">About</Text>
          </View>
          
          <Text className="text-gray-700 mb-2">
            <Text className="font-semibold">MemoryLane</Text> - Family Memory Journal
          </Text>
          <Text className="text-gray-500 text-sm mb-4">
            Capture and preserve precious moments with your loved ones. Add photos, voice recordings, and written memories to create a beautiful timeline of your family's journey.
          </Text>
          <View className="bg-primary/5 rounded-xl p-4 mb-3">
            <Text className="text-purple-900 font-medium mb-2">Features</Text>
            <Text className="text-purple-700 text-xs mb-1">✅ Multiple children support</Text>
            <Text className="text-purple-700 text-xs mb-1">✅ Photo & voice memories</Text>
            <Text className="text-purple-700 text-xs mb-1">✅ Timeline view</Text>
            <Text className="text-purple-700 text-xs mb-1">✅ Milestone tracking</Text>
            <Text className="text-purple-700 text-xs">✅ Data export & import</Text>
          </View>
          <Text className="text-gray-400 text-xs text-center">
            Version 1.1.1 • Built with ❤️
          </Text>
        </View>

        {/* App Information */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">About MemoryLane</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-700">Version</Text>
              <Text className="text-gray-500 font-medium">1.1.1</Text>
            </View>
            
            <TouchableOpacity 
              className="flex-row justify-between items-center py-3 border-b border-gray-100"
              onPress={() => Alert.alert(
                'About MemoryLane',
                'MemoryLane helps parents capture and cherish precious moments with their children. Every photo, voice note, and story is safely stored and beautifully organized.\n\nBuilt with love for families everywhere. 💜'
              )}
            >
              <Text className="text-gray-700">About</Text>
              <Text className="text-primary">→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row justify-between items-center py-3 border-b border-gray-100"
              onPress={() => Alert.alert(
                'Privacy Policy',
                'Your data is private and secure:\n\n• All memories stored in your personal Firebase account\n• Photos and audio encrypted in Firebase Storage\n• AI transcription processed securely via OpenAI\n• We never share your data with third parties\n• You can export or delete your data anytime'
              )}
            >
              <Text className="text-gray-700">Privacy Policy</Text>
              <Text className="text-primary">→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row justify-between items-center py-3"
              onPress={() => Alert.alert(
                'Terms of Service',
                'By using MemoryLane, you agree to:\n\n• Use the app for personal, family purposes\n• Keep your login credentials secure\n• Respect intellectual property rights\n• Follow applicable laws and regulations\n\nMemoryLane is provided "as is" without warranties. We are not liable for data loss - please backup important memories.'
              )}
            >
              <Text className="text-gray-700">Terms of Service</Text>
              <Text className="text-primary">→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & Feedback */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Support</Text>
          
          <TouchableOpacity 
            className="bg-primary/5 p-4 rounded-xl border border-primary/20 mb-3"
            onPress={() => Alert.alert(
              'Contact Support',
              'Need help? Reach out to us:\n\nEmail: support@memorylane.app\n\nWe typically respond within 24 hours.',
              [
                { text: 'OK' }
              ]
            )}
          >
            <View className="flex-row items-center">
              <View className="bg-primary w-10 h-10 rounded-full items-center justify-center mr-3">
                <Mail size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800">Contact Support</Text>
                <Text className="text-sm text-gray-600">Get help with issues</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="bg-background p-4 rounded-xl border border-blue-200"
            onPress={() => Alert.alert(
              'Send Feedback',
              'We love hearing from you!\n\nShare your ideas, feature requests, or just let us know how MemoryLane is working for your family.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Send Email', onPress: () => {
                  // In a real app, this would open email
                  Alert.alert('Thanks!', 'Email feedback to: feedback@memorylane.app');
                }}
              ]
            )}
          >
            <View className="flex-row items-center">
              <View className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Sparkles size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-800">Send Feedback</Text>
                <Text className="text-sm text-gray-600">Help us improve</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Developer Info - Optional */}
        <View className="items-center pb-6">
          <Text className="text-gray-400 text-sm">Made with 💜 for families</Text>
          <Text className="text-gray-400 text-xs mt-1">© 2025 MemoryLane</Text>
        </View>
      </ScrollView>
    </View>
  );
}