import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const ListDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { listId, refresh } = route.params;
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListDetails = async () => {
    try {
      // Fetch list details
      const { data: listData, error: listError } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          shopping_list_members (
            user_id,
            role
          )
        `)
        .eq('id', listId)
        .single();

      if (listError) throw listError;

      // Fetch list items
      const { data: itemsData, error: itemsError } = await supabase
        .from('shopping_list_items')
        .select(`
          *,
          products (
            name,
            brand
          )
        `)
        .eq('list_id', listId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;

      setList(listData);
      setItems(itemsData || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch list details');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListDetails();
  }, [listId]);

  useEffect(() => {
    if (refresh) {
      fetchListDetails();
    }
  }, [refresh]);

  useFocusEffect(
    React.useCallback(() => {
      fetchListDetails();
    }, [listId])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchListDetails();
  }, []);

  const toggleItemComplete = async (itemId, completed) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .update({
          completed: !completed,
          completed_by: !completed ? user.id : null,
          completed_at: !completed ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (error) throw error;
      fetchListDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
      console.error(error);
    }
  };

  const deleteItem = async (itemId) => {
    try {
      const { error } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchListDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item');
      console.error(error);
    }
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item from the list?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteItem(itemId),
        },
      ]
    );
  };

  // Sort items to put completed ones at the bottom
  const sortedItems = [...items].sort((a, b) => {
    if (a.completed === b.completed) {
      // If completion status is the same, sort by created_at
      return new Date(a.created_at) - new Date(b.created_at);
    }
    // Put completed items at the bottom
    return a.completed ? 1 : -1;
  });

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => toggleItemComplete(item.id, item.completed)}
      >
        <Ionicons
          name={item.completed ? "checkbox" : "square-outline"}
          size={24}
          color="#4A90E2"
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.itemInfo}
        onPress={() => navigation.navigate('ProductDetails', { productId: item.product_id })}
      >
        <Text style={[
          styles.itemName,
          item.completed && styles.completedItem
        ]}>
          {item.products.name}
        </Text>
        <Text style={styles.itemQuantity}>
          Quantity: {item.quantity}
        </Text>
        {item.completed && (
          <Text style={styles.completedBy}>
            Completed {new Date(item.completed_at).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading list...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.compareButton}
        onPress={() => navigation.navigate('CompareStores', { listId })}
      >
        <Ionicons name="bar-chart" size={24} color="#fff" />
        <Text style={styles.compareButtonText}>Compare Stores</Text>
      </TouchableOpacity>
      <FlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No items in this list
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Add items to get started
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddListItem', { listId })}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Item</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  completedItem: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  completedBy: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  compareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ListDetailsScreen; 