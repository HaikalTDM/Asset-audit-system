import { initializeApp, getApps, getApp } from 'firebase/app';
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
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket ?? "asset-audit-v1.appspot.com",
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId ?? "931887232708",
  appId: Constants.expoConfig?.extra?.firebaseAppId ?? "1:931887232708:web:4dd39703a427dd5e9a7b91"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize a secondary app for privileged admin flows (e.g., create user) to avoid auth state switching
const adminApp = (() => {
  const existing = getApps().find(a => a.name === 'admin');
  return existing ?? initializeApp(firebaseConfig, 'admin');
})();

// Initialize Auth with persistence
export const auth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (_) {
    // Already initialized during HMR; reuse existing instance
    return getAuth(app);
  }
})();

// Secondary auth bound to secondary app, used only for admin actions
export const adminAuth = (() => {
  if (Platform.OS === 'web') {
    return getAuth(adminApp);
  }
  try {
    return initializeAuth(adminApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (_) {
    // Already initialized during HMR; reuse existing instance
    return getAuth(adminApp);
  }
})();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Secondary Firestore bound to admin app
export const adminDb = getFirestore(adminApp);

export default app;