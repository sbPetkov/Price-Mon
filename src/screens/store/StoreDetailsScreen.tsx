import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Linking,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
// Use dynamic import to handle potential missing native module
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Get Google Maps API key from env vars
const getGoogleMapsApiKey = (): string | undefined => {
  if (Constants.expoConfig?.extra && Constants.expoConfig.extra.GOOGLE_MAPS_API_KEY) {
    return Constants.expoConfig.extra.GOOGLE_MAPS_API_KEY;
  }
  return undefined;
};

// Create a flag to track if map module is available
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;
let isMapAvailable = false;

// Try to import the map module safely
try {
  const MapModule = require('react-native-maps');
  MapView = MapModule.default;
  Marker = MapModule.Marker;
  PROVIDER_GOOGLE = MapModule.PROVIDER_GOOGLE;
  isMapAvailable = true;
} catch (error) {
  console.log('Map module not available:', error);
  isMapAvailable = false;
}

interface RouteParams {
  storeId: string;
  storeName: string;
}

interface StoreDetails {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  created_at: string;
  updated_at: string;
}

const StoreDetailsScreen = () => {
  const route = useRoute();
  const { storeId, storeName } = route.params as RouteParams;
  const navigation = useNavigation();
  const [store, setStore] = useState<StoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Set the navigation title
    navigation.setOptions({
      title: storeName || 'Store Details',
    });

    fetchStoreDetails();
    fetchUserLocation();
  }, [storeId, navigation, storeName]);

  const fetchStoreDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      setStore(data);
    } catch (error) {
      console.error('Error fetching store details:', error);
      Alert.alert('Error', 'Failed to fetch store details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  useEffect(() => {
    if (store?.latitude && store?.longitude && userLocation) {
      // Calculate distance between user and store using Haversine formula
      const calculateDistance = () => {
        const R = 6371; // Radius of the Earth in km
        const latitude = store.latitude as number;
        const longitude = store.longitude as number;
        const dLat = deg2rad(latitude - userLocation.coords.latitude);
        const dLon = deg2rad(longitude - userLocation.coords.longitude);
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(deg2rad(userLocation.coords.latitude)) * Math.cos(deg2rad(latitude)) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in km
        setDistance(distance);
      };

      calculateDistance();
    }
  }, [store, userLocation]);

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI/180);
  };

  const openAppleMaps = () => {
    if (store?.latitude && store?.longitude) {
      const url = `https://maps.apple.com/?q=${encodeURIComponent(store.name)}&ll=${store.latitude},${store.longitude}`;
      Linking.openURL(url).catch(err => {
        console.error('Error opening Apple Maps:', err);
        Alert.alert('Error', 'Unable to open Maps');
      });
    } else if (store?.address) {
      const query = `${store.address}, ${store.city}`;
      const url = `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
      Linking.openURL(url).catch(err => {
        console.error('Error opening Apple Maps:', err);
        Alert.alert('Error', 'Unable to open Maps');
      });
    }
  };

  const openGoogleMaps = () => {
    if (store?.latitude && store?.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}&query_place_id=${encodeURIComponent(store.name)}`;
      Linking.openURL(url).catch(err => {
        console.error('Error opening Google Maps:', err);
        Alert.alert('Error', 'Unable to open Google Maps');
      });
    } else if (store?.address) {
      const query = `${store.address}, ${store.city}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      Linking.openURL(url).catch(err => {
        console.error('Error opening Google Maps:', err);
        Alert.alert('Error', 'Unable to open Google Maps');
      });
    }
  };

  const openPhone = () => {
    if (store?.phone) {
      Linking.openURL(`tel:${store.phone}`);
    }
  };

  const openWebsite = () => {
    if (store?.website) {
      let url = store.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  // Handle map errors with a component error boundary approach
  const handleMapLoadError = () => {
    setMapError('Could not load map view');
  };

  const handleMapReady = () => {
    setMapLoaded(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.container}>
          <Text style={styles.errorText}>Store details not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderMapFallback = () => (
    <View style={styles.mapPlaceholder}>
      <Ionicons name="map" size={48} color="#4A90E2" />
      <Text style={styles.mapPlaceholderText}>
        {!isMapAvailable ? "Map View Not Available" : "Could not load map view"}
      </Text>
      {store.latitude && store.longitude && (
        <Text style={styles.mapPlaceholderLocation}>
          {store.latitude.toFixed(6)}, {store.longitude.toFixed(6)}
        </Text>
      )}
    </View>
  );

  const renderMap = () => {
    if (!isMapAvailable || mapError || !store.latitude || !store.longitude) {
      return renderMapFallback();
    }

    return (
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: store.latitude,
            longitude: store.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          onLayout={() => {
            // If map doesn't load within 2 seconds, assume error
            setTimeout(() => {
              if (!mapLoaded) {
                handleMapLoadError();
              }
            }, 2000);
          }}
          onMapReady={handleMapReady}
        >
          <Marker
            coordinate={{
              latitude: store.latitude,
              longitude: store.longitude,
            }}
            title={store.name}
            description={store.address}
          />
        </MapView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeAddress}>{store.address}, {store.city}</Text>
          {distance && (
            <Text style={styles.distanceText}>
              {distance < 1 
                ? `${(distance * 1000).toFixed(0)} meters away` 
                : `${distance.toFixed(1)} km away`
              }
            </Text>
          )}
        </View>

        <View style={styles.actionsSection}>
          {store.phone && (
            <TouchableOpacity style={styles.actionButton} onPress={openPhone}>
              <Ionicons name="call" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
          )}

          {store.website && (
            <TouchableOpacity style={styles.actionButton} onPress={openWebsite}>
              <Ionicons name="globe" size={24} color="#4A90E2" />
              <Text style={styles.actionText}>Website</Text>
            </TouchableOpacity>
          )}
        </View>

        {store.opening_hours && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Opening Hours</Text>
            <Text style={styles.infoText}>{store.opening_hours}</Text>
          </View>
        )}

        {store.latitude && store.longitude ? (
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            
            {renderMap()}
            
            <View style={styles.mapButtonsContainer}>
              {Platform.OS === 'ios' && (
                <TouchableOpacity 
                  style={[styles.mapButton, styles.appleMapsButton]} 
                  onPress={openAppleMaps}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.mapButtonText}>Apple Maps</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.mapButton, styles.googleMapsButton]}
                onPress={openGoogleMaps}
              >
                <Ionicons name="locate" size={18} color="#fff" />
                <Text style={styles.mapButtonText}>Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noMapContainer}>
            <Text style={styles.noMapText}>No map location available</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  headerSection: {
    marginBottom: 20,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  storeAddress: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 15,
    color: '#4A90E2',
    fontWeight: '500',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    marginTop: 8,
    color: '#4A90E2',
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  mapContainer: {
    marginBottom: 24,
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    height: 200,
    width: Dimensions.get('window').width - 32,
  },
  mapPlaceholder: {
    height: 200,
    width: Dimensions.get('window').width - 32,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  mapPlaceholderLocation: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
  },
  mapButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  appleMapsButton: {
    backgroundColor: '#4A90E2',
  },
  googleMapsButton: {
    backgroundColor: '#4285F4',
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  openMapsButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMapsText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  noMapContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24,
  },
  noMapText: {
    fontSize: 16,
    color: '#666',
  },
});

export default StoreDetailsScreen; 