// InviteContributorModal.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { sendInvitation } from '../utils/invitations';

const InviteContributorModal = ({ visible, onClose, childId, childName }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await sendInvitation(childId, email);
      
      Alert.alert(
        'Invitation Sent! ✅',
        `We've sent an invitation to ${email}. They'll receive an email with instructions to join.`,
        [
          {
            text: 'Got it!',
            onPress: () => {
              setEmail('');
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending invitation:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.code === 'SUBSCRIPTION_LIMIT') {
        errorMessage = error.message;
        Alert.alert(
          'Upgrade to Premium',
          errorMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade', 
              onPress: () => {
                // Navigation will be handled by parent component
                onClose();
              }
            }
          ]
        );
        return;
      } else if (error.message.includes("can't invite yourself")) {
        errorMessage = "You can't invite yourself!";
      } else if (error.message.includes('already a contributor')) {
        errorMessage = 'This person is already a contributor.';
      } else if (error.message.includes('already sent')) {
        errorMessage = 'You already sent an invitation to this email.';
      } else if (error.message.includes('Only the owner')) {
        errorMessage = 'Only the owner can invite contributors.';
      }
      
      Alert.alert('Oops!', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEmail('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            paddingHorizontal: 20,
            minHeight: 300,
          }}
        >
          {/* Handle bar */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#DFE6E9',
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 20,
            }}
          />

          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#2D3436',
                marginBottom: 8,
              }}
            >
              Invite Contributor
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: '#636E72',
                lineHeight: 22,
              }}
            >
              Invite someone to contribute to {childName}'s memories
            </Text>
          </View>

          {/* Email Input */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#2D3436',
                marginBottom: 8,
              }}
            >
              Email Address
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F8F9FA',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
                color: '#2D3436',
                borderWidth: 2,
                borderColor: email ? '#87C38F' : '#F8F9FA',
              }}
              placeholder="friend@example.com"
              placeholderTextColor="#B2BEC3"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              editable={!loading}
            />
          </View>

          {/* Info Box */}
          <View
            style={{
              backgroundColor: '#E8F5E9',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
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
              💡 They'll receive an email with a link to join. Once they accept, they can view and add memories to {childName}'s timeline.
            </Text>
          </View>

          {/* Buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
            }}
          >
            {/* Cancel Button */}
            <TouchableOpacity
              onPress={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                backgroundColor: '#F8F9FA',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#636E72',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity
              onPress={handleSendInvitation}
              disabled={loading || !email.trim()}
              style={{
                flex: 1,
                backgroundColor: loading || !email.trim() ? '#B5E3B8' : '#87C38F',
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#FFFFFF',
                  }}
                >
                  Send Invitation
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default InviteContributorModal;