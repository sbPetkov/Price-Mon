import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Switch, FlatList, TouchableOpacity, Keyboard } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

const AddPriceScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId, barcode } = route.params;
  const [price, setPrice] = useState('');
  const [isOnSale, setIsOnSale] = useState(false);
  const [regularPrice, setRegularPrice] = useState('');
  const [storeInput, setStoreInput] = useState('');
  const [filteredStores, setFilteredStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (selectedStore && storeInput === selectedStore.name) return;
    fetchStores(storeInput);
  }, [storeInput]);

  const fetchStores = async (query) => {
    if (query.length < 2) {
      setFilteredStores([]);
      return;
    }

    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`);

    if (error) console.error('Error fetching stores:', error);
    else setFilteredStores(data || []);
  };

  const handleAddPrice = async () => {
    Keyboard.dismiss();
    
    if (!price || !selectedStore) {
      Alert.alert('Error', 'Please enter a price and select a store');
      return;
    }

    try {
      // Handle decimal separators and format price
      const cleanedPrice = price.replace(',', '.');
      const priceValue = parseFloat(cleanedPrice);
      
      if (isNaN(priceValue)) {
        Alert.alert('Error', 'Invalid price format');
        return;
      }

      const priceData = {
        product_id: productId,
        user_id: user.id,
        price: Number(priceValue.toFixed(2)),
        is_on_sale: isOnSale,
        store_id: selectedStore.id,
        date_observed: new Date().toISOString(),
      };

      if (isOnSale) {
        const cleanedRegular = regularPrice.replace(',', '.');
        const regularValue = parseFloat(cleanedRegular);
        
        if (isNaN(regularValue)) {
          Alert.alert('Error', 'Invalid regular price format');
          return;
        }
        
        priceData.regular_price = Number(regularValue.toFixed(2));
      }

      const { error } = await supabase
        .from('product_prices')
        .insert([priceData]);

      if (error) throw error;

      Alert.alert('Success', 'Price added successfully!');
      navigation.navigate('ProductDetails', { productId, refresh: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to add price');
      console.error('Error adding price:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Price</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholderTextColor="#999"
      />

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>On Sale</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={isOnSale ? "#f5dd4b" : "#f4f3f4"}
          value={isOnSale}
          onValueChange={setIsOnSale}
        />
      </View>

      {isOnSale && (
        <TextInput
          style={styles.input}
          placeholder="Enter Regular Price"
          value={regularPrice}
          onChangeText={setRegularPrice}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Select Store"
        value={storeInput}
        onChangeText={(text) => {
          setStoreInput(text);
          setSelectedStore(null);
        }}
        placeholderTextColor="#999"
      />

      {filteredStores.length > 0 && (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.storeItem}
              onPress={() => {
                setSelectedStore(item);
                setStoreInput(item.name);
                setFilteredStores([]);
              }}
            >
              <Text style={styles.storeText}>
                {item.name} - {item.city}
              </Text>
              <Text style={styles.storeAddress}>{item.address}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {storeInput.length > 0 && filteredStores.length === 0 && !selectedStore && (
        <View style={styles.noStoreContainer}>
          <Text style={styles.noStoreText}>No stores found.</Text>
          <TouchableOpacity
            style={styles.addStoreButton}
            onPress={() => navigation.navigate('AddStore')}
          >
            <Text style={styles.addStoreText}>Add New Store</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddPrice}
      >
        <Text style={styles.addButtonText}>Add Price</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 80
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    marginRight: 15,
    color: '#333',
  },
  storeItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  storeText: {
    fontSize: 16,
    color: '#333',
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noStoreContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  noStoreText: {
    color: '#666',
    marginBottom: 15,
  },
  addStoreButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  addStoreText: {
    color: 'white',
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#9ACD32',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddPriceScreen;
