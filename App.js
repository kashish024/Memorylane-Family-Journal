import { LogBox } from 'react-native';
import { useState, useEffect, useRef } from 'react';

// Ignore expo-av known bugs
LogBox.ignoreLogs([
  'Exception in HostFunction',
  'expected dynamic type',
]);

import ErrorBoundary from './components/ErrorBoundary';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Baby, Plus, Calendar } from 'lucide-react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './screens/OnboardingScreen';
import ExportDataScreen from './screens/ExportDataScreen';

// Screens
import PhotoViewScreen from './screens/PhotoViewScreen';
import HomeScreen from './screens/HomeScreen';
import AddMemoryScreen from './screens/AddMemoryScreen';
import TimelineScreen from './screens/TimelineScreen';
import AddChildScreen from './screens/AddChildScreen';
import EditChildScreen from './screens/EditChildScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import MonthlySummaryScreen from './screens/MonthlySummaryScreen';
import EditMemoryScreen from './screens/EditMemoryScreen';
import MigrationScreen from './screens/MigrationScreen';
import ContributorsScreen from './screens/ContributorsScreen';
import AcceptInvitationScreen from './screens/AcceptInvitationScreen';
import PremiumScreen from './screens/PremiumScreen';
import DataManagementScreen from './screens/DataManagementScreen';
import { checkAndSendMonthlySummaries } from './utils/autoMonthlySummary';
import { checkAndPerformAutoBackup } from './utils/autoBackup';
import { initializeRevenueCat, syncSubscriptionStatus } from './utils/revenueCat';
import { activateTrial } from './utils/subscription';
import { notifyAutoBackupCompleted, notifyMonthlySummarySent } from './utils/notifications';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

