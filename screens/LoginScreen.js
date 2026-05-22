import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, StatusBar, ScrollView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react-native';
import { getErrorMessage, showError } from '../utils/errorHandler';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }
  
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Navigation handled by App.js auth listener
    } catch (error) {
      console.error('Login error:', error);
      showError(error, Alert);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();
    
    if (!email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter your email address first, then tap Forgot Password again.'
      );
      return;
    }

    Alert.alert(
      'Reset Password?',
      `We'll send a password reset link to ${email}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Link',
          onPress: async () => {
            try {
              console.log('📧 Sending password reset email to:', email.trim());
              await sendPasswordResetEmail(auth, email.trim());
              console.log('✅ Password reset email sent successfully');
              Alert.alert(
                'Email Sent! 📧',
                `A password reset link has been sent to ${email}. Please check your inbox (and spam folder) and follow the instructions to reset your password.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('❌ Password reset error:', error);
              console.error('Error code:', error.code);
              console.error('Error message:', error.message);
              
              let errorMessage = 'Failed to send reset email. Please try again.';
              
              if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address.';
              } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
              } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later.';
              } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection.';
              } else {
                errorMessage = `Error: ${error.message || error.code || 'Unknown error'}`;
              }
              
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-background">
        <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView 
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center p-6">
          {/* Header */}
          <View className="items-center mb-12">
            <Text className="text-5xl mb-4">📖</Text>
            <Text className="text-3xl font-bold text-primary">MemoryLane</Text>
            <Text className="text-gray-600 mt-2">Welcome back!</Text>
          </View>

          {/* Form */}
          <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
            <View className="flex-row items-center border-2 border-gray-200 rounded-xl mb-4 px-3">
              <Mail size={20} color="#9ca3af" />
              <TextInput
                className="flex-1 p-3 text-gray-800"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <Text className="text-sm font-semibold text-gray-700 mb-2">Password</Text>
            <View className="flex-row items-center border-2 border-gray-200 rounded-xl mb-6 px-3">
              <Lock size={20} color="#9ca3af" />
              <TextInput
                className="flex-1 p-3 text-gray-800"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="p-2"
              >
                {showPassword ? (
                  <EyeOff size={20} color="#9ca3af" />
                ) : (
                  <Eye size={20} color="#9ca3af" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className={`w-full py-4 rounded-xl flex-row items-center justify-center ${
                loading ? 'bg-gray-400' : 'bg-primary'
              }`}
              onPress={handleLogin}
              disabled={loading}
            >
              <LogIn size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                {loading ? 'Logging in...' : 'Login'}
              </Text>
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              className="mt-4"
            >
              <Text className="text-primary text-sm text-center">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center">
            <Text className="text-gray-600">Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text className="text-primary font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}