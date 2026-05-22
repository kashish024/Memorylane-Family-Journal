import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { loadChildren, loadMemories } from './storage';
import { auth } from './firebase';

export const exportMemoriesAsJSON = async () => {
  try {
    console.log('📦 Starting data export...');
    
    // Get user info
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not logged in');
    }

    // Load all data
    const children = await loadChildren();
    const memories = await loadMemories();

    // Create export object
    const exportData = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        email: user.email,
        name: user.displayName || 'User'
      },
      children: children,
      memories: memories,
      summary: {
        totalChildren: children.length,
        totalMemories: memories.length,
        memoriesByType: {
          text: memories.filter(m => m.type === 'text').length,
          photo: memories.filter(m => m.type === 'photo').length,
          audio: memories.filter(m => m.type === 'audio').length
        },
        milestones: memories.filter(m => m.milestone).length
      }
    };

    console.log('📦 Data prepared:', {
      children: exportData.children.length,
      memories: exportData.memories.length
    });

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `MemoryLane_Export_${timestamp}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Write to file
    await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportData, null, 2),
        { encoding: 'utf8' }
      );

    console.log('📦 File created:', fileUri);

    // Share the file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export MemoryLane Data',
        UTI: 'public.json'
      });
      console.log('📦 Export shared successfully');
    } else {
      throw new Error('Sharing not available on this device');
    }

    return true;
  } catch (error) {
    console.error('📦 Export error:', error);
    throw error;
  }
};

export const generateExportSummary = async () => {
  try {
    const children = await loadChildren();
    const memories = await loadMemories();

    return {
      totalChildren: children.length,
      totalMemories: memories.length,
      memoriesByChild: children.map(child => ({
        name: child.name,
        count: memories.filter(m => m.childId === child.id).length
      })),
      memoriesByType: {
        text: memories.filter(m => m.type === 'text').length,
        photo: memories.filter(m => m.type === 'photo').length,
        audio: memories.filter(m => m.type === 'audio').length
      },
      dateRange: {
        earliest: memories.length > 0 
          ? memories.sort((a, b) => new Date(a.date) - new Date(b.date))[0].date
          : null,
        latest: memories.length > 0
          ? memories.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
          : null
      }
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};