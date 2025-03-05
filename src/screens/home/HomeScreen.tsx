import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, SafeAreaView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../config/supabase';
import { useNavigation } from '@react-navigation/native';
import { debounce } from 'lodash';

type HomeScreenProps = NativeStackScreenProps<any, 'HomeScreen'>;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchFavorites = async () => {
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
        const favoritesWithPrice = data.map(favorite => {
          let latestPrice = null;
          if (
            favorite.products &&
            favorite.products.product_prices &&
            favorite.products.product_prices.length > 0
          ) {
            // Sort the prices in descending order based on date_observed (most recent first)
            favorite.products.product_prices.sort(
              (a, b) => new Date(b.date_observed) - new Date(a.date_observed)
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
  }, [user.id]);

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
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
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
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%`)
        .limit(50);

      if (error) throw error;

      navigation.navigate('Search', { searchResults: data || [] });
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error performing full search:', error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetails', { productId: item.product_id })}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.products.name}</Text>
        <Text style={styles.productBrand}>{item.products.brand}</Text>
        <Text style={styles.productPrice}>
          ${item.latestPrice !== null ? item.latestPrice : 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.greeting}>
          Hello, {user?.email?.split('@')[0] || 'User'}
        </Text>
        <Text style={styles.subtitle}>Your favorite products</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          onSubmitEditing={handleFullSearch}
        />
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
      
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={item => item.product_id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              You don't have any favorite products yet.
            </Text>
            <Text>Scan products and mark them as favorites to see them here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionName: {
    fontSize: 16,
    color: '#333',
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
    borderRadius: 10,
    padding: 15,
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
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
