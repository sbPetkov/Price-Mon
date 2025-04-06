import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { subscribeToNotifications } from './src/screens/notifications/NotificationsScreen';
import { supabase } from './src/config/supabase';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, AppStateStatus } from 'react-native';

// Create a client for React Query
const queryClient = new QueryClient();

// Function to check for unread notifications
const updateNotificationStatus = async (userId: string) => {
  if (!userId) return;
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false);
    
    if (error) throw error;
    
    // Access through window object
    const windowAny = window as any;
    if (windowAny.NotificationIndicatorManager) {
      windowAny.NotificationIndicatorManager.setHasUnread(count ? count > 0 : false);
    }
  } catch (error) {
    console.error('Error checking unread notifications:', error);
  }
};

// Create a wrapper component to access auth context
function AppContent() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const isMounted = useRef(true);
  const appState = useRef(AppState.currentState);

  // Set up notification subscription and app state handling
  useEffect(() => {
    isMounted.current = true;
    
    if (!user) return;
    
    try {
      // Subscribe to real-time notifications
      const notificationSubscription = subscribeToNotifications(
        user.id,
        (newNotification) => {
          if (isMounted.current) {
            console.log('New notification from subscription:', newNotification);
            // Update notification indicator when a new notification arrives
            updateNotificationStatus(user.id);
          }
        }
      );
      
      setSubscription(notificationSubscription);
      
      // Initial notification status update
      updateNotificationStatus(user.id);
      
      // Handle app state changes
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
          // App has come to the foreground, update notification status
          console.log('App returning to foreground, updating notification status');
          updateNotificationStatus(user.id);
        }
        appState.current = nextAppState;
      };
      
      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
      
      return () => {
        // Clean up Supabase subscription and app state listener
        isMounted.current = false;
        
        if (subscription) {
          subscription.unsubscribe();
        }
        
        appStateSubscription.remove();
      };
    } catch (error) {
      console.error('Error setting up notification subscription:', error);
    }
  }, [user]);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
