// MigrationScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { needsMigration, migrateToNewStructure } from '../utils/storage';

const MigrationScreen = ({ onComplete }) => {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    checkAndMigrate();
  }, []);

  const checkAndMigrate = async () => {
    try {
      setProgress('Checking for updates...');
      
      const needsUpdate = await needsMigration();
      
      if (!needsUpdate) {
        console.log('✅ No migration needed');
        onComplete();
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'App Update Required',
        'MemoryLane has been updated with new sharing features! We need to update your data. This will only take a moment.',
        [
          {
            text: 'Update Now',
            onPress: async () => {
              setMigrating(true);
              setProgress('Updating your data...');
              
              try {
                await migrateToNewStructure();
                setProgress('Update complete!');
                
                setTimeout(() => {
                  Alert.alert(
                    'Success!',
                    'Your app has been updated. You can now invite family members to contribute to your children\'s memories!',
                    [{ text: 'Got it!', onPress: onComplete }]
                  );
                }, 500);
                
              } catch (error) {
                console.error('Migration error:', error);
                Alert.alert(
                  'Update Failed',
                  'Something went wrong. Please try again or contact support.',
                  [
                    { text: 'Retry', onPress: checkAndMigrate },
                    { text: 'Skip', onPress: onComplete }
                  ]
                );
              }
            }
          }
        ],
        { cancelable: false }
      );
      
    } catch (error) {
      console.error('Error checking migration:', error);
      onComplete(); // Continue anyway
    }
  };

  if (!migrating) {
    return null; // Don't show anything while checking
  }

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8F9FA',
      padding: 20,
    }}>
      <View style={{
        backgroundColor: '#FFFFFF',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }}>
        <ActivityIndicator size="large" color="#87C38F" />
        
        <Text style={{
          marginTop: 20,
          fontSize: 18,
          fontWeight: '600',
          color: '#2D3436',
          textAlign: 'center',
        }}>
          {progress}
        </Text>
        
        <Text style={{
          marginTop: 10,
          fontSize: 14,
          color: '#636E72',
          textAlign: 'center',
        }}>
          Please don't close the app
        </Text>
      </View>
    </View>
  );
};

export default MigrationScreen;

