import React, { useState, useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/supabase';
import { ParamListBase, RouteProp } from '@react-navigation/native';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import CartScreen from '../screens/cart/CartScreen';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';
import AddPriceScreen from '../screens/product/AddPriceScreen';
import AddStoreScreen from '../screens/product/AddStoreScreen';
import AddProductScreen from '../screens/product/AddProductScreen';
import SearchScreen from '../screens/search/SearchScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ListDetailsScreen from '../screens/cart/ListDetailsScreen';
import CreateListScreen from '../screens/cart/CreateListScreen';
import AddListItemScreen from '../screens/cart/AddListItemScreen';
import CompareStoresScreen from '../screens/cart/CompareStoresScreen';
import ListSettingsScreen from '../screens/cart/ListSettingsScreen';
import ProfileSettingsScreen from '../screens/profile/ProfileSettingsScreen';
import EditPriceScreen from '../screens/product/EditPriceScreen';
import PriceAlertScreen from '../screens/product/PriceAlertScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import PriceAlertsScreen from '../screens/notifications/PriceAlertsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ScannerStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const NotificationsStack = createNativeStackNavigator();

// Home stack
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <HomeStack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Home' }} />
      <HomeStack.Screen name="Search" component={SearchScreen} options={{ title: 'Search Results' }} />
      <HomeStack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product Details' }} />
      <HomeStack.Screen name="AddPrice" component={AddPriceScreen} options={{ title: 'Add Price' }} />
      <HomeStack.Screen name="AddStore" component={AddStoreScreen} options={{ title: 'Add Store' }} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <HomeStack.Screen name="ProfileSettings" component={ProfileSettingsScreen} options={{ title: 'Profile Settings' }} />
      <HomeStack.Screen name="EditPrice" component={EditPriceScreen} options={{ title: 'Edit Price' }} />
      <HomeStack.Screen name="PriceAlert" component={PriceAlertScreen} options={{ title: 'Set Price Alert' }} />
    </HomeStack.Navigator>
  );
};

// Scanner stack
const ScannerStackNavigator = () => {
  return (
    <ScannerStack.Navigator
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
        presentation: 'card',
      }}
    >
      <ScannerStack.Screen 
        name="ScannerScreen" 
        component={ScannerScreen} 
        options={{ headerShown: false }}
      />
      <ScannerStack.Screen 
        name="AddProduct" 
        component={AddProductScreen} 
        options={{ title: 'Add Product' }} 
      />
      <ScannerStack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
        options={{
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <ScannerStack.Screen 
        name="AddPrice" 
        component={AddPriceScreen} 
        options={{ title: 'Add Price' }} 
      />
      <ScannerStack.Screen 
        name="AddStore" 
        component={AddStoreScreen} 
        options={{ title: 'Add Store' }} 
      />
      <ScannerStack.Screen 
        name="PriceAlert" 
        component={PriceAlertScreen} 
        options={{ title: 'Set Price Alert' }} 
      />
    </ScannerStack.Navigator>
  );
};

// Cart stack
const CartStackNavigator = () => {
  return (
    <CartStack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <CartStack.Screen name="Lists" component={CartScreen} />
      <CartStack.Screen name="ListDetails" component={ListDetailsScreen} />
      <CartStack.Screen name="CreateList" component={CreateListScreen} />
      <CartStack.Screen name="AddListItem" component={AddListItemScreen} />
      <CartStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <CartStack.Screen 
        name="CompareStores" 
        component={CompareStoresScreen}
        options={{ title: 'Compare Stores' }}
      />
      <CartStack.Screen 
        name="ListSettings" 
        component={ListSettingsScreen}
        options={{ title: 'List Settings' }}
      />
      <CartStack.Screen 
        name="PriceAlert" 
        component={PriceAlertScreen}
        options={{ title: 'Set Price Alert' }}
      />
    </CartStack.Navigator>
  );
};

// Notifications stack
const NotificationsStackNavigator = () => {
  return (
    <NotificationsStack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <NotificationsStack.Screen name="NotificationsScreen" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <NotificationsStack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: 'Product Details' }} />
      <NotificationsStack.Screen name="PriceAlerts" component={PriceAlertsScreen} options={{ title: 'Price Alerts' }} />
    </NotificationsStack.Navigator>
  );
};

