import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { ArrowLeft, Download, FileText, Image, Mic, Calendar } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { exportMemoriesAsJSON, generateExportSummary } from '../utils/exportData';

export default function ExportDataScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await generateExportSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
      Alert.alert('Error', 'Failed to load export summary');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      Alert.alert(
        'Export Data',
        'This will create a JSON file with all your memories. Photos and audio will be referenced by their cloud URLs.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              try {
                await exportMemoriesAsJSON();
                Alert.alert(
                  'Export Successful! ✅',
                  'Your data has been exported. Choose where to save the file.',
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Alert.alert('Export Failed', error.message);
              } finally {
                setExporting(false);
              }
            }
          }
        ]
      );
      setExporting(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
      setExporting(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-50">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      {/* Header */}
      <View className="bg-purple-600 p-4 flex-row items-center" style={{ paddingTop: 70 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Export Data</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#E07A5F" />
            <Text className="text-gray-600 mt-4">Loading export summary...</Text>
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <View className="flex-row items-center mb-4">
                <View className="bg-purple-100 w-12 h-12 rounded-full items-center justify-center mr-3">
                  <FileText size={24} color="#E07A5F" />
                </View>
                <View>
                  <Text className="text-xl font-bold text-gray-800">Your Data</Text>
                  <Text className="text-sm text-gray-600">Ready to export</Text>
                </View>
              </View>

              {/* Stats */}
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <Text className="text-gray-700">Total Memories</Text>
                  <Text className="font-bold text-purple-600 text-lg">
                    {summary?.totalMemories || 0}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <Text className="text-gray-700">Children Profiles</Text>
                  <Text className="font-bold text-purple-600 text-lg">
                    {summary?.totalChildren || 0}
                  </Text>
                </View>

                {summary?.dateRange?.earliest && (
                  <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                    <Text className="text-gray-700">Date Range</Text>
                    <Text className="text-gray-600 text-sm">
                      {new Date(summary.dateRange.earliest).toLocaleDateString()} - {new Date(summary.dateRange.latest).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Memory Types */}
            <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-4">Memory Types</Text>
              
              <View className="space-y-3">
                <View className="flex-row items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <View className="flex-row items-center">
                    <View className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                      <FileText size={20} color="white" />
                    </View>
                    <Text className="text-gray-800 font-semibold">Text</Text>
                  </View>
                  <Text className="text-blue-600 font-bold text-lg">
                    {summary?.memoriesByType?.text || 0}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between p-3 bg-pink-50 rounded-xl">
                  <View className="flex-row items-center">
                    <View className="bg-pink-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                      <Image size={20} color="white" />
                    </View>
                    <Text className="text-gray-800 font-semibold">Photos</Text>
                  </View>
                  <Text className="text-pink-600 font-bold text-lg">
                    {summary?.memoriesByType?.photo || 0}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <View className="flex-row items-center">
                    <View className="bg-purple-600 w-10 h-10 rounded-full items-center justify-center mr-3">
                      <Mic size={20} color="white" />
                    </View>
                    <Text className="text-gray-800 font-semibold">Voice Notes</Text>
                  </View>
                  <Text className="text-purple-600 font-bold text-lg">
                    {summary?.memoriesByType?.audio || 0}
                  </Text>
                </View>
              </View>
            </View>

            {/* Per Child */}
            {summary?.memoriesByChild && summary.memoriesByChild.length > 0 && (
              <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                <Text className="text-lg font-bold text-gray-800 mb-4">Memories by Child</Text>
                {summary.memoriesByChild.map((child, index) => (
                  <View 
                    key={index}
                    className="flex-row justify-between items-center py-3 border-b border-gray-100"
                  >
                    <Text className="text-gray-700">{child.name}</Text>
                    <Text className="text-purple-600 font-bold">{child.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Export Info */}
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <Text className="text-blue-900 font-semibold mb-2">📋 What's Included:</Text>
              <Text className="text-blue-800 text-sm leading-relaxed">
                • All memory text, titles, and dates{'\n'}
                • Child profiles and information{'\n'}
                • Cloud URLs for photos and audio{'\n'}
                • Milestones and memory metadata{'\n'}
                • Export timestamp and summary
              </Text>
            </View>

            {/* Export Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl flex-row items-center justify-center shadow-lg ${
                exporting ? 'bg-gray-400' : 'bg-purple-600'
              }`}
              onPress={handleExport}
              disabled={exporting || summary?.totalMemories === 0}
            >
              {exporting ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">Exporting...</Text>
                </>
              ) : (
                <>
                  <Download size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Export as JSON</Text>
                </>
              )}
            </TouchableOpacity>

            {summary?.totalMemories === 0 && (
              <Text className="text-center text-gray-500 mt-4 text-sm">
                No memories to export yet. Add some memories first!
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}