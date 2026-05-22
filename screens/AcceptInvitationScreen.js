// AcceptInvitationScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getPendingInvitations, acceptInvitation, declineInvitation } from '../utils/invitations';
import { loadChildren } from '../utils/storage';

const AcceptInvitationScreen = ({ navigation, route: routeProp }) => {
  const route = useRoute();
  // Try both route prop and useRoute hook to handle deep links
  const invitationIdFromUrl = route?.params?.id || routeProp?.params?.id;
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [invitationCode, setInvitationCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  useEffect(() => {
    console.log('🔗 AcceptInvitation: invitationIdFromUrl =', invitationIdFromUrl);
    console.log('🔗 AcceptInvitation: route.params =', route?.params);
    
    if (invitationIdFromUrl) {
      // Auto-accept this specific invitation from deep link
      console.log('🔗 Auto-accepting invitation from deep link:', invitationIdFromUrl);
      handleAcceptSpecificInvitation(invitationIdFromUrl);
    } else {
      // Load all pending invitations
      loadInvitations();
    }
  }, [invitationIdFromUrl]);

  const loadInvitations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getPendingInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
      if (!isRefresh) {
        Alert.alert('Error', 'Failed to load invitations');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadInvitations(true);
  };

  const handleAcceptSpecificInvitation = async (invitationId) => {
    setLoading(true);
    setProcessingId(invitationId);
    
    try {
      console.log('🔗 Attempting to accept invitation:', invitationId);
      
      // Accept the invitation directly by ID
      // The acceptInvitation function will validate and handle everything
      const acceptedInvitation = await acceptInvitation(invitationId);
      
      // Get child name from the accepted invitation
      const childName = acceptedInvitation?.childName || 'the child';
      
      await loadChildren(); // Refresh children list
      
      Alert.alert(
        'Welcome! 🎉',
        `You can now contribute to ${childName}'s memories!`,
        [
          {
            text: 'Great!',
            onPress: () => navigation.navigate('Tabs', { screen: 'Home' }),
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message.includes('not for you')) {
        errorMessage = 'This invitation is not for your account.';
      } else if (error.message.includes('expired')) {
        errorMessage = 'This invitation has expired. Ask for a new one.';
      } else if (error.message.includes('already accepted')) {
        errorMessage = 'You already accepted this invitation!';
      } else if (error.message.includes('not found')) {
        errorMessage = 'This invitation was not found. It may have been deleted.';
      }
      
      Alert.alert('Oops!', errorMessage, [
        { text: 'OK', onPress: () => loadInvitations() }
      ]);
    } finally {
      setLoading(false);
      setProcessingId(null);
    }
  };

  const handleSubmitInvitationCode = async () => {
    const code = invitationCode.trim();
    if (!code) {
      Alert.alert('Invalid Code', 'Please enter an invitation code');
      return;
    }

    setSubmittingCode(true);
    try {
      await handleAcceptSpecificInvitation(code);
      setInvitationCode(''); // Clear the input on success
      // loadInvitations will be called automatically after acceptance
    } catch (error) {
      // Error is already handled in handleAcceptSpecificInvitation
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleAccept = async (invitationId, childName) => {
    setProcessingId(invitationId);
    
    try {
      await acceptInvitation(invitationId);
      await loadChildren(); // Refresh children list
      
      Alert.alert(
        'Welcome! 🎉',
        `You can now contribute to ${childName}'s memories!`,
        [
          {
            text: 'Great!',
            onPress: () => navigation.navigate('Tabs', { screen: 'Home' }),
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.message.includes('not for you')) {
        errorMessage = 'This invitation is not for your account.';
      } else if (error.message.includes('expired')) {
        errorMessage = 'This invitation has expired. Ask for a new one.';
      } else if (error.message.includes('already accepted')) {
        errorMessage = 'You already accepted this invitation!';
      }
      
      Alert.alert('Oops!', errorMessage);
      loadInvitations(); // Refresh list
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId) => {
    Alert.alert(
      'Decline Invitation?',
      'Are you sure you want to decline this invitation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invitationId);
            
            try {
              await declineInvitation(invitationId);
              Alert.alert('Declined', 'Invitation has been declined');
              loadInvitations(); // Refresh list
            } catch (error) {
              console.error('Error declining invitation:', error);
              Alert.alert('Error', 'Failed to decline invitation');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const renderInvitation = (invitation) => {
    const isProcessing = processingId === invitation.id;
    
    return (
      <View
        key={invitation.id}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        {/* Header */}
        <View
          style={{
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 12 }}>
            {invitation.childAvatar || '👶'}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#636E72',
              marginBottom: 4,
            }}
          >
            {invitation.inviterName} invited you to
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#2D3436',
              textAlign: 'center',
            }}
          >
            {invitation.childName}'s Memories
          </Text>
        </View>

        {/* Info Card */}
        <View
          style={{
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: '#636E72',
              lineHeight: 20,
              textAlign: 'center',
            }}
          >
            You'll be able to view and add memories to {invitation.childName}'s timeline
          </Text>
        </View>

        {/* Inviter Info */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#87C38F20',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 18 }}>
              {invitation.inviterName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#2D3436',
              }}
            >
              {invitation.inviterName}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: '#636E72',
              }}
            >
              {invitation.inviterEmail}
            </Text>
          </View>
        </View>

        {/* Expiry Notice */}
        <Text
          style={{
            fontSize: 12,
            color: '#95A5A6',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
        </Text>

        {/* Buttons */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => handleDecline(invitation.id)}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: '#F8F9FA',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator color="#636E72" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#636E72',
                }}
              >
                Decline
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleAccept(invitation.id, invitation.childName)}
            disabled={isProcessing}
            style={{
              flex: 1,
              backgroundColor: isProcessing ? '#B5E3B8' : '#87C38F',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              shadowColor: '#87C38F',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}
              >
                Accept ✓
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#87C38F" />
          <Text style={{ marginTop: 12, fontSize: 16, color: '#636E72' }}>
            Checking for invitations...
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            }}
          >
            Invitations
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#87C38F']}
            tintColor="#87C38F"
          />
        }
      >
        {/* Manual Invitation Code Entry */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#E8ECEF',
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#2D3436',
              marginBottom: 12,
            }}
          >
            Enter Invitation Code
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#636E72',
              marginBottom: 16,
            }}
          >
            If you received an invitation code via email, paste it here:
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <TextInput
              value={invitationCode}
              onChangeText={setInvitationCode}
              placeholder="Paste invitation code here"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#E8ECEF',
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: '#F8F9FA',
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleSubmitInvitationCode}
              disabled={submittingCode || !invitationCode.trim()}
              style={{
                backgroundColor: submittingCode || !invitationCode.trim() ? '#B5E3B8' : '#87C38F',
                borderRadius: 8,
                paddingHorizontal: 24,
                paddingVertical: 12,
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: 100,
              }}
            >
              {submittingCode ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 16,
                  }}
                >
                  Accept
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {invitations.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 20,
            }}
          >
            <Text style={{ fontSize: 64, marginBottom: 16 }}>📬</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: '#2D3436',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              No Pending Invitations
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: '#636E72',
                textAlign: 'center',
                paddingHorizontal: 40,
              }}
            >
              You don't have any pending invitations right now. Use the code entry above if you received an invitation code via email.
            </Text>
          </View>
        ) : (
          <>
            <Text
              style={{
                fontSize: 16,
                color: '#636E72',
                marginBottom: 20,
              }}
            >
              You have {invitations.length} pending {invitations.length === 1 ? 'invitation' : 'invitations'}
            </Text>
            {invitations.map(renderInvitation)}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default AcceptInvitationScreen;