import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get environment variables
// First try to get from Constants.expoConfig.extra which is where babel config injects them
// Otherwise fall back to default values in case .env is not set up yet
const getEnvVar = (key: string, fallback: string): string => {
  if (Constants.expoConfig?.extra && Constants.expoConfig.extra[key]) {
    return Constants.expoConfig.extra[key];
  }
  return fallback;
};

// Supabase configuration
const supabaseUrl = getEnvVar(
  'SUPABASE_URL', 
  'https://meolzrablwhoayjmcsjs.supabase.co'
);
const supabaseKey = getEnvVar(
  'SUPABASE_ANON_KEY', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lb2x6cmFibHdob2F5am1jc2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NDI0OTcsImV4cCI6MjA1NTAxODQ5N30.PMEjGT0Wviq3_PkQGmidnj66fDVl7jsIbPD_mTBb4AM'
);

// Simple localStorage-like adapter for Supabase
// Using only SecureStore but with error handling to prevent crashes
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    try {
      return SecureStore.getItemAsync(key).catch(error => {
        console.warn(`SecureStore getItem error for key "${key}":`, error);
        return null;
      });
    } catch (error) {
      console.warn(`SecureStore getItem exception for key "${key}":`, error);
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      return SecureStore.setItemAsync(key, value).catch(error => {
        console.warn(`SecureStore setItem error for key "${key}":`, error);
        return undefined;
      });
    } catch (error) {
      console.warn(`SecureStore setItem exception for key "${key}":`, error);
      return Promise.resolve();
    }
  },
  removeItem: (key: string): Promise<void> => {
    try {
      return SecureStore.deleteItemAsync(key).catch(error => {
        console.warn(`SecureStore removeItem error for key "${key}":`, error);
        return undefined;
      });
    } catch (error) {
      console.warn(`SecureStore removeItem exception for key "${key}":`, error);
      return Promise.resolve();
    }
  },
};

// Create Supabase client with fallback to memory storage if SecureStore fails
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
