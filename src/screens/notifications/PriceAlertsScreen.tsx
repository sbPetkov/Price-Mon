import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';

interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  price_limit: number;
  city: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
  products: {
    name: string;
  };
}

const PriceAlertsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editAlert, setEditAlert] = useState<PriceAlert | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newCity, setNewCity] = useState('');

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          products (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        setAlerts(data);
      }
    } catch (error) {
      console.error('Error loading price alerts:', error);
      Alert.alert('Error', 'Failed to load price alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Load alerts when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadAlerts();
    }, [loadAlerts])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const openEditModal = (alert: PriceAlert) => {
    setEditAlert(alert);
    setNewPrice(alert.price_limit.toString());
    setNewCity(alert.city);
    setEditModal(true);
  };

  const handleUpdateAlert = async () => {
    if (!editAlert) return;
    
    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!newCity.trim()) {
      Alert.alert('Error', 'Please enter a city');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('price_alerts')
        .update({
          price_limit: priceValue,
          city: newCity.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editAlert.id);

      if (error) throw error;
      
      Alert.alert('Success', 'Price alert updated successfully');
      setEditModal(false);
      loadAlerts();
    } catch (error) {
      console.error('Error updating price alert:', error);
      Alert.alert('Error', 'Failed to update price alert');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlertActive = async (alert: PriceAlert) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .update({
          active: !alert.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', alert.id);

      if (error) throw error;
      
      // Update local state
      setAlerts(prev => 
        prev.map(a => a.id === alert.id ? { ...a, active: !a.active } : a)
      );
    } catch (error) {
      console.error('Error toggling alert status:', error);
      Alert.alert('Error', 'Failed to update alert status');
    }
  };

  const deleteAlert = async (alertId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this price alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('price_alerts')
                .delete()
                .eq('id', alertId);

              if (error) throw error;
              
              // Update local state
              setAlerts(prev => prev.filter(a => a.id !== alertId));
            } catch (error) {
              console.error('Error deleting price alert:', error);
              Alert.alert('Error', 'Failed to delete price alert');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Price Alerts</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={loadAlerts}
        >
          <Ionicons name="refresh" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="pricetag-outline" size={70} color="#ccc" />
          <Text style={styles.emptyText}>No price alerts yet</Text>
          <Text style={styles.emptySubtext}>
            Set price alerts for products you're interested in
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.alertItem}>
              <View style={styles.alertInfoContainer}>
                <Text style={styles.productName}>{item.products.name}</Text>
                <View style={styles.alertDetails}>
                  <Text style={styles.priceLabel}>Alert Price:</Text>
                  <Text style={styles.priceValue}>${item.price_limit.toFixed(2)}</Text>
                </View>
                <View style={styles.alertDetails}>
                  <Text style={styles.cityLabel}>City:</Text>
                  <Text style={styles.cityValue}>{item.city}</Text>
                </View>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusLabel}>Status:</Text>
                  <Text style={[
                    styles.statusValue,
                    item.active ? styles.activeStatus : styles.inactiveStatus
                  ]}>
                    {item.active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleAlertActive(item)}
                >
                  <Ionicons 
                    name={item.active ? "toggle" : "toggle-outline"} 
                    size={24} 
                    color={item.active ? "#4A90E2" : "#999"} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(item)}
                >
                  <Ionicons name="pencil" size={22} color="#4A90E2" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => deleteAlert(item.id)}
                >
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Alert Modal */}
      <Modal
        visible={editModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Price Alert</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            {editAlert && (
              <View style={styles.modalBody}>
                <Text style={styles.modalProductName}>{editAlert.products.name}</Text>
                
                <Text style={styles.inputLabel}>Price Limit ($)</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>

                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={newCity}
                  onChangeText={setNewCity}
                  placeholder="Enter city"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleUpdateAlert}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  alertInfoContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  alertDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  cityLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  cityValue: {
    fontSize: 14,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeStatus: {
    color: '#4CD964',
  },
  inactiveStatus: {
    color: '#FF3B30',
  },
  actionsContainer: {
    justifyContent: 'space-around',
    paddingLeft: 12,
  },
  actionButton: {
    padding: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalProductName: {
    fontSize: 18,
    color: '#4A90E2',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  currencySymbol: {
    fontSize: 18,
    color: '#666',
    marginRight: 5,
  },
  priceInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    width: '48%',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    width: '48%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PriceAlertsScreen; 