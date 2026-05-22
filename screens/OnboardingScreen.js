import { View, Text, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import { Book, Camera, Mail, Sparkles, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmailTipModal from '../components/EmailTipModal';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

export default function OnboardingScreen({ navigation, onComplete }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showEmailTip, setShowEmailTip] = useState(false);

  // Show email tip when user reaches Monthly Summaries page
  useEffect(() => {
    if (currentPage === 3) { // Monthly Summaries page (index 3)
      console.log('📧 OnboardingScreen: Reached Monthly Summaries page, will show email tip');
      // Small delay to let the page render first
      setTimeout(() => {
        console.log('📧 OnboardingScreen: Setting showEmailTip to true');
        setShowEmailTip(true);
      }, 800);
    } else {
      // Hide tip when navigating away from Monthly Summaries page
      setShowEmailTip(false);
    }
  }, [currentPage]);

  const pages = [
    {
      icon: Book,
      title: "Welcome to MemoryLane",
      description: "Your family's personal memory journal. Capture every precious moment with your children.",
      color: "#87C38F"
    },
    {
      icon: Camera,
      title: "Capture Memories",
      description: "Add photos, record voice notes, or write down stories. Every format, every moment counts.",
      color: "#E07A5F"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Features",
      description: "Automatic voice transcription and beautiful monthly summaries delivered to your inbox.",
      color: "#F2CC8F"
    },
    {
      icon: Mail,
      title: "Monthly Summaries",
      description: "Get a heartfelt AI-generated summary of your child's month, delivered straight to your email.",
      color: "#87C38F"
    }
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      // Save onboarding status to AsyncStorage
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      
      // Also save to Firestore user document
      try {
        if (auth.currentUser) {
          await setDoc(
            doc(db, 'users', auth.currentUser.uid),
            { onboardingCompleted: true },
            { merge: true }
          );
          console.log('✅ Onboarding status saved to Firestore');
        }
      } catch (firestoreError) {
        console.error('⚠️ Error saving onboarding to Firestore:', firestoreError);
        // Don't block - AsyncStorage is saved
      }
      
      // Set flag to show trial notification after onboarding completes
      // This ensures the trial pop-up shows on HomeScreen, not during onboarding
      await AsyncStorage.setItem('@showTrialNotification', 'true');
      
      if (onComplete) {
        onComplete();
      } else {
        navigation.replace('Tabs');
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const CurrentIcon = pages[currentPage].icon;

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <View className="flex-1 p-6" style={{ paddingTop: 70 }}>
        {/* Skip Button */}
        {currentPage < pages.length - 1 && (
          <TouchableOpacity 
            className="self-end mb-4"
            onPress={handleSkip}
          >
            <Text className="text-gray-600 font-semibold">Skip</Text>
          </TouchableOpacity>
        )}

        {/* Content */}
        <View className="flex-1 justify-center items-center">
          <View 
            className="w-32 h-32 rounded-full items-center justify-center mb-8"
            style={{ backgroundColor: pages[currentPage].color + '20' }}
          >
            <CurrentIcon size={64} color={pages[currentPage].color} />
          </View>

          <Text className="text-3xl font-bold text-gray-800 text-center mb-4 px-8">
            {pages[currentPage].title}
          </Text>

          <Text className="text-lg text-gray-600 text-center px-8 leading-relaxed">
            {pages[currentPage].description}
          </Text>
        </View>

        {/* Progress Dots */}
        <View className="flex-row justify-center mb-8">
          {pages.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1 ${
                index === currentPage 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity
          className="bg-primary py-4 rounded-xl flex-row items-center justify-center shadow-lg"
          onPress={handleNext}
        >
          <Text className="text-white font-bold text-lg mr-2">
            {currentPage < pages.length - 1 ? 'Next' : "Let's Get Started"}
          </Text>
          <ArrowRight size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Email Tip Modal - shown on Monthly Summaries page */}
      <EmailTipModal 
        visible={showEmailTip} 
        onDismiss={() => setShowEmailTip(false)}
      />
    </View>
  );
}