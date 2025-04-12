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
import ScanToJoinScreen from '../screens/cart/ScanToJoinScreen';
import StoreDetailsScreen from '../screens/store/StoreDetailsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ScannerStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const NotificationsStack = createNativeStackNavigator();

// Create a simple notification indicator manager - only track if there are unread notifications
const NotificationIndicatorManager = {
  hasUnread: false,
  listeners: new Set<(hasUnread: boolean) => void>(),
  
  setHasUnread(hasUnread: boolean) {
    this.hasUnread = hasUnread;
    this.notifyListeners();
  },
  
  addListener(listener: (hasUnread: boolean) => void) {
    this.listeners.add(listener);
    // Immediately notify the new listener with the current status
    listener(this.hasUnread);
    return () => this.listeners.delete(listener);
  },
  
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.hasUnread));
  }
};

// Make NotificationIndicatorManager globally available
(window as any).NotificationIndicatorManager = NotificationIndicatorManager;

// Function to check for unread notifications and update the indicator
const updateUnreadNotificationStatus = async (userId: string) => {
  if (!userId) return;
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('seen', false);
    
    if (error) throw error;
    
    // We only need to know if there are any unread notifications, not how many
    NotificationIndicatorManager.setHasUnread(count ? count > 0 : false);
  } catch (error) {
    console.error('Error checking unread notifications:', error);
  }
};

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
      <HomeStack.Screen name="StoreDetails" component={StoreDetailsScreen} />
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
      <ScannerStack.Screen 
        name="StoreDetails" 
        component={StoreDetailsScreen} 
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
        name="ScanToJoin" 
        component={ScanToJoinScreen}
        options={{ headerShown: false }}
      />
      <CartStack.Screen 
        name="PriceAlert" 
        component={PriceAlertScreen}
        options={{ title: 'Set Price Alert' }}
      />
      <CartStack.Screen 
        name="StoreDetails" 
        component={StoreDetailsScreen} 
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
      <NotificationsStack.Screen name="StoreDetails" component={StoreDetailsScreen} />
    </NotificationsStack.Navigator>
  );
};

// Function to get the tab icon with badge
const getTabIcon = (
  route: RouteProp<ParamListBase, string>, 
  focused: boolean, 
  color: string, 
  size: number, 
  hasUnread = false
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
    if (hasUnread) {
      return (
        <View style={{ width: 24, height: 24, margin: 5 }}>
          <Ionicons name={iconName} size={size} color={color} />
          <View style={styles.badge} />
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
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const appState = useRef(AppState.currentState);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  
  // Setup to listen for notification indicator changes
  useEffect(() => {
    isMounted.current = true;
    
    // Listen for changes to the unread notification status
    const removeListener = NotificationIndicatorManager.addListener((hasUnread) => {
      if (isMounted.current) {
        setHasUnreadNotifications(hasUnread);
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
    
    // Initial check
    updateUnreadNotificationStatus(user.id);
    
    // Setup auto refresh every minute
    const setupRefreshInterval = () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
      refreshInterval.current = setInterval(() => {
        if (isMounted.current && appState.current === 'active') {
          updateUnreadNotificationStatus(user.id);
        }
      }, 60000); // Refresh every minute
    };
    
    setupRefreshInterval();
    
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        updateUnreadNotificationStatus(user.id);
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
            updateUnreadNotificationStatus(user.id);
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
          getTabIcon(route, focused, color, size, route.name === 'Notifications' ? hasUnreadNotifications : false),
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
  }
});

export default BottomTabNavigator;
