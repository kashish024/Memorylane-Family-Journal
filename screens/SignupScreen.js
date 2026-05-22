import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { User, Mail, Lock, UserPlus } from 'lucide-react-native';
import { getErrorMessage, showError } from '../utils/errorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }
  
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }
  
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password should be at least 6 characters');
      return;
    }
  
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // Create user document in Firestore with name and email
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            name: name.trim() || email.split('@')[0], // Use name or extract from email
            email: email.trim(),
            createdAt: new Date().toISOString(),
            onboardingCompleted: false, // Explicitly mark as not completed
          });
          console.log('✅ User document created in Firestore');
          
          // Clear email tip dismissed flag for new users so they see the tip
          try {
            await AsyncStorage.removeItem('@emailTipDismissed');
            console.log('✅ Cleared email tip dismissed flag for new user');
          } catch (storageError) {
            console.error('⚠️ Error clearing email tip flag:', storageError);
          }
        } catch (firestoreError) {
          console.error('⚠️ Error creating user document:', firestoreError);
          // Don't throw - user is created, document can be created later
        }
      }
      
      // Navigation handled by App.js auth listener
    } catch (error) {
      console.error('Signup error:', error);
      showError(error, Alert);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          <View className="flex-1 justify-center p-6 py-12">
            {/* Header */}
            <View className="items-center mb-8 mt-8">
              <Text className="text-5xl mb-4">📖</Text>
              <Text className="text-3xl font-bold text-primary">Create Account</Text>
              <Text className="text-gray-600 mt-2">Start capturing memories</Text>
            </View>

            {/* Form */}
            <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Full Name</Text>
              <View className="flex-row items-center border-2 border-gray-200 rounded-xl mb-4 px-3">
                <User size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 p-3 text-gray-800"
                  placeholder="John Doe"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

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
              <View className="flex-row items-center border-2 border-gray-200 rounded-xl mb-4 px-3">
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 p-3 text-gray-800"
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              <Text className="text-sm font-semibold text-gray-700 mb-2">Confirm Password</Text>
              <View className="flex-row items-center border-2 border-gray-200 rounded-xl mb-6 px-3">
                <Lock size={20} color="#9ca3af" />
                <TextInput
                  className="flex-1 p-3 text-gray-800"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="password"
                />
              </View>

              <TouchableOpacity
                className={`w-full py-4 rounded-xl flex-row items-center justify-center ${
                  loading ? 'bg-gray-400' : 'bg-primary'
                }`}
                onPress={handleSignup}
                disabled={loading}
              >
                <UserPlus size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center">
              <Text className="text-gray-600">Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text className="text-primary font-semibold">Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
    </View>
  );
}