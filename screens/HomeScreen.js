import { View, Text, ScrollView, StatusBar, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Mail, Settings, Bell, Sparkles, X } from 'lucide-react-native';
import { loadMemories, loadChild, loadChildren,saveChildren, getMemoriesForChild  } from '../utils/storage';
import { formatDate, parseLocalDate } from '../utils/dateHelper';
import ChildSelector from '../components/ChildSelector';
import { getChildContributors, getPendingInvitations } from '../utils/invitations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChildAvatar from '../components/ChildAvatar';
import { isOnTrial, getTrialInfo } from '../utils/subscription';
import { notifyPendingInvitations } from '../utils/notifications';

const SELECTED_CHILD_ID_KEY = '@selectedChildId';
const CONTRIBUTORS_REFRESH_KEY = '@contributorsChanged';

export default function HomeScreen({ navigation }) {      
  const [selectedChild, setSelectedChild] = useState(null);
  const [children, setChildren] = useState([]);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contributorsCount, setContributorsCount] = useState(1);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [trialInfo, setTrialInfo] = useState(null);
  const [trialAlertShown, setTrialAlertShown] = useState(false); // Track if alert was shown in this session
  const hasLoadedInvitations = useRef(false);

  useEffect(() => {
    loadPendingInvitations();
    // Reload pending invitations when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadPendingInvitations();
    });
    return unsubscribe;
  }, [navigation]);
  
  const loadPendingInvitations = async () => {
    try {
      const invitations = await getPendingInvitations();
      setPendingInvitationsCount(invitations.length);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    }
  };

  useEffect(() => {
    // Skip first load to avoid an immediate notification on app open.
    if (!hasLoadedInvitations.current) {
      hasLoadedInvitations.current = true;
      return;
    }

    if (pendingInvitationsCount > 0) {
      notifyPendingInvitations(pendingInvitationsCount).catch((error) => {
        console.warn('Pending invitations notification failed:', error);
      });
    }
  }, [pendingInvitationsCount]);

  useEffect(() => {
    if (selectedChild) {
      loadContributorsCount();
    }
  }, [selectedChild]);

  const loadContributorsCount = async () => {
    try {
      const contributors = await getChildContributors(selectedChild.id);
      setContributorsCount(contributors.length);
    } catch (error) {
      console.error('Error loading contributors count:', error);
      setContributorsCount(1); // Default to 1 (owner)
    }
  };

  // Load data when screen appears
  useEffect(() => {
    const loadScreenData = async () => {
      await loadData();
      // Add a small delay to ensure trial activation has completed
      setTimeout(() => {
        checkTrialStatus();
      }, 500);
    };
    
    loadScreenData();
    
    // Reload data when coming back to this screen
    const unsubscribe = navigation.addListener('focus', async () => {
      const contributorsChanged = await AsyncStorage.getItem(CONTRIBUTORS_REFRESH_KEY);
      if (contributorsChanged === 'true') {
        await AsyncStorage.removeItem(CONTRIBUTORS_REFRESH_KEY);
      }
      await loadData();
      await loadPendingInvitations();
      // Add a small delay to ensure trial activation has completed
      setTimeout(() => {
        checkTrialStatus();
      }, 500);
    });
    
    return unsubscribe;
  }, [navigation]);

  // Check trial status and show notification
  const checkTrialStatus = async () => {
    try {
      const onTrial = await isOnTrial();
      if (onTrial) {
        const info = await getTrialInfo();
        setTrialInfo(info);
        
        // Check if we should show the trial notification banner
        const showNotification = await AsyncStorage.getItem('@showTrialNotification');
        const bannerDismissed = await AsyncStorage.getItem('@trialBannerDismissed');
        
        if (showNotification === 'true' && !trialAlertShown) {
          // Clear the flag immediately to prevent duplicate alerts
          await AsyncStorage.setItem('@showTrialNotification', 'false');
          setTrialAlertShown(true); // Mark as shown in this session
          setShowTrialBanner(true);
          
          // Show alert once
          Alert.alert(
            '🎉 Premium Trial Activated!',
            `You now have access to all premium features for ${info.daysRemaining} days!\n\nYour trial ends on ${info.endDate ? (info.endDate instanceof Date ? info.endDate : new Date(info.endDate)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}.\n\nEnjoy unlimited memories, photo avatars, and more!`,
            [
              {
                text: 'Got it!',
                onPress: () => {
                  // Flag already cleared above
                }
              },
              {
                text: 'View Premium',
                onPress: () => {
                  navigation.navigate('Premium');
                },
                style: 'default'
              }
            ]
          );
        } else if (bannerDismissed !== 'true') {
          // Show banner if on trial and not dismissed (but don't show alert again)
          setShowTrialBanner(true);
        } else {
          // Banner was dismissed, don't show it
          setShowTrialBanner(false);
        }
      } else {
        setShowTrialBanner(false);
        setTrialInfo(null);
        // Clear dismissal flag when trial ends
        await AsyncStorage.removeItem('@trialBannerDismissed');
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const childrenData = await loadChildren();
      setChildren(childrenData);
      
      // Select child - prioritize AsyncStorage (set by TimelineScreen or previous selection)
      if (childrenData && childrenData.length > 0) {
        let childToSelect = null;
        
        // First, try to get selected child from AsyncStorage (set by TimelineScreen or previous selection)
        try {
          const storedChildId = await AsyncStorage.getItem(SELECTED_CHILD_ID_KEY);
          if (storedChildId) {
            const storedChild = childrenData.find(c => c.id === storedChildId);
            if (storedChild) {
              childToSelect = storedChild;
              console.log('🏠 HomeScreen: Using stored child from AsyncStorage:', storedChild.name);
            }
          }
        } catch (error) {
          console.error('Error reading selected child from storage:', error);
        }
        
        // If no stored child, check if current selectedChild still exists
        if (!childToSelect) {
          const currentChildExists = selectedChild && 
            childrenData.some(child => child.id === selectedChild.id);
          
          if (currentChildExists) {
            childToSelect = selectedChild;
            console.log('🏠 HomeScreen: Using current selected child:', childToSelect.name);
          }
        }
        
        // Fallback to first child if nothing else found
        if (!childToSelect) {
          childToSelect = childrenData[0];
          console.log('🏠 HomeScreen: Using first child as fallback:', childToSelect.name);
        }
        
        setSelectedChild(childToSelect);
        
        if (childToSelect) {
          // Store selected child ID in AsyncStorage for other screens to access
          await AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, childToSelect.id);
          const memoriesData = await getMemoriesForChild(childToSelect.id);
          setMemories(memoriesData);
        }
      } else {
        setSelectedChild(null);
        setMemories([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = async (child) => {
    setSelectedChild(child);
    // Store selected child ID in AsyncStorage for other screens to access
    await AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, child.id);
    const memoriesData = await getMemoriesForChild(child.id);
    setMemories(memoriesData);
  };

  const handleAddChild = () => {
    navigation.navigate('AddChild');
  };

  const calculateAge = (birthdate) => {
    const birth = new Date(birthdate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + 
                   today.getMonth() - birth.getMonth();
    
    if (months < 12) {
      return `${months} months old`;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 
      ? `${years}y ${remainingMonths}m old` 
      : `${years} ${years === 1 ? 'year' : 'years'} old`;
  };

  const milestoneCount = memories.filter(m => m.milestone).length;

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-primary p-6 pb-6 rounded-b-3xl" style={{ paddingTop: 70 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-3xl font-bold text-white">MemoryLane</Text>
            <View className="flex-row items-center gap-3">
              {/* Notifications Bell - Always visible */}
              <TouchableOpacity
                onPress={() => navigation.navigate('AcceptInvitation')}
                style={{
                  position: 'relative',
                  padding: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                activeOpacity={0.7}
              >
                <Bell 
                  size={22} 
                  color="white" 
                  strokeWidth={2.5}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                  }}
                />
                {pendingInvitationsCount > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: '#FF4444',
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderColor: 'white',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 3,
                      elevation: 5,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '800' }}>
                      {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
                <Settings size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Child Selector */}
          {children.length > 0 && (
            <ChildSelector
              children={children}
              selectedChild={selectedChild}
              onSelectChild={handleSelectChild}
              onAddChild={handleAddChild}
            />
          )}
        </View>

        {/* Premium Trial Banner */}
        {showTrialBanner && trialInfo && (
          <View style={{
            backgroundColor: '#10B981',
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 12,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 8,
              padding: 8,
              marginRight: 12,
            }}>
              <Sparkles size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '700',
                marginBottom: 4,
              }}>
                Premium Trial Active
              </Text>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 13,
                lineHeight: 18,
              }}>
                {trialInfo.daysRemaining} days remaining • Ends {trialInfo.endDate ? (trialInfo.endDate instanceof Date ? trialInfo.endDate : new Date(trialInfo.endDate)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Premium')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                marginRight: 8,
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 13,
                fontWeight: '600',
              }}>
                View
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                setShowTrialBanner(false);
                await AsyncStorage.setItem('@trialBannerDismissed', 'true');
              }}
              style={{
                padding: 4,
              }}
            >
              <X size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Child Profile Card */}
        {selectedChild && (
          <>
            <View className="p-6">
              <View className="bg-white rounded-2xl p-6 shadow-lg">
                <View className="flex-row items-center mb-4">
                  <View className="bg-accent w-20 h-20 rounded-full items-center justify-center mr-4" style={{ overflow: 'hidden' }}>
                    <ChildAvatar
                      avatar={selectedChild.avatar}
                      avatarPhotoUrl={selectedChild.avatarPhotoUrl}
                      size={80}
                    />
                  </View>
                  
                  <View className="flex-1">
                    <Text className="text-2xl font-bold text-gray-800">
                      {selectedChild.name}
                    </Text>
                    <Text className="text-gray-600">
                      {calculateAge(selectedChild.birthdate)}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                    Born {(() => {
                      const [year, month, day] = selectedChild.birthdate.split('-');
                      const date = new Date(year, parseInt(month) - 1, day);
                      return date.toLocaleDateString('en-US', { 
                        month: 'long',
                        day: 'numeric', 
                        year: 'numeric'
                      });
                    })()}
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={{
                  height: 1,
                  backgroundColor: '#E8ECEF',
                  marginTop: 10,
                  marginBottom: 14,
                }} />

                {/* Stats */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                }}>
            {/* Memories */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#87C38F' }}>
                {memories.length}
              </Text>
              <Text style={{ fontSize: 14, color: '#636E72' }}>
                Memories
              </Text>
            </View>

            {/* Milestones */}
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#87C38F' }}>
                {milestoneCount}
              </Text>
              <Text style={{ fontSize: 14, color: '#636E72' }}>
                Milestones
              </Text>
            </View>

            {/* Contributors - CLICKABLE */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Contributors', {
                childId: selectedChild.id,
                childName: selectedChild.name,
              })}
              style={{ alignItems: 'center' }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 32, fontWeight: '700', color: '#6366F1' }}>
                {contributorsCount}
              </Text>
              <Text style={{ fontSize: 14, color: '#636E72' }}>
                Contributors
              </Text>
            </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Actions - Separate Tile */}
            <View className="px-6 mb-6">
              <View className="flex-row gap-4">
                <TouchableOpacity 
                  style={{
                    flex: 1,
                    backgroundColor: '#87C38F', // Sage Green
                    padding: 24,
                    borderRadius: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => navigation.navigate('AddMemory', { childId: selectedChild.id })}
                >
                  <Plus size={32} color="white" />
                  <Text style={{ color: 'white', fontWeight: '600', marginTop: 8, fontSize: 16 }}>
                    Add Memory
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 2,
                    borderColor: '#87C38F',
                    padding: 24,
                    borderRadius: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => navigation.navigate('Timeline')}
                >
                  <Calendar size={32} color="#E07A5F" />
                  <Text style={{ color: '#2D3436', fontWeight: '600', marginTop: 8, fontSize: 16 }}>
                    View Timeline
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Monthly Email Feature - Separate Tile */}
            <View className="px-6 mb-6">
              <View className="bg-accent/20 rounded-2xl p-6 shadow-lg border-2 border-accent/40">
                <View className="flex-row items-start gap-3 mb-4">
                  <View className="bg-accent w-12 h-12 rounded-full items-center justify-center">
                    <Mail size={24} color="#2D3436" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-text-dark mb-1">
                      Monthly Email Summaries
                    </Text>
                    <Text className="text-sm text-text-light">
                      Get a beautiful summary of {selectedChild.name}'s memories every month
                    </Text>
                  </View>
                </View>
                
                <View className="bg-white rounded-xl p-4 mb-4">
                  <View className="flex-row items-center justify-between text-sm mb-2">
                    <Text className="text-text-light">This month:</Text>
                    <Text className="text-primary font-bold">
                      {memories.filter(m => {
                        // Parse date as local date to avoid timezone issues
                        const memoryDate = parseLocalDate(m.date);
                        const now = new Date();
                        return memoryDate.getMonth() === now.getMonth() && 
                              memoryDate.getFullYear() === now.getFullYear();
                      }).length} memories
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  className="w-full bg-secondary py-3 rounded-xl shadow"
                  onPress={() => navigation.navigate('MonthlySummary', { child: selectedChild })}
                >
                  <Text className="text-white font-semibold text-center">
                    Generate Summary →
                  </Text>
                </TouchableOpacity> 
              </View>
            </View>
          </>
        )}

        {/* Empty State - No Child Selected */}
{!selectedChild && !loading && (
  <View className="mx-6 mb-6">
    <View className="bg-white rounded-2xl p-8 shadow-lg items-center">
      <View className="bg-primary/10 w-24 h-24 rounded-full items-center justify-center mb-4">
        <Text className="text-6xl">👶</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-800 mb-2">
        Welcome to MemoryLane!
      </Text>
      <Text className="text-gray-600 text-center mb-6 leading-relaxed">
        Start your journey by adding your child's profile. Capture every precious moment and milestone.
      </Text>
      <TouchableOpacity 
        className="bg-white px-4 py-2 rounded-full shadow-lg"
        onPress={handleAddChild}
      >
        <View className="flex-row items-center">
          <Text className="text-lg mr-2">➕</Text>
          <Text className="text-primary font-bold text-sm">Add</Text>
        </View>
      </TouchableOpacity>
    </View>
    
    {/* Feature Preview Cards */}
    <View className="mt-6 space-y-4">
      <View className="bg-white rounded-xl p-4 flex-row items-center shadow">
        <View className="bg-blue-100 w-12 h-12 rounded-full items-center justify-center mr-4">
          <Text className="text-2xl">📸</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-800">Capture Memories</Text>
          <Text className="text-sm text-gray-600">Photos, voice notes, and text</Text>
        </View>
      </View>
      
      <View className="bg-white rounded-xl p-4 flex-row items-center shadow">
        <View className="bg-primary/10 w-12 h-12 rounded-full items-center justify-center mr-4">
          <Text className="text-2xl">🤖</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-800">AI-Powered Summaries</Text>
          <Text className="text-sm text-gray-600">Monthly email highlights</Text>
        </View>
      </View>
      
      <View className="bg-white rounded-xl p-4 flex-row items-center shadow">
        <View className="bg-pink-100 w-12 h-12 rounded-full items-center justify-center mr-4">
          <Text className="text-2xl">📅</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-800">Beautiful Timeline</Text>
          <Text className="text-sm text-gray-600">Organized and searchable</Text>
        </View>
      </View>
    </View>
  </View>
)}

        {/* Recent Memories */}
        {selectedChild && memories.length > 0 && (
          <View className="mx-6 mb-6 bg-white rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-bold text-gray-800">Recent Memories</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Timeline')}>
                <Text className="text-sm text-primary font-medium">See all →</Text>
              </TouchableOpacity>
            </View>
            {memories.slice(0, 3).map((memory, index) => (
              <TouchableOpacity
                key={`${memory.id}-${index}`}
                className="flex-row gap-3 p-3 bg-primary/5 rounded-xl mb-2"
                onPress={() => navigation.navigate('Timeline')}
              >
                {/* Thumbnail or Icon */}
                {memory.photoUrl || memory.photoUri ? (
                <Image
                  source={{ uri: memory.photoUrl || memory.photoUri }}
                  className="w-12 h-12 rounded-lg"
                  resizeMode="cover"
                />
              ) : memory.audioUrl || memory.audioUri ? (
                <View className="w-12 h-12 bg-indigo-200 rounded-lg items-center justify-center">
                  <Text className="text-xl">🎤</Text>
                </View>
              ) : (
                <View className="w-12 h-12 bg-primary/20 rounded-lg items-center justify-center">
                  <Text className="text-xl">
                    {memory.milestone ? '🎉' : '✏️'}
                  </Text>
                </View>
              )}
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800 text-sm" numberOfLines={1}>
                    {memory.title}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {formatDate(memory.date)}
                  </Text>
                </View>
                {memory.milestone && (
                  <View className="bg-yellow-400 px-2 py-1 rounded-full self-center">
                    <Text className="text-xs font-bold text-yellow-900">⭐</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State - No Memories */}
{/* Empty State - No Memories */}
{selectedChild && memories.length === 0 && !loading && (
  <View className="mx-6 mb-6 bg-white rounded-2xl p-8 shadow-lg">
    <View className="items-center">
      <View className="bg-primary/10 w-32 h-32 rounded-full items-center justify-center mb-6">
        <Text className="text-7xl">📖</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-800 mb-2">
        {selectedChild.name}'s Story Begins Here
      </Text>
      <Text className="text-gray-600 text-center mb-6 leading-relaxed px-4">
        Start capturing precious moments! Add photos, record voice notes, or write down memories as they happen.
      </Text>
      
      {/* Quick Action Cards */}
      <View className="w-full space-y-3 mb-6">
        <View className="bg-primary/5 p-4 rounded-xl border border-primary/20">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-3">📸</Text>
            <Text className="font-bold text-gray-800">First Photo</Text>
          </View>
          <Text className="text-sm text-gray-600">Capture a special moment</Text>
        </View>
        
        <View className="bg-background p-4 rounded-xl border border-primary/20">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-3">🎤</Text>
            <Text className="font-bold text-gray-800">Voice Memory</Text>
          </View>
          <Text className="text-sm text-gray-600">Record what happened today</Text>
        </View>
        
        <View className="bg-pink-50 p-4 rounded-xl border border-pink-200">
          <View className="flex-row items-center mb-2">
            <Text className="text-2xl mr-3">🎉</Text>
            <Text className="font-bold text-gray-800">Milestone</Text>
          </View>
          <Text className="text-sm text-gray-600">Mark an important achievement</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        className="bg-primary px-8 py-4 rounded-full shadow-lg w-full"
        onPress={() => navigation.navigate('AddMemory', { childId: selectedChild.id })}
      >
        <Text className="text-white font-bold text-lg text-center">Create First Memory</Text>
      </TouchableOpacity>
    </View>
  </View>
)}
      </ScrollView>
    </View>

  );
}