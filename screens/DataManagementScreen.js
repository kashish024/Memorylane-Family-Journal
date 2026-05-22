import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { ArrowLeft, Download, Upload, Trash2, Database, Info } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { loadChildren, clearAllData, loadMemories, saveChildren, saveMemories } from '../utils/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';
import { getLastBackupDateString } from '../utils/autoBackup';
import { canUseAutoBackup, isPremium } from '../utils/subscription';

const PREFERENCES_KEY = '@preferences';

export default function DataManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState('Never');
  const [isUserPremium, setIsUserPremium] = useState(false);

  useEffect(() => {
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    // Load last backup date
    try {
      const backupDate = await getLastBackupDateString();
      setLastBackupDate(backupDate);
    } catch (error) {
      console.error('Error loading last backup date:', error);
    }
    
    // Check premium status
    try {
      const premium = await isPremium();
      setIsUserPremium(premium);
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Gather all data
      const childrenData = await loadChildren();
      const memoriesData = await loadMemories();
      const prefsData = await AsyncStorage.getItem(PREFERENCES_KEY);
      
      const exportData = {
        version: '1.1.1',
        exportDate: new Date().toISOString(),
        children: childrenData,
        memories: memoriesData,
        preferences: prefsData ? JSON.parse(prefsData) : {},
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const fileName = `memorylane_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        // For web, create download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        Alert.alert('Success', 'Backup file downloaded!');
      } else {
        // For mobile, use Share API
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString);
        
        await Share.share({
          url: fileUri,
          title: 'MemoryLane Backup',
          message: 'Share your MemoryLane backup file',
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async () => {
    Alert.alert(
      'Import Data',
      'This will replace ALL current data with the imported backup. Current data will be lost. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
              });

              if (result.canceled) {
                setLoading(false);
                return;
              }

              const fileUri = result.assets[0].uri;
              const fileContent = await FileSystem.readAsStringAsync(fileUri);
              const importData = JSON.parse(fileContent);

              // Validate data structure
              if (!importData.children || !importData.memories) {
                throw new Error('Invalid backup file format');
              }

              // Import data
              await saveChildren(importData.children);
              await saveMemories(importData.memories);
              if (importData.preferences) {
                await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(importData.preferences));
              }

              Alert.alert(
                'Success!',
                `Imported ${importData.children.length} children and ${importData.memories.length} memories`,
                [{ text: 'OK', onPress: () => {
                  navigation.navigate('Tabs', { screen: 'Home' });
                }}]
              );
            } catch (error) {
              console.error('Import error:', error);
              Alert.alert('Error', 'Failed to import data. Please check the file and try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data?',
      'This will permanently delete all children, memories, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await clearAllData();
              if (success) {
                Alert.alert('Success', 'All data has been cleared.', [
                  { text: 'OK', onPress: () => navigation.navigate('Tabs', { screen: 'Home' }) }
                ]);
              } else {
                Alert.alert('Error', 'Failed to clear data.');
              }
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            } finally {
              setLoading(false);
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
        <Text className="text-xl font-bold text-white">Data Management</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {loading && (
          <View className="absolute inset-0 bg-black/20 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 items-center">
              <ActivityIndicator size="large" color="#87C38F" />
              <Text className="text-gray-800 mt-4 font-semibold">Processing...</Text>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
          <View className="flex-row items-start">
            <Info size={20} color="#3B82F6" className="mt-0.5" />
            <View className="ml-3 flex-1">
              <Text className="text-blue-800 font-semibold mb-1">About Data Management</Text>
              <Text className="text-blue-700 text-sm">
                Export your data to create backups, import from previous backups, or clear all data to start fresh.
              </Text>
            </View>
          </View>
        </View>

        {/* Export Data */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Download size={24} color="#87C38F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Export Data</Text>
          </View>
          <Text className="text-gray-600 mb-4">
            Create a backup file containing all your children, memories, and settings. This file can be imported later to restore your data.
          </Text>
          <TouchableOpacity
            onPress={handleExportData}
            disabled={loading}
            className="bg-primary py-4 rounded-xl flex-row items-center justify-center"
          >
            <Download size={20} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Export Backup</Text>
          </TouchableOpacity>
        </View>

        {/* Import Data */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <View className="flex-row items-center mb-4">
            <Upload size={24} color="#E07A5F" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Import Data</Text>
          </View>
          <Text className="text-gray-600 mb-2">
            Restore your data from a previous backup file. This will replace all current data.
          </Text>
          <Text className="text-red-600 text-sm mb-4 font-semibold">
            ⚠️ Warning: This will overwrite all existing data!
          </Text>
          <TouchableOpacity
            onPress={handleImportData}
            disabled={loading}
            className="bg-orange-500 py-4 rounded-xl flex-row items-center justify-center"
          >
            <Upload size={20} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Import Backup</Text>
          </TouchableOpacity>
        </View>

        {/* Auto Backup Info */}
        {isUserPremium && (
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <View className="flex-row items-center mb-4">
              <Database size={24} color="#87C38F" />
              <Text className="text-xl font-bold text-gray-800 ml-3">Auto Backup</Text>
            </View>
            <Text className="text-gray-600 mb-2">
              Automatic weekly backups are enabled for Premium users. Your data is backed up automatically every week.
            </Text>
            <Text className="text-primary text-sm font-semibold">
              Last backup: {lastBackupDate}
            </Text>
            <Text className="text-gray-500 text-xs mt-2">
              Manage auto backup settings in Settings → Preferences
            </Text>
          </View>
        )}

        {/* Clear All Data */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6 border-2 border-red-200">
          <View className="flex-row items-center mb-4">
            <Trash2 size={24} color="#ef4444" />
            <Text className="text-xl font-bold text-gray-800 ml-3">Clear All Data</Text>
          </View>
          <Text className="text-gray-600 mb-2">
            Permanently delete all children, memories, and settings. This action cannot be undone.
          </Text>
          <Text className="text-red-600 text-sm mb-4 font-semibold">
            ⚠️ This will delete everything permanently!
          </Text>
          <TouchableOpacity
            onPress={handleClearAllData}
            disabled={loading}
            className="bg-red-500 py-4 rounded-xl flex-row items-center justify-center"
          >
            <Trash2 size={20} color="white" />
            <Text className="text-white font-bold text-lg ml-2">Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

