import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import ProductDetailsScreen from '../screens/product/ProductDetailsScreen';
import AddPriceScreen from '../screens/product/AddPriceScreen';
import AddStoreScreen from '../screens/product/AddStoreScreen';
import AddProductScreen from '../screens/product/AddProductScreen';
import SearchScreen from '../screens/search/SearchScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ScannerStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

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
      <HomeStack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Add Product' }} />
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
    </ScannerStack.Navigator>
  );
};

// Profile stack
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: true,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: 'My Profile' }} />
    </ProfileStack.Navigator>
  );
};

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'barcode' : 'barcode-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Scanner" component={ScannerStackNavigator} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
