import { View, Image, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { X } from 'lucide-react-native';

export default function PhotoViewScreen({ route, navigation }) {
  const { photoUri } = route.params;
  const { width, height } = Dimensions.get('window');

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      <TouchableOpacity
        className="absolute top-12 right-6 z-10 bg-black/60 w-12 h-12 rounded-full items-center justify-center"
        onPress={() => navigation.goBack()}
      >
        <X size={24} color="white" />
      </TouchableOpacity>
      
      <View className="flex-1 items-center justify-center">
        <Image
          source={{ uri: photoUri }}
          style={{ width, height }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}