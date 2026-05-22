// ContributorsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getChildContributors, getChildPendingInvitations, resendInvitation, removeContributor, removeSelfAsContributor } from '../utils/invitations';
import { auth } from '../utils/firebase';
import InviteContributorModal from '../components/InviteContributorModal';
import { canAddContributor } from '../utils/subscription';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTRIBUTORS_REFRESH_KEY = '@contributorsChanged';

const ContributorsScreen = ({ route, navigation }) => {
  const { childId, childName } = route?.params || {};
  
  const [contributors, setContributors] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (childId) {
      loadContributors();
    }
  }, [childId]);

  // Refresh when screen comes into focus (e.g., after enabling premium)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔍 ContributorsScreen: Screen focused, refreshing...');
      if (childId) {
        loadContributors();
      }
    });
    return unsubscribe;
  }, [navigation, childId]);

  const loadContributors = async () => {
    setLoading(true);
    try {
      const [contributorsData, invitationsData] = await Promise.all([
        getChildContributors(childId),
        getChildPendingInvitations(childId),
      ]);
      
      setContributors(contributorsData);
      setPendingInvitations(invitationsData);
    } catch (error) {
      console.error('Error loading contributors:', error);
      Alert.alert('Error', 'Failed to load contributors');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = contributors.length > 0 && contributors.find(c => c.role === 'owner')?.userId === auth.currentUser?.uid;

  const handleInvitePress = async () => {
    // Check subscription limits before opening invite modal
    try {
      const currentContributorsCount = contributors.filter(c => c.role !== 'owner').length;
      
      // Force a fresh read with forceRefresh flag
      const { getSubscriptionTier, SUBSCRIPTION_TIERS } = require('../utils/subscription');
      const tier = await getSubscriptionTier(true); // Force refresh
      console.log('🔍 ContributorsScreen - Current subscription tier:', tier);
      
      const canAdd = await canAddContributor(currentContributorsCount, childId);
      console.log('🔍 ContributorsScreen - Can add contributor?', canAdd);
      
      if (!canAdd.canAdd) {
        Alert.alert(
          'Upgrade to Premium',
          canAdd.reason,
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
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
    
    setShowInviteModal(true);
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      await resendInvitation(invitationId);
      Alert.alert('Success', 'Invitation resent successfully!');
      loadContributors(); // Refresh the list
    } catch (error) {
      console.error('Error resending invitation:', error);
      Alert.alert('Error', error.message || 'Failed to resend invitation');
    }
  };

  const handleRemoveContributor = (contributor) => {
    Alert.alert(
      'Remove Contributor?',
      `Are you sure you want to remove ${contributor.name}? They will no longer be able to view or add memories.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeContributor(childId, contributor.userId);
              await AsyncStorage.setItem(CONTRIBUTORS_REFRESH_KEY, 'true');
              Alert.alert('Success', `${contributor.name} has been removed`);
              loadContributors(); // Refresh the list
            } catch (error) {
              console.error('Error removing contributor:', error);
              Alert.alert('Error', error.message || 'Failed to remove contributor');
            }
          },
        },
      ]
    );
  };

  const handleLeaveAsContributor = () => {
    Alert.alert(
      'Leave as Contributor?',
      'Are you sure you want to leave? You will no longer be able to view or add memories for this child.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeSelfAsContributor(childId);
              await AsyncStorage.setItem(CONTRIBUTORS_REFRESH_KEY, 'true');
              Alert.alert(
                'Success',
                'You have left as a contributor',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate to Tabs (Home screen) since user no longer has access
                      // Use reset to clear the navigation stack and go to Tabs
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Tabs' }],
                      });
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error leaving as contributor:', error);
              Alert.alert('Error', error.message || 'Failed to leave as contributor');
            }
          },
        },
      ]
    );
  };

  const renderContributor = (contributor) => {
    const isYou = contributor.userId === auth.currentUser?.uid;
    const roleColor = contributor.role === 'owner' ? '#E07A5F' : '#87C38F';
    const roleText = contributor.role === 'owner' ? 'Owner' : 'Contributor';
    
    // For current user, use Firebase Auth email as fallback if not in contributor object
    const displayEmail = contributor.email || (isYou ? auth.currentUser?.email : null);

    return (
      <View
        key={contributor.userId}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: roleColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <Text style={{ fontSize: 24 }}>
            {contributor.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#2D3436',
              }}
            >
              {contributor.name}
              {isYou && ' (You)'}
            </Text>
          </View>
          
          {displayEmail && (
            <Text
              style={{
                fontSize: 14,
                color: '#636E72',
                marginBottom: 6,
              }}
            >
              {displayEmail}
            </Text>
          )}

          {/* Role Badge */}
          <View
            style={{
              backgroundColor: roleColor + '20',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              alignSelf: 'flex-start',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: roleColor,
              }}
            >
              {roleText}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {isOwner && contributor.role !== 'owner' && (
          // Owner can remove other contributors
          <TouchableOpacity
            onPress={() => handleRemoveContributor(contributor)}
            style={{
              backgroundColor: '#FF6B6B20',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              marginLeft: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#FF6B6B',
              }}
            >
              Remove
            </Text>
          </TouchableOpacity>
        )}
        {!isOwner && isYou && contributor.role === 'contributor' && (
          // Contributor can leave themselves
          <TouchableOpacity
            onPress={handleLeaveAsContributor}
            style={{
              backgroundColor: '#FFA50020',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              marginLeft: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#FFA500',
              }}
            >
              Leave
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPendingInvitation = (invitation) => {
    return (
      <View
        key={invitation.id}
        style={{
          backgroundColor: '#FFF9E6',
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderLeftWidth: 4,
          borderLeftColor: '#FFA94D',
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#FFE0B2',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
          }}
        >
          <Text style={{ fontSize: 24 }}>⏳</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#2D3436',
              marginBottom: 4,
            }}
          >
            {invitation.inviteeEmail}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#636E72',
            }}
          >
            Invitation pending
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: '#95A5A6',
              marginTop: 4,
            }}
          >
            Expires {new Date(invitation.expiresAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Resend Button */}
        {isOwner && (
          <TouchableOpacity
            onPress={() => handleResendInvitation(invitation.id)}
            style={{
              backgroundColor: '#87C38F',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              marginLeft: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#FFFFFF',
              }}
            >
              Resend
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#87C38F" />
          <Text style={{ marginTop: 12, fontSize: 16, color: '#636E72' }}>
            Loading contributors...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Early return if childId is missing
  if (!childId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, color: '#636E72', textAlign: 'center' }}>
            Missing child information. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      {/* Header */}
      <View
        style={{
          backgroundColor: '#87C38F',
          paddingHorizontal: 20,
          paddingTop: 70,
          paddingBottom: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 12 }}
          >
            <Text style={{ fontSize: 28, color: '#FFFFFF' }}>←</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: '#FFFFFF',
              flex: 1,
            }}
          >
            Contributors
          </Text>
        </View>
        <Text
          style={{
            fontSize: 16,
            color: '#FFFFFF',
            marginLeft: 40,
            opacity: 0.9,
          }}
        >
          {childName}'s memory contributors
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
      >
        {/* Contributors Section */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: '700',
            color: '#2D3436',
            marginBottom: 16,
          }}
        >
          Team Members ({contributors.length})
        </Text>

        {contributors.map(renderContributor)}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#2D3436',
                marginTop: 24,
                marginBottom: 16,
              }}
            >
              Pending Invitations ({pendingInvitations.length})
            </Text>

            {pendingInvitations.map(renderPendingInvitation)}
          </>
        )}

        {/* Info Card */}
        <View
          style={{
            backgroundColor: '#E8F5E9',
            borderRadius: 16,
            padding: 20,
            marginTop: 24,
            borderLeftWidth: 4,
            borderLeftColor: '#87C38F',
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: '#2D3436',
              lineHeight: 20,
            }}
          >
            💡 Contributors can view all memories and add new ones. Only the owner can invite or remove contributors.
          </Text>
        </View>
      </ScrollView>

      {/* Invite Button (Only for Owner) */}
      {isOwner && (
        <View
          style={{
            padding: 20,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E8ECEF',
          }}
        >
          <TouchableOpacity
            onPress={handleInvitePress}
            style={{
              backgroundColor: '#87C38F',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              shadowColor: '#87C38F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#FFFFFF',
              }}
            >
              + Invite Contributor
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Invite Modal */}
      <InviteContributorModal
        visible={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          loadContributors(); // Refresh after invite
        }}
        childId={childId}
        childName={childName}
      />
    </View>
  );
};

export default ContributorsScreen;