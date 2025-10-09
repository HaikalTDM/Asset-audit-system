import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey ?? "AIzaSyCCHQVZmrtni-cHoAtMyexuSgxDpPjvWTI",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain ?? "asset-audit-v1.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId ?? "asset-audit-v1",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket ?? "asset-audit-v1.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId ?? "931887232708",
  appId: Constants.expoConfig?.extra?.firebaseAppId ?? "1:931887232708:web:4dd39703a427dd5e9a7b91"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;