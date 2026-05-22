// autoBackup.js - Automatic Weekly Backup System
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { loadChildren, loadMemories } from './storage';
import { auth } from './firebase';

const PREFERENCES_KEY = '@preferences';
const LAST_BACKUP_KEY = '@lastAutoBackup';
const BACKUP_DIR = 'auto_backups';

/**
 * Get user preferences including auto backup setting
 * @returns {Promise<Object>} Preferences object
 */
const getPreferences = async () => {
  try {
    const prefs = await AsyncStorage.getItem(PREFERENCES_KEY);
    return prefs ? JSON.parse(prefs) : { autoBackup: false };
  } catch (error) {
    console.error('Error loading preferences:', error);
    return { autoBackup: false };
  }
};

/**
 * Get the last backup date
 * @returns {Promise<Date|null>} Last backup date or null
 */
const getLastBackupDate = async () => {
  try {
    const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
    return lastBackup ? new Date(lastBackup) : null;
  } catch (error) {
    console.error('Error getting last backup date:', error);
    return null;
  }
};

/**
 * Set the last backup date to now
 * @returns {Promise<void>}
 */
const setLastBackupDate = async () => {
  try {
    await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error setting last backup date:', error);
  }
};

/**
 * Check if a week has passed since last backup
 * @param {Date|null} lastBackupDate - Last backup date
 * @returns {boolean} True if a week has passed
 */
const isWeekPassed = (lastBackupDate) => {
  if (!lastBackupDate) return true; // No previous backup, do it now
  
  const now = new Date();
  const weekInMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const timeSinceLastBackup = now.getTime() - lastBackupDate.getTime();
  
  return timeSinceLastBackup >= weekInMs;
};

/**
 * Create backup directory if it doesn't exist
 * @returns {Promise<void>}
 */
const ensureBackupDirectory = async () => {
  try {
    const backupPath = `${FileSystem.documentDirectory}${BACKUP_DIR}`;
    const dirInfo = await FileSystem.getInfoAsync(backupPath);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(backupPath, { intermediates: true });
      console.log('📁 Created backup directory:', backupPath);
    }
  } catch (error) {
    console.error('Error creating backup directory:', error);
    throw error;
  }
};

/**
 * Clean up old backups (keep only last 4 weeks)
 * @returns {Promise<void>}
 */