// Deep linking configuration
const linking = {
  prefixes: ['memorylane://', 'https://memorylane.app'],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: 'home',
        },
      },
      AcceptInvitation: {
        path: 'invitation/:id',
        parse: {
          id: (id) => `${id}`,
        },
      },
    },
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#E07A5F',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              position: 'absolute',
              bottom: 2, // Raise it above the tab bar
              width: 50,
              height: 50,
              borderRadius: 35,
              backgroundColor: '#87C38F', 
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: focused ? '#E07A5F' : '#000000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 10,
            }}>
            <Baby size={24} color="white" strokeWidth={2.5} />
          </View>
        ),
        }}
      />
      <Tab.Screen 
      name="AddMemory" 
      component={AddMemoryScreen}
      options={{
        tabBarLabel: 'Add Memory',
        tabBarIcon: ({ focused }) => (
          <View style={{
            position: 'absolute',
            bottom: 2, // Raise it above the tab bar
            width: 50,
            height: 50,
            borderRadius: 35,
            backgroundColor: '#87C38F', // Sage Green
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#87C38F',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 10,
          }}>
            <Plus size={24} color="white" strokeWidth={3} />
          </View>
        ),
      }}
    />
      <Tab.Screen 
        name="Timeline" 
        component={TimelineScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              position: 'absolute',
              bottom: 2, // Raise it above the tab bar
              width: 50,
              height: 50,
              borderRadius: 35,
              backgroundColor: '#87C38F', 
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#87C38F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
              elevation: 10,
            }}>
            <Calendar size={24} color="white" strokeWidth={3} />
          </View>
        ),
      }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Tabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AddChild" 
        component={AddChildScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="EditChild" 
        component={EditChildScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AddMemory" 
        component={AddMemoryScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Timeline" 
        component={TimelineScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="PhotoView" 
        component={PhotoViewScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="MonthlySummary" 
        component={MonthlySummaryScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
      name="ExportData" 
      component={ExportDataScreen} 
      options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="EditMemory" 
        component={EditMemoryScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Contributors" 
        component={ContributorsScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AcceptInvitation" 
        component={AcceptInvitationScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Premium" 
        component={PremiumScreen}
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="DataManagement" 
        component={DataManagementScreen}
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null); // null = not checked yet, false/true = determined
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [checkingMigration, setCheckingMigration] = useState(false);
  const pendingNotificationRouteRef = useRef(null);

  const navigateFromNotificationData = (data = {}) => {
    if (!data || typeof data !== 'object') return;
    if (!user || !hasSeenOnboarding || !migrationComplete) return;

    const { screen, params, url, invitationId } = data;

    if (typeof url === 'string' && url.length > 0) {
      Linking.openURL(url).catch((error) => {
        console.warn('Failed to open notification URL:', error);
      });
      return;
    }

    if (!screen || !navigationRef.isReady()) return;

    if (screen === 'AcceptInvitation' && invitationId) {
      navigationRef.navigate('AcceptInvitation', { id: invitationId });
      return;
    }

    navigationRef.navigate(screen, params && typeof params === 'object' ? params : undefined);
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Check migration status when user is logged in
      if (user) {
        // Check if this is a new user by checking Firestore user document
        try {
          const { doc, getDoc } = require('firebase/firestore');
          const { db } = require('./utils/firebase');
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          // If user document doesn't exist, this is a brand new user - force onboarding
          if (!userDoc.exists()) {
            console.log('🆕 New user detected (no document) - showing onboarding');
            // Clear any existing onboarding flag from previous sessions
            await AsyncStorage.removeItem('hasSeenOnboarding');
            setHasSeenOnboarding(false);
          } else {
            // User document exists - check if onboardingCompleted flag exists
            const userData = userDoc.data();
            const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
            
            // If onboardingCompleted field doesn't exist in Firestore, it's a new user
            // (even if document was just created in SignupScreen)
            console.log('📋 Checking onboarding status:', {
              onboardingCompleted: userData.onboardingCompleted,
              isUndefined: userData.onboardingCompleted === undefined,
              isNull: userData.onboardingCompleted === null
            });
            
            if (userData.onboardingCompleted === undefined || userData.onboardingCompleted === null) {
              console.log('🆕 New user detected (no onboardingCompleted flag) - showing onboarding');
              // Clear any existing onboarding flag from previous sessions
              await AsyncStorage.removeItem('hasSeenOnboarding');
              setHasSeenOnboarding(false);
              console.log('✅ Set hasSeenOnboarding to false');
            } else if (userData.onboardingCompleted === true) {
              // User has completed onboarding
              console.log('✅ User has completed onboarding');
              setHasSeenOnboarding(true);
            } else {
              // Explicitly false - show onboarding
              console.log('📝 User needs onboarding (explicitly false)');
              setHasSeenOnboarding(false);
            }
          }
        } catch (error) {
          console.error('Error checking user document:', error);
          // Fallback to AsyncStorage check
          const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
          setHasSeenOnboarding(onboardingStatus === 'true');
        }
        
        await checkMigrationStatus();
        
        // Activate 14-day premium trial for new users
        try {
          const { doc, getDoc } = require('firebase/firestore');
          const { db } = require('./utils/firebase');
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          // If user document doesn't exist or trial hasn't been used, activate trial
          if (!userDoc.exists() || !userDoc.data().trialUsed) {
            console.log('🎁 Activating 14-day premium trial for new user');
            const trialInfo = await activateTrial(user.uid);
            
            // Don't set the notification flag here - it will be set after onboarding completes
            // This prevents the pop-up from showing during onboarding
            // The flag will be set in OnboardingScreen.handleComplete()
          }
        } catch (error) {
          console.error('Error activating trial:', error);
        }
        
        // Initialize RevenueCat with user ID
        try {
          await initializeRevenueCat(user.uid);
          // Sync subscription status
          await syncSubscriptionStatus();
        } catch (error) {
          console.error('Error initializing RevenueCat:', error);
        }
        
        // Set loading to false only after all checks are complete
        setLoading(false);
      } else {
        // No user - set onboarding to null and stop loading
        setHasSeenOnboarding(null);
        setMigrationComplete(true);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const checkMigrationStatus = async () => {
    try {
      setCheckingMigration(true);
      const { needsMigration } = require('./utils/storage');
      const needs = await needsMigration();
      
      if (!needs) {
        setMigrationComplete(true);
      }
    } catch (error) {
      console.error('Error checking migration:', error);
      // If error, just proceed
      setMigrationComplete(true);
    } finally {
      setCheckingMigration(false);
    }
  };

  // Check and send monthly summaries when app loads and user is authenticated
  useEffect(() => {
    if (user && migrationComplete && hasSeenOnboarding) {
      // Run in background without blocking UI
      checkAndSendMonthlySummaries()
        .then((result) => {
          const totalSent = (result.sent || 0) + (result.deferredSent || 0);
          if (totalSent > 0) {
            notifyMonthlySummarySent(totalSent).catch((err) => {
              console.warn('Monthly summary notification failed:', err);
            });
          }
        })
        .catch(error => {
          console.error('Error checking monthly summaries:', error);
          // Silently fail - don't interrupt user experience
        });
      
      // Check and perform auto backup if needed
      checkAndPerformAutoBackup().then(result => {
        if (result.performed) {
          console.log('✅ Auto backup completed:', result.reason);
          notifyAutoBackupCompleted().catch((err) => {
            console.warn('Auto backup notification failed:', err);
          });
        } else {
          console.log('⏭️ Auto backup skipped:', result.reason);
        }
      }).catch(error => {
        console.error('Error checking auto backup:', error);
        // Silently fail - don't interrupt user experience
      });
    }
  }, [user, migrationComplete, hasSeenOnboarding]);

  useEffect(() => {
    // Listen for notification taps while app is running/backgrounded
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (navigationRef.isReady()) {
        navigateFromNotificationData(data);
      } else {
        pendingNotificationRouteRef.current = data;
      }
    });

    // Handle cold-start notification tap
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const data = response?.notification?.request?.content?.data || null;
        if (!data) return;
        if (navigationRef.isReady()) {
          navigateFromNotificationData(data);
        } else {
          pendingNotificationRouteRef.current = data;
        }
      })
      .catch((error) => {
        console.warn('Failed to read last notification response:', error);
      });

    return () => subscription.remove();
  }, []);

  // Show loading spinner if:
  // - Initial loading
  // - Checking migration
  // - User is logged in but onboarding status is not determined yet
  if (loading || checkingMigration || (user && hasSeenOnboarding === null)) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA'}}>
        <ActivityIndicator size="large" color="#87C38F" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          if (pendingNotificationRouteRef.current) {
            const pendingData = pendingNotificationRouteRef.current;
            pendingNotificationRouteRef.current = null;
            navigateFromNotificationData(pendingData);
          }
        }}
      >
        {user ? (
          hasSeenOnboarding ? (
            !migrationComplete ? (
              <MigrationScreen onComplete={() => setMigrationComplete(true)} />
            ) : (
              <MainStack />
            )
          ) : (
            <OnboardingScreen onComplete={() => setHasSeenOnboarding(true)} />
          )
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </ErrorBoundary>
  );
}