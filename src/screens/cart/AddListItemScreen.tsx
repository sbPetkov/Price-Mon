import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from 'lodash';

const AddListItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { listId } = route.params;
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('1');

  // Debounced search function
  const searchProducts = debounce(async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
      Alert.alert('Error', 'Failed to search products');
    } finally {
      setLoading(false);
    }
  }, 300);

  const handleAddToList = async (selectedProduct: any, qty: number) => {
    if (!selectedProduct) return;

    try {
      // First check if the product already exists in the list
      const { data: existingItems, error: checkError } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', listId)
        .eq('product_id', selectedProduct.id);

      if (checkError) throw checkError;

      if (existingItems && existingItems.length > 0) {
        // Product exists in the list
        const existingItem = existingItems[0];
        const newQuantity = existingItem.completed ? qty : existingItem.quantity + qty;

        // Update the existing item
        const { error: updateError } = await supabase
          .from('shopping_list_items')
          .update({ 
            quantity: newQuantity,
            completed: false, // Reset completed status
            completed_by: null,
            completed_at: null
          })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;

        Alert.alert(
          'Success', 
          existingItem.completed 
            ? 'Item unmarked as completed and quantity updated'
            : 'Quantity updated for existing item'
        );
      } else {
        // Product doesn't exist in the list, add it as new
        const { error: insertError } = await supabase
          .from('shopping_list_items')
          .insert({
            list_id: listId,
            product_id: selectedProduct.id,
            quantity: qty,
            added_by: user.id,
            created_at: new Date().toISOString(),
            completed: false
          });

        if (insertError) throw insertError;
        Alert.alert('Success', 'Item added to list');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error adding/updating item:', error);
      Alert.alert('Error', 'Failed to add/update item');
    }
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.resultItem,
        selectedProduct?.id === item.id && styles.selectedItem
      ]}
      onPress={() => setSelectedProduct(item)}
    >
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultBrand}>{item.brand}</Text>
      </View>
      {selectedProduct?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchProducts(text);
          }}
        />
        {loading && (
          <ActivityIndicator style={styles.loadingIndicator} />
        )}
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.resultsList}
        ListEmptyComponent={
          searchQuery.length > 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products found</Text>
            </View>
          ) : null
        }
      />

      {selectedProduct && (
        <View style={styles.footer}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToList(selectedProduct, parseInt(quantity))}
          >
            <Text style={styles.addButtonText}>Add to List</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  loadingIndicator: {
    marginLeft: 10,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedItem: {
    borderColor: '#4A90E2',
    backgroundColor: '#F5F9FF',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  resultBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
  },
  quantityInput: {
    width: 60,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
});

export default AddListItemScreen; 