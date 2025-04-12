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
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Define route param types
type ProductDetailsParams = {
  productId: string;
  barcode?: string;
  refresh?: boolean;
};

// Define navigation types
type ProductStackParamList = {
  ProductDetails: ProductDetailsParams;
  AddPrice: { productId: string; barcode?: string };
  PriceAlert: { productId: string; productName: string; userCity: string };
  Cart: { screen: string };
  StoreDetails: { storeId: string; storeName: string };
};

type ProductDetailsNavigationProp = NativeStackNavigationProp<ProductStackParamList>;

// Define data interfaces
interface PriceEntry {
  price: number;
  date_observed: string;
  is_on_sale?: boolean;
  regular_price?: number | null;
  stores?: {
    id: string;
    name: string;
    city: string;
  };
}

interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  product_prices: PriceEntry[];
}

interface Store {
  id: string;
  name: string;
  city: string;
  average: number;
}

interface SelectedDataPoint extends PriceEntry {
  value?: number;
  date: string;
}

interface ShoppingList {
  id: string;
  name: string;
}

const ProductDetailsScreen = () => {
  const route = useRoute<RouteProp<{ params: ProductDetailsParams }, 'params'>>();
  const navigation = useNavigation<ProductDetailsNavigationProp>();
  const { productId, barcode, refresh } = route.params;
  const { user, profile } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [allPriceHistory, setAllPriceHistory] = useState<PriceEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceEntry[]>([]);
  const [timeRange, setTimeRange] = useState('1month'); // '1month', '6months', 'all'
  const [cheapestStores, setCheapestStores] = useState<Store[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<SelectedDataPoint | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // Add shopping list related state
  const [listModalVisible, setListModalVisible] = useState(false);
  const [availableLists, setAvailableLists] = useState<ShoppingList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [addingToList, setAddingToList] = useState(false);
  const [quantity, setQuantity] = useState('1');

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
              id,
              name,
              city
            )
          )
        `)
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      if (!user) throw new Error('User not found');

      const { data: favoriteData, error: favoriteError } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (favoriteError) throw favoriteError;

      // Sort price history by date, oldest to newest
      const sortedPrices = productData.product_prices.sort((a: PriceEntry, b: PriceEntry) => 
        new Date(a.date_observed).getTime() - new Date(b.date_observed).getTime()
      );

      setAllPriceHistory(sortedPrices);
      setIsFavorite(favoriteData.length > 0);
      setProduct(productData);
      
      // Initial filtering based on default time range
      filterPriceHistoryByTimeRange(sortedPrices, timeRange);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId, user?.id]);

  const filterPriceHistoryByTimeRange = (prices: PriceEntry[], range: string) => {
    let filteredPrices: PriceEntry[] = [];
    const now = new Date();
    
    switch (range) {
      case '1month':
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);
        filteredPrices = prices.filter((price: PriceEntry) => 
          new Date(price.date_observed) >= oneMonthAgo
        );
        break;
      case '6months':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        filteredPrices = prices.filter((price: PriceEntry) => 
          new Date(price.date_observed) >= sixMonthsAgo
        );
        break;
      case 'all':
        filteredPrices = [...prices];
        break;
      default:
        filteredPrices = prices;
    }

    setPriceHistory(filteredPrices);
    findCheapestStores(filteredPrices);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refresh) {
      fetchData();
    }
  }, [refresh, fetchData]);

  useEffect(() => {
    if (allPriceHistory.length > 0) {
      filterPriceHistoryByTimeRange(allPriceHistory, timeRange);
    }
  }, [timeRange, allPriceHistory]);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [productId, fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const toggleFavorite = async () => {
    if (!user) return;
    
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

  const fetchLists = async () => {
    if (!user) return;
    
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
    if (!productId || !user) return;
    
    setAddingToList(true);
    try {
      // First check if the product already exists in the list
      const { data: existingItems, error: checkError } = await supabase
        .from('shopping_list_items')
        .select('*')
        .eq('list_id', listId)
        .eq('product_id', productId);

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
            product_id: productId,
            quantity: parseInt(quantity),
            added_by: user.id,
            created_at: new Date().toISOString(),
            completed: false
          });

        if (insertError) throw insertError;
        Alert.alert('Success', 'Item added to list');
      }

      setListModalVisible(false);
      setQuantity('1');
    } catch (error) {
      console.error('Error adding/updating item:', error);
      Alert.alert('Error', 'Failed to add/update item');
    } finally {
      setAddingToList(false);
    }
  };

  const findCheapestStores = (prices: PriceEntry[]) => {
    const storeMap: Record<string, { prices: number[], city: string, count: number, id: string }> = {};

    prices.forEach((entry: PriceEntry) => {
      const store = entry.stores;
      if (store) {
        if (!storeMap[store.name]) {
          storeMap[store.name] = {
            prices: [entry.price],
            city: store.city,
            count: 1,
            id: store.id
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
      average: data.prices.reduce((a: number, b: number) => a + b, 0) / data.prices.length,
      id: data.id
    }));

    setCheapestStores(storesArray.sort((a, b) => a.average - b.average));
  };

  const calculateAveragePrice = () => {
    if (!priceHistory || priceHistory.length === 0) return null;
    return priceHistory.reduce((sum, entry) => sum + entry.price, 0) / priceHistory.length;
  };

  // Format date for the modal to dd/MMM/yyyy format
  const formatDetailDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleDataPointPress = (dataPoint: { index: number, value: number }) => {
    const selectedEntry = priceHistory[dataPoint.index];
    setSelectedDataPoint({
      ...selectedEntry,
      value: dataPoint.value,
      date: formatDetailDate(selectedEntry.date_observed)
    });
    setModalVisible(true);
  };

  // Navigate to store details
  const navigateToStoreDetails = (storeId: string, storeName: string) => {
    navigation.navigate('StoreDetails', { 
      storeId, 
      storeName 
    });
  };

  // Format date for x-axis labels to prevent overlapping
  const formatChartDate = (dateString: string): string => {
    const date = new Date(dateString);
    
    // Different format based on time range to prevent overlapping
    if (timeRange === '1month') {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } else if (timeRange === '6months') {
      return `${date.getMonth() + 1}/${date.getFullYear().toString().substr(2)}`;
    } else {
      // For 'all' data, use month/year format
      return `${date.getMonth() + 1}/${date.getFullYear().toString().substr(2)}`;
    }
  };

  // Get limited number of labels to prevent overlapping
  const getChartLabels = () => {
    if (!priceHistory || priceHistory.length === 0) return [];
    
    // For small datasets, show all labels
    if (priceHistory.length <= 5) {
      return priceHistory.map(entry => formatChartDate(entry.date_observed));
    }
    
    // For larger datasets, only show some labels to prevent overlapping
    let interval;
    if (priceHistory.length > 20) {
      interval = Math.ceil(priceHistory.length / 5); // Show ~5 labels
    } else {
      interval = Math.ceil(priceHistory.length / Math.min(priceHistory.length, 5));
    }
    
    return priceHistory.map((entry, index) => 
      index % interval === 0 ? formatChartDate(entry.date_observed) : ''
    );
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

  // Get time range display text
  const getTimeRangeText = () => {
    switch(timeRange) {
      case '1month': return '1 Month';
      case '6months': return '6 Months';
      case 'all': return 'All Time';
      default: return '1 Month';
    }
  };

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
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.brand}>Brand: {product.brand}</Text>
          </View>
          
          {priceHistory && priceHistory.length > 0 ? (
            <>
              <Text style={styles.price}>
                Average Price ({getTimeRangeText()}): ${calculateAveragePrice()?.toFixed(2) || 'N/A'}
              </Text>

              <Text style={styles.subtitle}>Cheapest Stores ({getTimeRangeText()}):</Text>
              {cheapestStores.slice(0, 3).map((store, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.storeItem}
                  onPress={() => navigateToStoreDetails(store.id, store.name)}
                >
                  <Text style={styles.storeText}>
                    {store.name} ({store.city}): ${store.average.toFixed(2)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              ))}

              <View style={styles.timeRangeContainer}>
                <TouchableOpacity
                  style={[
                    styles.timeRangeButton,
                    timeRange === '1month' && styles.timeRangeButtonActive
                  ]}
                  onPress={() => setTimeRange('1month')}
                >
                  <Text style={[
                    styles.timeRangeText,
                    timeRange === '1month' && styles.timeRangeTextActive
                  ]}>1 Month</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.timeRangeButton,
                    timeRange === '6months' && styles.timeRangeButtonActive
                  ]}
                  onPress={() => setTimeRange('6months')}
                >
                  <Text style={[
                    styles.timeRangeText,
                    timeRange === '6months' && styles.timeRangeTextActive
                  ]}>6 Months</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.timeRangeButton,
                    timeRange === 'all' && styles.timeRangeButtonActive
                  ]}
                  onPress={() => setTimeRange('all')}
                >
                  <Text style={[
                    styles.timeRangeText,
                    timeRange === 'all' && styles.timeRangeTextActive
                  ]}>All Time</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>Price History:</Text>
              <LineChart
                data={{
                  labels: getChartLabels(),
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
                  propsForDots: { r: '6', strokeWidth: '2', stroke: '#ffa726' },
                  // Adjust spacing for better readability
                  horizontalLabelRotation: 30,
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
          
          <View style={styles.spacer} />
        </ScrollView>

        <View style={styles.bottomButtons}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity onPress={toggleFavorite} style={styles.actionButton}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={26} 
                color={isFavorite ? "#FF6B6B" : "#4A90E2"} 
              />
              <Text style={styles.actionButtonText}>
                {isFavorite ? "Favorited" : "Favorite"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('PriceAlert', { 
                productId, 
                productName: product.name,
                userCity: profile?.city || ''
              })}
            >
              <Ionicons name="notifications-outline" size={26} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Price Alert</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                setListModalVisible(true);
                fetchLists();
              }}
            >
              <Ionicons name="cart-outline" size={26} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.addPriceButton}
            onPress={() => navigation.navigate('AddPrice', { productId, barcode })}
          >
            <Text style={styles.addPriceText}>Add Price</Text>
          </TouchableOpacity>
        </View>

        {/* Price Data Point Modal */}
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
                  {selectedDataPoint.is_on_sale && selectedDataPoint.regular_price !== null && selectedDataPoint.regular_price !== undefined && (
                    <Text style={styles.saleText}>
                      Regular Price: ${selectedDataPoint.regular_price.toFixed(2)}
                    </Text>
                  )}
                  <TouchableOpacity 
                    onPress={() => {
                      setModalVisible(false);
                      if (selectedDataPoint.stores?.id) {
                        navigateToStoreDetails(selectedDataPoint.stores.id, selectedDataPoint.stores.name);
                      }
                    }}
                    style={styles.storeLink}
                  >
                    <Text style={styles.storeLinkText}>
                      Store: {selectedDataPoint.stores?.name || 'Unknown Store'}
                    </Text>
                    {selectedDataPoint.stores?.id && <Ionicons name="open-outline" size={16} color="#4A90E2" />}
                  </TouchableOpacity>
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

        {/* Shopping List Modal */}
        <Modal
          visible={listModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setListModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => {
            Keyboard.dismiss();
            setListModalVisible(false);
          }}>
            <View style={styles.centeredView}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.modalView}>
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
                    <ScrollView style={styles.listScrollContainer}>
                      <TouchableOpacity
                        style={styles.listItem}
                        onPress={() => {
                          setListModalVisible(false);
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
                  
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setListModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
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
    paddingBottom: 120, // Extra padding at bottom for the buttons
  },
  headerContainer: {
    marginBottom: 15,
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
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f5ff',
    width: '31%',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#4A90E2',
  },
  addPriceButton: {
    backgroundColor: '#9ACD32',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
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
    width: '85%',
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
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
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#4A90E2',
  },
  timeRangeText: {
    fontSize: 14,
    color: '#666',
  },
  timeRangeTextActive: {
    color: 'white',
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
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    width: '100%',
  },
  listScrollContainer: {
    width: '100%',
    maxHeight: 300,
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
  spacer: {
    height: 50, // Add space at the bottom of the ScrollView content
  },
  storeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  storeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  storeLinkText: {
    fontSize: 16,
    color: '#4A90E2',
    marginRight: 6,
  },
});

export default ProductDetailsScreen;
