import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ScannerStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();

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
    </CartStack.Navigator>
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
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Scanner" component={ScannerStackNavigator} />
      <Tab.Screen name="Cart" component={CartStackNavigator} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
