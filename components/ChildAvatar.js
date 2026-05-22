import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * ChildAvatar Component
 * Displays child avatar - either a photo (if available) or emoji fallback
 * @param {string} avatar - Emoji string (fallback)
 * @param {string} avatarPhotoUrl - URL to child's photo (premium feature)
 * @param {number} size - Size of the avatar (default: 48)
 * @param {object} style - Additional styles
 */
export default function ChildAvatar({ avatar, avatarPhotoUrl, size = 48, style }) {
  const avatarSize = size;
  const borderRadius = avatarSize / 2;

  // If photo URL exists, show photo; otherwise show emoji
  if (avatarPhotoUrl) {
    return (
      <Image
        source={{ uri: avatarPhotoUrl }}
        style={[
          styles.photoAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: borderRadius,
          },
          style,
        ]}
        resizeMode="cover"
      />
    );
  }

  // Fallback to emoji
  return (
    <View
      style={[
        styles.emojiAvatar,
        {
          width: avatarSize,
          height: avatarSize,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: avatarSize * 0.6, textAlign: 'center' }}>
        {avatar || '👶'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoAvatar: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#87C38F',
  },
  emojiAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

