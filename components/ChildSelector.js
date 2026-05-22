import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import ChildAvatar from './ChildAvatar';

export default function ChildSelector({ children, selectedChild, onSelectChild, onAddChild }) {
  console.log('🔴 ChildSelector rendered - TEST VERSION 6');
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 8 }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 9999,
              backgroundColor: selectedChild?.id === child.id ? '#FFFFFF' : '#B5E3B8',
            }}
            onPress={() => onSelectChild(child)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ChildAvatar
                avatar={child.avatar}
                avatarPhotoUrl={child.avatarPhotoUrl}
                size={24}
                style={{ marginRight: 8 }}
              />
              <Text style={{
                fontWeight: '600',
                color: selectedChild?.id === child.id ? '#87C38F' : '#FFFFFF'
              }}>
                {child.name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Add Child Button - HIGH CONTRAST WHITE */}
        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 9999,
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#87C38F',  // Sage Green border for visibility
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 8,
          }}
          onPress={onAddChild}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Plus size={20} color="#87C38F" />
            <Text style={{ 
              color: '#87C38F', 
              fontWeight: '600',  // Bolder
              marginLeft: 4,
              fontSize: 16
            }}>
              ADD
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}