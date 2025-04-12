import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, SafeAreaView, Modal, TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../config/supabase';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type HomeStackParamList = {
  HomeScreen: undefined;
  Search: { searchResults: any[] };
  ProductDetails: { productId: string };
  Profile: undefined;
  Cart: { screen: string };
};

type RootTabParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
  Cart: undefined;
};

type HomeScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>,
  BottomTabNavigationProp<RootTabParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

interface ProductPrice {
  price: number;
  date_observed: string;
}

interface Product {
  name: string;
  brand: string;
  barcode: string;
  product_prices: ProductPrice[];
}

interface Favorite {
  product_id: string;
  products: Product;
  latestPrice?: number;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      
      try {
        // Query the user_favorites table and join the related products,
        // then nest product_prices within products.
        const { data, error } = await supabase
          .from('user_favorites')
          .select(`
            product_id,
            products (
              name,
              brand,
              barcode,
              product_prices (
                price,
                date_observed
              )
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // Map through the data to determine the latest price from the nested product_prices array.
        const favoritesWithPrice = data.map((favorite: any) => {
          let latestPrice = null;
          if (
            favorite.products &&
            favorite.products.product_prices &&
            favorite.products.product_prices.length > 0
          ) {
            // Sort the prices in descending order based on date_observed (most recent first)
            favorite.products.product_prices.sort(
              (a: ProductPrice, b: ProductPrice) => 
                new Date(b.date_observed).getTime() - new Date(a.date_observed).getTime()
            );
            latestPrice = favorite.products.product_prices[0].price;
          }
          return { ...favorite, latestPrice };
        });

        setFavorites(favoritesWithPrice);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch favorites');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user?.id]);

  // Debounced search function
  const searchProducts = debounce(async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  }, 300);

  // Handle search query changes
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setShowSuggestions(true);
    searchProducts(text);
  };

  // Handle full search
  const handleFullSearch = async () => {
    if (searchQuery.length < 3) {
      setSearchError('Please enter at least 3 characters to search');
      return;
    }
    
    setSearchError('');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(50);

      if (error) throw error;

      navigation.navigate('Search', { searchResults: data || [] });
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error performing full search:', error);
    }
  };

  const fetchLists = async () => {
    setLoadingLists(true);
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          shopping_list_members!inner (
            user_id,
            role
          )
        `)
        .eq('shopping_list_members.user_id', user.id);

      if (error) throw error;
      setAvailableLists(data || []);
    } catch (error) {
      console.error('Error fetching lists:', error);
      Alert.alert('Error', 'Failed to fetch shopping lists');
    } finally {
      setLoadingLists(false);
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!selectedProductId || !user) return;
    
    setAddingToList(true);
    try {
      // First check if the product already exists in the list
      const { data: existingItems, error: checkError } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', listId)
        .eq('product_id', selectedProductId);

      if (checkError) throw checkError;

      if (existingItems && existingItems.length > 0) {
        // Product exists in the list
        const existingItem = existingItems[0];
        const newQuantity = existingItem.completed ? 
          parseInt(quantity) : 
          existingItem.quantity + parseInt(quantity);

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
            product_id: selectedProductId,
            quantity: parseInt(quantity),
            added_by: user.id,
            created_at: new Date().toISOString(),
            completed: false
          });

        if (insertError) throw insertError;
        Alert.alert('Success', 'Item added to list');
      }

      setModalVisible(false);
      setSelectedProductId(null);
      setQuantity('1');
    } catch (error) {
      console.error('Error adding/updating item:', error);
      Alert.alert('Error', 'Failed to add/update item');
    } finally {
      setAddingToList(false);
    }
  };

  const renderItem = ({ item }: { item: Favorite }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.product_id })}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.products.name}</Text>
        <Text style={styles.productBrand}>{item.products.brand}</Text>
        {item.latestPrice && (
          <Text style={styles.productPrice}>${item.latestPrice.toFixed(2)}</Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.addToListButton}
        onPress={() => {
          setSelectedProductId(item.product_id);
          setModalVisible(true);
          fetchLists();
        }}
      >
        <Ionicons name="add-circle-outline" size={24} color="#4A90E2" />
        <Text style={styles.addToListText}>Add to List</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const onRefresh = React.useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          product_id,
          products (
            name,
            brand,
            barcode,
            product_prices (
              price,
              date_observed
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const favoritesWithPrice = data.map((favorite: any) => {
        let latestPrice = null;
        if (
          favorite.products &&
          favorite.products.product_prices &&
          favorite.products.product_prices.length > 0
        ) {
          favorite.products.product_prices.sort(
            (a: ProductPrice, b: ProductPrice) => 
              new Date(b.date_observed).getTime() - new Date(a.date_observed).getTime()
          );
          latestPrice = favorite.products.product_prices[0].price;
        }
        return { ...favorite, latestPrice };
      });

      setFavorites(favoritesWithPrice);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh favorites');
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  const getGreeting = () => {
    if (profile && profile.first_name) {
      return `Hello, ${profile.first_name}`;
    }
    return 'Hello';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={32} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={(text) => {
              handleSearchChange(text);
              setSearchError('');
            }}
            onSubmitEditing={handleFullSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
                setSearchError('');
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => {
                  navigation.navigate('ProductDetails', {
                    productId: item.id,
                    barcode: item.barcode,
                  });
                  setShowSuggestions(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionBrand}>{item.brand}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      
      <View style={styles.favoritesHeaderContainer}>
        <Text style={styles.favoritesHeaderText}>Your Favorite Products</Text>
      </View>
      
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={item => item.product_id}
        contentContainerStyle={[
          styles.listContainer,
          { paddingTop: 0 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={48} color="#ccc" style={styles.emptyStateIcon} />
            <Text style={styles.emptyStateText}>No favorites yet</Text>
            <Text style={styles.emptyStateSubText}>Products you favorite will appear here</Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add to List</Text>
                
                <TextInput
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  placeholder="Quantity"
                />

                {loadingLists ? (
                  <ActivityIndicator size="large" color="#4A90E2" />
                ) : (
                  <ScrollView style={styles.listContainer}>
                    <TouchableOpacity
                      style={styles.listItem}
                      onPress={() => {
                        setModalVisible(false);
                        navigation.navigate('Cart', {
                          screen: 'CreateList'
                        });
                      }}
                    >
                      <Ionicons name="add-circle" size={24} color="#4A90E2" />
                      <Text style={styles.newListText}>Create New List</Text>
                    </TouchableOpacity>

                    {availableLists.map(list => (
                      <TouchableOpacity
                        key={list.id}
                        style={[
                          styles.listItem,
                          addingToList && styles.listItemDisabled
                        ]}
                        onPress={() => handleAddToList(list.id)}
                        disabled={addingToList}
                      >
                        <Ionicons name="list" size={24} color="#666" />
                        <Text style={styles.listName}>{list.name}</Text>
                        {addingToList && <ActivityIndicator size="small" style={styles.listLoader} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 23,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    padding: 5,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  favoritesHeaderContainer: {
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  favoritesHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 134, // Adjusted for the new UI
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#eee',
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  suggestionBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  listContainer: {
    padding: 15,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  productBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyStateIcon: {
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  emptyStateSubText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButton: {
    padding: 8,
  },
  addToListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  addToListText: {
    marginLeft: 8,
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listName: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  newListText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  listItemDisabled: {
    opacity: 0.5,
  },
  listLoader: {
    marginLeft: 12,
  },
});

export default HomeScreen;