// Create a global notification count manager to ensure all components can access the latest count
export const NotificationCountManager = {
  count: 0,
  listeners: new Set<(count: number) => void>(),
  
  setCount(newCount: number) {
    this.count = newCount;
    this.notifyListeners();
  },
  
  addListener(listener: (count: number) => void) {
    this.listeners.add(listener);
    // Immediately notify the new listener with the current count
    listener(this.count);
    return () => this.listeners.delete(listener);
  },
  
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.count));
  }
};

// Function to update the global notification count
export const updateUnreadNotificationCount = async (userId: string) => {
  if (!userId) return;
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false);
    
    if (error) throw error;
    
    NotificationCountManager.setCount(count || 0);
    console.log('Updated global unread count:', count);
  } catch (error) {
    console.error('Error fetching unread notifications count:', error);
  }
};

// Function to get the tab icon with badge
const getTabIcon = (
  route: RouteProp<ParamListBase, string>, 
  focused: boolean, 
  color: string, 
  size: number, 
  unreadCount = 0
) => {
  let iconName: keyof typeof Ionicons.glyphMap;

  if (route.name === 'Home') {
    iconName = focused ? 'home' : 'home-outline';
  } else if (route.name === 'Scanner') {
    iconName = focused ? 'barcode' : 'barcode-outline';
  } else if (route.name === 'Cart') {
    iconName = focused ? 'cart' : 'cart-outline';
  } else if (route.name === 'Notifications') {
    iconName = focused ? 'notifications' : 'notifications-outline';
    
    // Return the icon with a badge if there are unread notifications
    if (unreadCount > 0) {
      return (
        <View style={{ width: 24, height: 24, margin: 5 }}>
          <Ionicons name={iconName} size={size} color={color} />
          <View style={styles.badge}>
            {/* Show red dot instead of number */}
          </View>
        </View>
      );
    }
  } else {
    iconName = 'help-circle-outline';
  }

  return <Ionicons name={iconName} size={size} color={color} />;
};

const BottomTabNavigator = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const appState = useRef(AppState.currentState);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  
  // Setup to listen for notification count changes
  useEffect(() => {
    isMounted.current = true;
    
    // Listen for changes to the global notification count
    const removeListener = NotificationCountManager.addListener((count) => {
      if (isMounted.current) {
        setUnreadCount(count);
      }
    });
    
    return () => {
      isMounted.current = false;
      removeListener();
    };
  }, []);
  
  // Set up auto-refresh and real-time updates
  useEffect(() => {
    if (!user) return;
    
    // Initial fetch
    updateUnreadNotificationCount(user.id);
    
    // Setup auto refresh every minute
    const setupRefreshInterval = () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      refreshInterval.current = setInterval(() => {
        if (isMounted.current && appState.current === 'active') {
          console.log('Auto-refreshing notification count');
          updateUnreadNotificationCount(user.id);
        }
      }, 60000); // Refresh every minute
    };
    
    setupRefreshInterval();
    
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground, refreshing notification count');
        updateUnreadNotificationCount(user.id);
        setupRefreshInterval();
      } else if (nextAppState.match(/inactive|background/)) {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
          refreshInterval.current = null;
        }
      }
      appState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Subscribe to notification changes for real-time updates
    const notificationSubscription = supabase
      .channel('badge-notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (isMounted.current && appState.current === 'active') {
            console.log('Notification change detected, updating badge count');
            updateUnreadNotificationCount(user.id);
          }
        }
      )
      .subscribe();
    
    return () => {
      // Clean up on unmount
      isMounted.current = false;
      
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      
      subscription.remove();
      notificationSubscription.unsubscribe();
    };
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => 
          getTabIcon(route, focused, color, size, route.name === 'Notifications' ? unreadCount : 0),
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Scanner" component={ScannerStackNavigator} />
      <Tab.Screen name="Cart" component={CartStackNavigator} />
      <Tab.Screen name="Notifications" component={NotificationsStackNavigator} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});

export default BottomTabNavigator;
