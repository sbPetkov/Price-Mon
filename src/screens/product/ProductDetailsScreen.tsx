import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  ScrollView, 
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';

const ProductDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productId, barcode, refresh } = route.params;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState([]);
  const [cheapestStores, setCheapestStores] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          product_prices (
            price,
            date_observed,
            is_on_sale,
            regular_price,
            stores (
              name,
              city
            )
          )
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const { data: favoriteData, error: favoriteError } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (favoriteError) throw favoriteError;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredPrices = productData.product_prices.filter(price => 
        new Date(price.date_observed) >= thirtyDaysAgo
      );

      setProduct(productData);
      setPriceHistory(filteredPrices);
      findCheapestStores(filteredPrices);
      setIsFavorite(favoriteData.length > 0);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId, user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refresh) {
      fetchData();
    }
  }, [refresh]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [productId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
          
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert([{ 
            user_id: user.id, 
            product_id: productId,
            created_at: new Date().toISOString()
          }]);
          
        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
      console.error(error);
    }
  };

  const findCheapestStores = (prices) => {
    const storeMap = {};

    prices.forEach(entry => {
      const store = entry.stores;
      if (store) {
        if (!storeMap[store.name]) {
          storeMap[store.name] = {
            prices: [entry.price],
            city: store.city,
            count: 1
          };
        } else {
          storeMap[store.name].prices.push(entry.price);
          storeMap[store.name].count += 1;
        }
      }
    });

    const storesArray = Object.entries(storeMap).map(([name, data]) => ({
      name,
      city: data.city,
      average: data.prices.reduce((a, b) => a + b, 0) / data.prices.length
    }));

    setCheapestStores(storesArray.sort((a, b) => a.average - b.average));
  };

  const calculateAveragePrice = () => {
    if (!priceHistory || priceHistory.length === 0) return null;
    return priceHistory.reduce((sum, entry) => sum + entry.price, 0) / priceHistory.length;
  };

  const handleDataPointPress = (dataPoint) => {
    const selectedEntry = priceHistory[dataPoint.index];
    setSelectedDataPoint({
      ...selectedEntry,
      value: dataPoint.value,
      date: new Date(selectedEntry.date_observed).toLocaleDateString()
    });
    setModalVisible(true);
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

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.container}>
          <Text>No product found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A90E2']}
              tintColor="#4A90E2"
            />
          }
        >
          <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
            <Text style={styles.favoriteText}>{isFavorite ? '★' : '☆'}</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.brand}>Brand: {product.brand}</Text>
          
          {priceHistory && priceHistory.length > 0 ? (
            <>
              <Text style={styles.price}>
                Average Price (30 days): ${calculateAveragePrice()?.toFixed(2) || 'N/A'}
              </Text>

              <Text style={styles.subtitle}>Cheapest Stores (Last 30 Days):</Text>
              {cheapestStores.slice(0, 3).map((store, index) => (
                <Text key={index} style={styles.storeText}>
                  {store.name} ({store.city}): ${store.average.toFixed(2)}
                </Text>
              ))}

              <Text style={styles.subtitle}>Price History:</Text>
              <LineChart
                data={{
                  labels: priceHistory.map(entry => new Date(entry.date_observed).toLocaleDateString()),
                  datasets: [{ data: priceHistory.map(entry => entry.price) }]
                }}
                width={screenWidth - 40}
                height={220}
                yAxisLabel="$"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#4A90E2',
                  backgroundGradientTo: '#4A90E2',
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: '6', strokeWidth: '2', stroke: '#ffa726' }
                }}
                bezier
                style={styles.chart}
                onDataPointClick={handleDataPointPress}
              />
            </>
          ) : (
            <View style={styles.noPriceContainer}>
              <Text style={styles.noPriceText}>
                No price information available yet.
              </Text>
              <Text style={styles.noPriceSubtext}>
                Be the first to add a price for this product!
              </Text>
            </View>
          )}

          <Text style={styles.description}>{product.description}</Text>
        </ScrollView>

        <TouchableOpacity 
          style={styles.addPriceButton}
          onPress={() => navigation.navigate('AddPrice', { productId, barcode })}
        >
          <Text style={styles.addPriceText}>Add Price</Text>
        </TouchableOpacity>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {selectedDataPoint && (
                <>
                  <Text style={styles.modalTitle}>Price Details</Text>
                  <Text style={styles.modalText}>Date: {selectedDataPoint.date}</Text>
                  <Text style={styles.modalText}>Price: ${selectedDataPoint.value?.toFixed(2) || 'N/A'}</Text>
                  {selectedDataPoint.is_on_sale && selectedDataPoint.regular_price !== null && (
                    <Text style={styles.saleText}>
                      Regular Price: ${selectedDataPoint.regular_price.toFixed(2)}
                    </Text>
                  )}
                  <Text style={styles.modalText}>
                    Store: {selectedDataPoint.stores?.name || 'Unknown Store'}
                  </Text>
                  <Text style={styles.modalText}>
                    Location: {selectedDataPoint.stores?.city || 'Unknown City'}
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  brand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  storeText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  addPriceButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#9ACD32',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    zIndex: 1,
  },
  addPriceText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  saleText: {
    fontSize: 14,
    color: '#E74C3C',
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  favoriteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#4A90E2',
    padding: 8,
    borderRadius: 20,
    zIndex: 1,
  },
  favoriteText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  noPriceContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
  },
  noPriceText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  noPriceSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});

export default ProductDetailsScreen;
