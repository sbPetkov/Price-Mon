import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../config/supabase';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Define store data interface
interface StoreData {
  name: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

const AddStoreScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        setLocationLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      
      Alert.alert('Success', 'Current location added. Make sure you are at the store location for accurate results.');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setLocationLoading(false);
    }
  };

  const clearLocation = () => {
    setLatitude(null);
    setLongitude(null);
  };

  const handleAddStore = async () => {
    if (!name || !address || !city) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const storeData: StoreData = {
        name,
        address,
        city,
      };
      
      // Only add location if available
      if (latitude !== null && longitude !== null) {
        storeData.latitude = latitude;
        storeData.longitude = longitude;
      }
      
      const { error } = await supabase
        .from('stores')
        .insert([storeData]);

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error));
        
        // Check if it's a column not found error - show a more specific message
        if (error.code === 'PGRST204' && error.message.includes('latitude')) {
          Alert.alert(
            'Database Error', 
            'Your database is missing location columns. Please run the SQL script to add them first.',
            [
              { text: 'OK', style: 'cancel' },
              { 
                text: 'Add Without Location', 
                onPress: async () => {
                  // Retry without location data
                  const basicStoreData = {
                    name,
                    address,
                    city,
                  };
                  
                  const { error: retryError } = await supabase
                    .from('stores')
                    .insert([basicStoreData]);
                    
                  if (retryError) {
                    Alert.alert('Error', 'Failed to add store');
                    console.error(retryError);
                  } else {
                    Alert.alert('Success', 'Store added successfully (without location data)');
                    navigation.goBack();
                  }
                }
              }
            ]
          );
          setLoading(false);
          return;
        }
        
        throw error;
      }

      Alert.alert('Success', 'Store added successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to add store');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Store</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Store Name"
        value={name}
        onChangeText={setName}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
      />
      
      <TextInput
        style={styles.input}
        placeholder="City"
        value={city}
        onChangeText={setCity}
      />

      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Store Location</Text>
        <Text style={styles.locationNote}>
          ⓘ For accurate results, use this feature when you are physically at the store location
        </Text>

        {latitude && longitude ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              📍 Location added: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
            <TouchableOpacity 
              style={styles.clearLocationButton}
              onPress={clearLocation}
            >
              <Text style={styles.clearLocationText}>Clear Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.locationButtonText}>Use Current Location</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleAddStore} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.addButtonText}>Add Store</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  locationSection: {
    marginVertical: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  locationNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  locationButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  locationInfo: {
    padding: 10,
    backgroundColor: '#e8f4ff',
    borderRadius: 6,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#444',
  },
  clearLocationButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  clearLocationText: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#9ACD32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddStoreScreen;
