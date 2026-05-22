import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, StatusBar } from 'react-native';
import { ArrowLeft, Calendar, Save } from 'lucide-react-native';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateMemory } from '../utils/storage';
import { parseLocalDate } from '../utils/dateHelper';

export default function EditMemoryScreen({ navigation, route }) {
  const { memory } = route.params;
  const formatLocalDate = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [title, setTitle] = useState(memory.title);
  const [content, setContent] = useState(memory.content);
  const [selectedMilestone, setSelectedMilestone] = useState(memory.milestone || null);
  const [memoryDate, setMemoryDate] = useState(parseLocalDate(memory.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const milestoneOptions = [
    '', 'First Word', 'First Steps', 'First Tooth', 'Birthday', 
    'First Day of School', 'First Laugh', 'Other'
  ];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    try {
      setSaving(true);

      const updatedMemory = {
        ...memory,
        title: title.trim(),
        content: content.trim(),
        milestone: selectedMilestone,
        // Keep local calendar date (avoid timezone shifting date by one day)
        date: formatLocalDate(memoryDate),
        time: memoryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      await updateMemory(memory.id, updatedMemory);

      Alert.alert(
        '✅ Memory Updated!',
        'Your changes have been saved.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating memory:', error);
      Alert.alert('Error', 'Failed to update memory. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      {/* Header */}
      <View className="bg-primary p-4 flex-row items-center" style={{ paddingTop: 70 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Edit Memory</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Memory Type Badge */}
        <View className="mb-4">
          <View style={{ 
            backgroundColor: memory.type === 'photo' ? '#F2CC8F20' : memory.type === 'audio' ? '#E07A5F20' : '#87C38F20',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            alignSelf: 'flex-start'
          }}>
            <Text style={{ 
              color: memory.type === 'photo' ? '#F2CC8F' : memory.type === 'audio' ? '#E07A5F' : '#87C38F',
              fontSize: 12,
              fontWeight: '600'
            }}>
              {memory.type === 'photo' ? '📸 Photo Memory' : memory.type === 'audio' ? '🎤 Voice Memory' : '📝 Text Memory'}
            </Text>
          </View>
        </View>

        {/* Date Selection */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Memory Date</Text>
          <TouchableOpacity 
            style={{
              backgroundColor: 'white',
              padding: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#87C38F',
            }}
            onPress={() => setShowDatePicker(true)}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-800 font-semibold">
                {memoryDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Calendar size={20} color="#87C38F" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Title</Text>
          <TextInput
            className="bg-white p-4 rounded-xl border-2 border-gray-200 text-gray-800"
            placeholder="Memory title"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Milestone Selection */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">
            Milestone (Optional)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-2">
              {milestoneOptions.map((option) => (
                <TouchableOpacity
                  key={option || 'none'}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    backgroundColor: selectedMilestone === option ? '#87C38F' : 'white',
                    borderColor: selectedMilestone === option ? '#87C38F' : '#e5e7eb',
                  }}
                  onPress={() => setSelectedMilestone(option)}
                >
                  <Text style={{
                    fontWeight: '600',
                    color: selectedMilestone === option ? 'white' : '#374151'
                  }}>
                    {option === '' ? '✕ None' : option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Content Input */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Description</Text>
          <TextInput
            className="bg-white p-4 rounded-xl border-2 border-gray-200 text-gray-800"
            placeholder="Tell the story..."
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text className="text-xs text-gray-400 text-right mt-1">
            {content.length}/500 characters
          </Text>
        </View>

        {/* Note about attachments */}
        {(memory.photoUrl || memory.audioUrl) && (
          <View style={{ 
            backgroundColor: '#F2CC8F20',
            padding: 12,
            borderRadius: 12,
            marginBottom: 16
          }}>
            <Text className="text-sm text-gray-600 text-center">
              ℹ️ Photos and audio recordings cannot be changed
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={{
            backgroundColor: saving ? '#9ca3af' : '#87C38F',
            paddingVertical: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={20} color="white" />
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <TouchableOpacity
            className="flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View className="flex-1 justify-end">
              <TouchableOpacity activeOpacity={1}>
                <View className="bg-white rounded-t-3xl">
              {/* Header */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb'
              }}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: '#87C38F', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: '#87C38F', fontSize: 16, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Date Picker */}
              <DateTimePicker
                value={memoryDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setMemoryDate(selectedDate);
                }}
                maximumDate={new Date()}
                textColor="#000000"
              />
              <View className="h-8" />
            </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}