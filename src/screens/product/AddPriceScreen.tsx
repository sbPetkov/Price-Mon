import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Alert, 
  Switch, 
  FlatList, 
  TouchableOpacity, 
  Keyboard, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  Animated
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

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
  const [isStoreInputFocused, setIsStoreInputFocused] = useState(false);
  const [isPriceInputFocused, setIsPriceInputFocused] = useState(false);
  const { user } = useAuth();
  
  // Animation values
  const bottomButtonOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedStore && storeInput === selectedStore.name) return;
    fetchStores(storeInput);
  }, [storeInput]);

  // Handle keyboard appearance for store selection
  useEffect(() => {
    if (isStoreInputFocused) {
      // Fade out the bottom button
      Animated.timing(bottomButtonOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Move content up to make room for keyboard
      Animated.timing(contentTranslateY, {
        toValue: -80, // Less aggressive shift up to keep more content visible
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade in the bottom button
      Animated.timing(bottomButtonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Move content back to original position
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isStoreInputFocused]);

  // Additional effect for price input focus
  useEffect(() => {
    if (isPriceInputFocused && Platform.OS === 'ios') {
      // Adjust position for numeric keyboard
      Animated.timing(contentTranslateY, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!isStoreInputFocused && !isPriceInputFocused) {
      // Reset position
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isPriceInputFocused]);

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
    setIsStoreInputFocused(false);
    setIsPriceInputFocused(false);
    
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

  const navigateToAddStore = () => {
    Keyboard.dismiss();
    setIsStoreInputFocused(false);
    setIsPriceInputFocused(false);
    navigation.navigate('AddStore');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.contentContainer, 
            { transform: [{ translateY: contentTranslateY }] }
          ]}
        >
          <Text style={styles.title}>Add Price</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter Price"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholderTextColor="#999"
            onFocus={() => {
              setIsStoreInputFocused(false);
              setIsPriceInputFocused(true);
            }}
            onBlur={() => setIsPriceInputFocused(false)}
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
              onFocus={() => {
                setIsStoreInputFocused(false);
                setIsPriceInputFocused(true);
              }}
              onBlur={() => setIsPriceInputFocused(false)}
            />
          )}

          <View style={[styles.storeSelectionContainer, isStoreInputFocused && styles.focusedStoreContainer]}>
            <View style={styles.storeInputContainer}>
              <TextInput
                style={styles.storeInput}
                placeholder="Select Store"
                value={storeInput}
                onChangeText={(text) => {
                  setStoreInput(text);
                  if (text.length >= 2 && !selectedStore) {
                    setIsStoreInputFocused(true);
                  }
                }}
                placeholderTextColor="#999"
                onFocus={() => {
                  setIsStoreInputFocused(true);
                  setIsPriceInputFocused(false);
                  setSelectedStore(null);
                }}
              />
              
              <TouchableOpacity 
                style={styles.addStoreButtonSmall}
                onPress={navigateToAddStore}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.addStoreTextSmall}>Add</Text>
              </TouchableOpacity>
            </View>

            {filteredStores.length > 0 && isStoreInputFocused && (
              <View style={styles.storeListContainer}>
                <FlatList
                  data={filteredStores}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.storeList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.storeItem}
                      onPress={() => {
                        setSelectedStore(item);
                        setStoreInput(item.name);
                        setFilteredStores([]);
                        setIsStoreInputFocused(false);
                        Keyboard.dismiss();
                      }}
                    >
                      <Text style={styles.storeText}>
                        {item.name} - {item.city}
                      </Text>
                      <Text style={styles.storeAddress}>{item.address}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {storeInput.length > 0 && filteredStores.length === 0 && !selectedStore && isStoreInputFocused && (
              <View style={styles.noStoreContainer}>
                <Text style={styles.noStoreText}>No stores found with this name.</Text>
              </View>
            )}
          </View>

          {selectedStore && !isStoreInputFocused && (
            <View style={styles.selectedStoreContainer}>
              <Text style={styles.selectedStoreLabel}>Selected Store:</Text>
              <View style={styles.selectedStoreInfo}>
                <Text style={styles.selectedStoreName}>{selectedStore.name}</Text>
                <Text style={styles.selectedStoreAddress}>{selectedStore.address}, {selectedStore.city}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View 
          style={[
            styles.bottomButtonsContainer,
            { 
              opacity: isStoreInputFocused ? 0 : 1,
              // Hide from interaction when fully transparent
              pointerEvents: isStoreInputFocused ? 'none' : 'auto' 
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddPrice}
          >
            <Text style={styles.addButtonText}>Add Price</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
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
  storeSelectionContainer: {
    marginBottom: 20,
  },
  focusedStoreContainer: {
    marginBottom: 0,
  },
  storeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  storeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  addStoreButtonSmall: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStoreTextSmall: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 5,
  },
  storeListContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    backgroundColor: '#fff',
    zIndex: 10,
    maxHeight: 220,
  },
  storeList: {
    maxHeight: 220,
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
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noStoreText: {
    color: '#666',
  },
  selectedStoreContainer: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#f8f9fa',
  },
  selectedStoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  selectedStoreInfo: {
    flexDirection: 'column',
  },
  selectedStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedStoreAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  bottomButtonsContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    zIndex: 1,
  },
  addButton: {
    backgroundColor: '#9ACD32',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddPriceScreen;
