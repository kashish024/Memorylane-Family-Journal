// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2xVEB1p5pw5FQQb8cKNCF7scUaIx97u8",
  authDomain: "memorylane-51c8e.firebaseapp.com",
  projectId: "memorylane-51c8e",
  storageBucket: "memorylane-51c8e.firebasestorage.app",
  messagingSenderId: "818557089239",
  appId: "1:818557089239:web:7ff3f2c0bdd0f0f87f8792",
  measurementId: "G-N2STVPQ7YX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;