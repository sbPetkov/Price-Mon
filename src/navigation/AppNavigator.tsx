import React, { useEffect, useRef } from 'react';
import { 
  NavigationContainer, 
  useNavigationContainerRef, 
  LinkingOptions,
  getPathFromState // Import helper if needed for complex state parsing
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';
import { ActivityIndicator, View, Linking, Alert, Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Define ParamLists for type safety across navigators
type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { access_token?: string }; // Parameter expected from deep link
};

type MainStackParamList = {
  // Define params for screens inside BottomTabNavigator if needed for deep linking
};

type RootStackParamList = {
  Auth: AuthStackParamList;
  Main: MainStackParamList;
};

const Stack = createNativeStackNavigator();

// --- Deep Linking Configuration ---
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['barcodepricer://'],
  config: {
    screens: {
      Auth: { // Target the AuthNavigator stack
        screens: {
          ResetPassword: 'reset-password', // Map barcodepricer://reset-password
          // Map other auth screens if direct deep linking is needed
          // Login: 'login',
        },
      },
      Main: { // Target the main app stack (BottomTabNavigator)
        // Define paths for main screens if needed
        // e.g., Home: 'home', Profile: 'profile'
        // Screens within nested navigators might need explicit mapping
        // screens: {
        //   HomeScreen: 'home'
        // }
      },
      // Add mappings for any other screens outside Auth/Main if applicable
    },
  },
  // --- Custom function to handle incoming URLs ---
  async getInitialURL() {
    // Handle app opening from a deep link
    const url = await Linking.getInitialURL();
    if (Platform.OS !== 'web' && url) {
      // Let React Navigation handle the initial URL for navigation
      // but also process it for Supabase auth
      handleSupabaseAuthUrl(url);
      return url;
    }
    return undefined;
  },
  subscribe(listener) {
    // Listen for deep links received while the app is open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleSupabaseAuthUrl(url);
      listener(url); // Pass URL to React Navigation
    });

    return () => {
      // Clean up the listener
      subscription.remove();
    };
  },
};

// --- Supabase Auth URL Handler ---
const handleSupabaseAuthUrl = async (url: string | null) => {
  if (!url) return;

  // Extract params from the URL fragment (#)
  const urlParts = url.split('#');
  if (urlParts.length < 2) return; // No fragment found

  const fragment = urlParts[1];
  const params = new URLSearchParams(fragment); // Use URLSearchParams for easy parsing
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const type = params.get('type'); // Type might indicate 'recovery', 'signup', etc.

  // 1. Handle Errors first
  if (error) {
    console.error('Deep link error:', error, errorDescription);
    Alert.alert('Authentication Error', errorDescription || 'An error occurred.');
    return;
  }

  // 2. Handle Session Recovery (Google Sign-In, Magic Link, etc.)
  // Supabase automatically attempts session recovery if access_token & refresh_token are present.
  // The onAuthStateChange listener in AuthContext should handle this.
  // No explicit setSession call needed here usually.
  if (accessToken && refreshToken) {
     console.log('Deep link contains session tokens, Supabase listener should handle it.');
     // You might want to trigger a manual session refresh just in case:
     // await supabase.auth.refreshSession();
     // return; // Let onAuthStateChange handle navigation
  }

  // 3. Handle Password Recovery / Email Confirmation (Type-based)
  // Supabase recovery flow uses verifyOtp which sets the session briefly.
  if (accessToken && type === 'recovery') {
    console.log('Processing password recovery token...');
    try {
      // Verify the OTP/Token. This step makes the user authenticated temporarily.
      const { error: otpError } = await supabase.auth.verifyOtp({ 
        token_hash: accessToken, // Use the token from the URL
        type: 'recovery' 
      });

      if (otpError) {
        throw otpError;
      }
      
      console.log('Recovery token verified successfully.');
      // Navigation to ResetPassword screen will be handled by React Navigation's linking config
      // because the URL matches barcodepricer://reset-password
      
    } catch (verifyError: any) {
      console.error('Error verifying recovery token:', verifyError);
      Alert.alert('Password Reset Error', verifyError.message || 'Could not verify the password reset link. It may have expired.');
    }
  } else if (accessToken && type === 'signup') {
     console.log('Processing email confirmation token...');
    // Handle email confirmation if needed (verifyOtp type: 'email')
    // Usually just confirming means the user becomes active, onAuthStateChange handles login.
    try {
       const { error: emailOtpError } = await supabase.auth.verifyOtp({ token_hash: accessToken, type: 'email' });
       if (emailOtpError) throw emailOtpError;
       Alert.alert('Success', 'Email confirmed successfully! You can now log in.');
       // Optionally navigate to Login screen
       // navigationRef.current?.navigate('Auth', { screen: 'Login' });
    } catch(confirmError: any) {
       console.error('Error confirming email:', confirmError);
       Alert.alert('Email Confirmation Error', confirmError.message || 'Could not confirm email.');
    }
  }

  // Other potential types: 'magiclink', 'invite'
};

const AppNavigator = () => {
  const { user, loading } = useAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>(); // Ref for navigation

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    // Use the ref and linking configuration
    <NavigationContainer ref={navigationRef} linking={linking} fallback={<ActivityIndicator color="blue" size="large" />}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={BottomTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
