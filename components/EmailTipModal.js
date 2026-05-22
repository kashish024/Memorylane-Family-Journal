// EmailTipModal.js - Dismissible tip about using child's email for monthly summaries
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { X, Mail, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL_TIP_DISMISSED_KEY = '@emailTipDismissed';

export default function EmailTipModal({ visible, onDismiss }) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (visible) {
      checkIfShouldShow();
    } else {
      setShowModal(false);
    }
  }, [visible]);

  const checkIfShouldShow = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(EMAIL_TIP_DISMISSED_KEY);
      console.log('📧 EmailTipModal check:', { visible, dismissed, willShow: !dismissed && visible });
      
      if (!dismissed && visible) {
        console.log('✅ Showing EmailTipModal');
        setShowModal(true);
      } else {
        console.log('❌ Not showing EmailTipModal:', dismissed ? 'dismissed' : 'not visible');
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error checking tip status:', error);
      if (visible) {
        console.log('✅ Showing EmailTipModal (error fallback)');
        setShowModal(true);
      }
    }
  };

  const handleDismiss = async (dontShowAgain = false) => {
    try {
      if (dontShowAgain) {
        await AsyncStorage.setItem(EMAIL_TIP_DISMISSED_KEY, 'true');
      }
      setShowModal(false);
      if (onDismiss) {
        onDismiss();
      }
    } catch (error) {
      console.error('Error saving tip dismissal:', error);
      setShowModal(false);
      if (onDismiss) {
        onDismiss();
      }
    }
  };

  if (!showModal) return null;

  return (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => handleDismiss(false)}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-6">
        <View className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="bg-primary/10 p-2 rounded-full mr-3">
                <Mail size={24} color="#87C38F" />
              </View>
              <Text className="text-xl font-bold text-gray-800">Pro Tip 💡</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDismiss(false)}
              className="p-2 -mr-2"
            >
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="mb-6">
            <Text className="text-gray-700 text-base leading-6 mb-3">
              <Text className="font-semibold text-gray-800">Use this app with a newly created email ID for your child</Text> so that monthly summaries will be sent to them.
            </Text>
            <Text className="text-gray-600 text-sm leading-5">
              When they're older, they can review all their precious memories and monthly summaries in their own inbox! 📧✨
            </Text>
          </View>

          {/* Icon decoration */}
          <View className="flex-row items-center justify-center mb-6">
            <Sparkles size={32} color="#F2CC8F" />
          </View>

          {/* Actions */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => handleDismiss(true)}
              className="flex-1 bg-gray-100 py-3 rounded-xl items-center"
            >
              <Text className="text-gray-700 font-semibold">Don't show again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDismiss(false)}
              className="flex-1 bg-primary py-3 rounded-xl items-center"
            >
              <Text className="text-white font-semibold">Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