const cleanupOldBackups = async () => {
  try {
    const backupPath = `${FileSystem.documentDirectory}${BACKUP_DIR}`;
    const dirInfo = await FileSystem.getInfoAsync(backupPath);
    
    if (!dirInfo.exists) return;
    
    // Get all backup files
    const files = await FileSystem.readDirectoryAsync(backupPath);
    const backupFiles = files
      .filter(file => file.startsWith('memorylane_backup_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: `${backupPath}/${file}`,
        // Extract date from filename: memorylane_backup_2025-01-15.json
        date: new Date(file.replace('memorylane_backup_', '').replace('.json', ''))
      }))
      .sort((a, b) => b.date - a.date); // Sort newest first
    
    // Keep only last 4 backups (4 weeks)
    if (backupFiles.length > 4) {
      const filesToDelete = backupFiles.slice(4);
      for (const file of filesToDelete) {
        try {
          await FileSystem.deleteAsync(file.path, { idempotent: true });
          console.log('🗑️ Deleted old backup:', file.name);
        } catch (error) {
          console.error('Error deleting old backup:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
    // Don't throw - cleanup failure shouldn't stop backup
  }
};

/**
 * Perform automatic backup
 * @returns {Promise<boolean>} Success status
 */
const performAutoBackup = async () => {
  try {
    console.log('💾 Starting automatic backup...');
    
    const user = auth.currentUser;
    if (!user) {
      console.log('⏭️ User not logged in, skipping auto backup');
      return false;
    }

    // Load all data
    const children = await loadChildren();
    const memories = await loadMemories();
    const prefs = await getPreferences();

    // Create backup data
    const backupData = {
      version: '1.1.2',
      exportDate: new Date().toISOString(),
      backupType: 'automatic',
      user: {
        email: user.email,
        uid: user.uid,
      },
      children: children,
      memories: memories,
      preferences: prefs,
      summary: {
        totalChildren: children.length,
        totalMemories: memories.length,
        memoriesByType: {
          text: memories.filter(m => m.type === 'text').length,
          photo: memories.filter(m => m.type === 'photo').length,
          audio: memories.filter(m => m.type === 'audio').length,
        },
        milestones: memories.filter(m => m.milestone).length,
      },
    };

    // Ensure backup directory exists
    await ensureBackupDirectory();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `memorylane_backup_${timestamp}.json`;
    const backupPath = `${FileSystem.documentDirectory}${BACKUP_DIR}`;
    const fileUri = `${backupPath}/${filename}`;

    // Write backup file
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(backupData, null, 2),
      { encoding: 'utf8' }
    );

    console.log('✅ Automatic backup created:', filename);
    console.log('📊 Backup stats:', {
      children: children.length,
      memories: memories.length,
      size: `${(JSON.stringify(backupData).length / 1024).toFixed(2)} KB`,
    });

    // Update last backup date
    await setLastBackupDate();

    // Clean up old backups
    await cleanupOldBackups();

    return true;
  } catch (error) {
    console.error('❌ Error performing auto backup:', error);
    return false;
  }
};

/**
 * Check if auto backup should run and perform it if needed
 * This should be called on app launch
 * @returns {Promise<{performed: boolean, reason: string}>}
 */
export const checkAndPerformAutoBackup = async () => {
  try {
    // Check if user is logged in
    const user = auth.currentUser;
    if (!user) {
      return { performed: false, reason: 'User not logged in' };
    }

    // Check if auto backup is enabled
    const preferences = await getPreferences();
    if (!preferences.autoBackup) {
      return { performed: false, reason: 'Auto backup disabled' };
    }

    // Check when last backup was performed
    const lastBackupDate = await getLastBackupDate();
    
    // Check if a week has passed
    if (!isWeekPassed(lastBackupDate)) {
      const daysSinceBackup = Math.floor(
        (new Date().getTime() - lastBackupDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        performed: false,
        reason: `Last backup was ${daysSinceBackup} days ago (need 7 days)`,
      };
    }

    // Perform backup
    const success = await performAutoBackup();
    
    if (success) {
      return { performed: true, reason: 'Backup completed successfully' };
    } else {
      return { performed: false, reason: 'Backup failed' };
    }
  } catch (error) {
    console.error('❌ Error checking auto backup:', error);
    return { performed: false, reason: `Error: ${error.message}` };
  }
};

/**
 * Get backup history (list of backup files)
 * @returns {Promise<Array>} List of backup files with metadata
 */
export const getBackupHistory = async () => {
  try {
    const backupPath = `${FileSystem.documentDirectory}${BACKUP_DIR}`;
    const dirInfo = await FileSystem.getInfoAsync(backupPath);
    
    if (!dirInfo.exists) {
      return [];
    }

    const files = await FileSystem.readDirectoryAsync(backupPath);
    const backupFiles = files
      .filter(file => file.startsWith('memorylane_backup_') && file.endsWith('.json'))
      .map(file => {
        const dateStr = file.replace('memorylane_backup_', '').replace('.json', '');
        return {
          filename: file,
          path: `${backupPath}/${file}`,
          date: new Date(dateStr),
          dateString: dateStr,
        };
      })
      .sort((a, b) => b.date - a.date); // Sort newest first

    return backupFiles;
  } catch (error) {
    console.error('Error getting backup history:', error);
    return [];
  }
};

/**
 * Get last backup date as a readable string
 * @returns {Promise<string>} Last backup date string or "Never"
 */
export const getLastBackupDateString = async () => {
  try {
    const lastBackup = await getLastBackupDate();
    if (!lastBackup) {
      return 'Never';
    }
    
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - lastBackup.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysAgo === 0) {
      return 'Today';
    } else if (daysAgo === 1) {
      return 'Yesterday';
    } else if (daysAgo < 7) {
      return `${daysAgo} days ago`;
    } else {
      return lastBackup.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error getting last backup date string:', error);
    return 'Unknown';
  }
};

