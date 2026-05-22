import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-blue-50 p-6">
          <Text className="text-2xl font-bold text-gray-800 mb-4">Oops!</Text>
          <Text className="text-gray-600 text-center mb-6">
            Something went wrong. This is likely an expo-av bug.
          </Text>
          <TouchableOpacity
            className="bg-purple-600 px-6 py-3 rounded-xl"
            onPress={() => this.setState({ hasError: false })}
          >
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;