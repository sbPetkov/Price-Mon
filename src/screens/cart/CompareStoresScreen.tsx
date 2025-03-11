import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../config/supabase';

interface Store {
  id: string;
  name: string;
  city: string;
  address: string;
}

interface PriceComparison {
  productName: string;
  store1Price: number | null;
  store2Price: number | null;
  priceDiff: number | null;
}

const CompareStoresScreen = () => {
  const route = useRoute();
  const { listId } = route.params;
  const [store1Search, setStore1Search] = useState('');
  const [store2Search, setStore2Search] = useState('');
  const [store1, setStore1] = useState<Store | null>(null);
  const [store2, setStore2] = useState<Store | null>(null);
  const [filteredStores1, setFilteredStores1] = useState<Store[]>([]);
  const [filteredStores2, setFilteredStores2] = useState<Store[]>([]);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [savingsPercentage, setSavingsPercentage] = useState<number | null>(null);
  const [store1Total, setStore1Total] = useState<number | null>(null);
  const [store2Total, setStore2Total] = useState<number | null>(null);
  const [savingsText, setSavingsText] = useState<string | null>(null);

  useEffect(() => {
    if (store1Search.length >= 2) {
      searchStores(store1Search, setFilteredStores1);
    } else {
      setFilteredStores1([]);
    }
  }, [store1Search]);

  useEffect(() => {
    if (store2Search.length >= 2) {
      searchStores(store2Search, setFilteredStores2);
    } else {
      setFilteredStores2([]);
    }
  }, [store2Search]);

  const searchStores = async (query: string, setStores: (stores: Store[]) => void) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error searching stores:', error);
    }
  };

  const compareStores = async () => {
    if (!store1 || !store2) {
      Alert.alert('Error', 'Please select both stores to compare');
      return;
    }

    try {
      // Get all products from the list
      const { data: listItems, error: listError } = await supabase
        .from('shopping_list_items')
        .select(`
          products (
            id,
            name,
            product_prices (
              price,
              is_on_sale,
              regular_price,
              date_observed,
              store_id
            )
          )
        `)
        .eq('list_id', listId);

      if (listError) throw listError;

      const priceComparisons: PriceComparison[] = listItems.map(item => {
        const product = item.products;
        const prices = product.product_prices;

        // Get latest price for each store
        const store1Prices = prices
          .filter(p => p.store_id === store1.id)
          .sort((a, b) => new Date(b.date_observed).getTime() - new Date(a.date_observed).getTime());
        
        const store2Prices = prices
          .filter(p => p.store_id === store2.id)
          .sort((a, b) => new Date(b.date_observed).getTime() - new Date(a.date_observed).getTime());

        // Get the latest price entry for each store
        const store1Latest = store1Prices[0];
        const store2Latest = store2Prices[0];

        // Use sale price if available, otherwise use regular price
        const store1Price = store1Latest ? (store1Latest.is_on_sale ? store1Latest.price : store1Latest.regular_price || store1Latest.price) : null;
        const store2Price = store2Latest ? (store2Latest.is_on_sale ? store2Latest.price : store2Latest.regular_price || store2Latest.price) : null;
        const priceDiff = store1Price && store2Price ? store1Price - store2Price : null;

        return {
          productName: product.name,
          store1Price,
          store2Price,
          priceDiff,
        };
      });

      setComparisons(priceComparisons);

      // Get only products with prices in both stores
      const validComparisons = priceComparisons.filter(
        c => c.store1Price !== null && c.store2Price !== null
      );

      if (validComparisons.length > 0) {
        // Calculate totals only for products available in both stores
        const store1Total = validComparisons.reduce((sum, c) => sum + c.store1Price!, 0);
        const store2Total = validComparisons.reduce((sum, c) => sum + c.store2Price!, 0);
        
        setStore1Total(store1Total);
        setStore2Total(store2Total);

        // Calculate savings percentage
        const savings = ((store1Total - store2Total) / store1Total) * 100;
        setSavingsPercentage(savings);

        // Add info about how many products were compared
        setSavingsText(
          `Based on ${validComparisons.length} of ${priceComparisons.length} products`
        );
      } else {
        setStore1Total(null);
        setStore2Total(null);
        setSavingsPercentage(null);
        setSavingsText('No products available for comparison in both stores');
      }
    } catch (error) {
      console.error('Error comparing stores:', error);
      Alert.alert('Error', 'Failed to compare stores');
    }
  };

  const handleStoreSelect = (store: Store, isStore1: boolean) => {
    if (isStore1) {
      setStore1(store);
      setStore1Search('');
      setFilteredStores1([]);
    } else {
      setStore2(store);
      setStore2Search('');
      setFilteredStores2([]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.storeSelectors}>
        {/* Store 1 Selector */}
        <View style={styles.storeSelector}>
          <Text style={styles.label}>Store 1</Text>
          {store1 ? (
            <View style={styles.selectedStore}>
              <View style={styles.selectedStoreInfo}>
                <Text style={styles.selectedStoreName}>{store1.name}</Text>
                <Text style={styles.selectedStoreAddress}>
                  {store1.address}, {store1.city}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setStore1(null)}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={store1Search}
                onChangeText={setStore1Search}
                placeholder="Search store..."
              />
              {filteredStores1.length > 0 && (
                <FlatList
                  style={styles.suggestions}
                  data={filteredStores1}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestion}
                      onPress={() => handleStoreSelect(item, true)}
                    >
                      <Text style={styles.storeName}>{item.name}</Text>
                      <Text style={styles.storeAddress}>
                        {item.address}, {item.city}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </View>

        {/* Store 2 Selector */}
        <View style={styles.storeSelector}>
          <Text style={styles.label}>Store 2</Text>
          {store2 ? (
            <View style={styles.selectedStore}>
              <View style={styles.selectedStoreInfo}>
                <Text style={styles.selectedStoreName}>{store2.name}</Text>
                <Text style={styles.selectedStoreAddress}>
                  {store2.address}, {store2.city}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => setStore2(null)}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={store2Search}
                onChangeText={setStore2Search}
                placeholder="Search store..."
              />
              {filteredStores2.length > 0 && (
                <FlatList
                  style={styles.suggestions}
                  data={filteredStores2}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestion}
                      onPress={() => handleStoreSelect(item, false)}
                    >
                      <Text style={styles.storeName}>{item.name}</Text>
                      <Text style={styles.storeAddress}>
                        {item.address}, {item.city}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.compareButton}
          onPress={compareStores}
        >
          <Text style={styles.compareButtonText}>Compare Stores</Text>
        </TouchableOpacity>
      </View>

      {savingsPercentage !== null && (
        <View style={styles.savingsContainer}>
          <Text style={styles.savingsText}>
            {savingsPercentage > 0
              ? `Shopping at ${store2?.name} is ${Math.abs(savingsPercentage).toFixed(1)}% cheaper`
              : `Shopping at ${store1?.name} is ${Math.abs(savingsPercentage).toFixed(1)}% cheaper`}
          </Text>
          <Text style={styles.savingsSubtext}>{savingsText}</Text>
        </View>
      )}

      <ScrollView style={styles.comparisonsContainer}>
        {/* Header */}
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerCell, styles.productCell]}>Product</Text>
          <Text style={[styles.cell, styles.headerCell]}>{store1?.name}</Text>
          <Text style={[styles.cell, styles.headerCell]}>{store2?.name}</Text>
        </View>

        {/* Comparison rows */}
        {comparisons.map((comparison, index) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.cell, styles.productCell]}>{comparison.productName}</Text>
            <Text style={[
              styles.cell,
              comparison.priceDiff > 0 && styles.higherPrice,
              comparison.priceDiff < 0 && styles.lowerPrice,
            ]}>
              {comparison.store1Price ? `$${comparison.store1Price.toFixed(2)}` : 'N/A'}
            </Text>
            <Text style={[
              styles.cell,
              comparison.priceDiff < 0 && styles.higherPrice,
              comparison.priceDiff > 0 && styles.lowerPrice,
            ]}>
              {comparison.store2Price ? `$${comparison.store2Price.toFixed(2)}` : 'N/A'}
            </Text>
          </View>
        ))}

        {/* Totals */}
        {store1Total !== null && store2Total !== null && (
          <View style={styles.totalRow}>
            <Text style={[styles.cell, styles.productCell, styles.totalText]}>Estimated Total</Text>
            <Text style={[styles.cell, styles.totalText]}>${store1Total.toFixed(2)}</Text>
            <Text style={[styles.cell, styles.totalText]}>${store2Total.toFixed(2)}</Text>
          </View>
        )}
      </ScrollView>

      <Text style={styles.disclaimer}>
        * The prices may not be accurate and are based on user reports
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  storeSelectors: {
    marginBottom: 20,
  },
  storeSelector: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  suggestions: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
  },
  suggestion: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cityText: {
    fontSize: 12,
    color: '#666',
  },
  compareButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  compareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  savingsContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  savingsText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#22AA22',
  },
  savingsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  comparisonsContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cell: {
    flex: 1,
    padding: 12,
    textAlign: 'center',
  },
  productCell: {
    flex: 2,
    textAlign: 'left',
  },
  headerCell: {
    fontWeight: '600',
    backgroundColor: '#f8f8f8',
  },
  higherPrice: {
    color: '#FF3B30',
  },
  lowerPrice: {
    color: '#4CD964',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  totalText: {
    fontWeight: '600',
    color: '#333',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectedStore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedStoreInfo: {
    flex: 1,
  },
  selectedStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedStoreAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  changeButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  storeName: {
    fontSize: 16,
    color: '#333',
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default CompareStoresScreen; 