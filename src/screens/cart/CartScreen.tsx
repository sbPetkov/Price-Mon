import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const CartScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRoles, setUserRoles] = useState<{[key: string]: string}>({});

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select(`
          *,
          shopping_list_members!inner (
            user_id,
            role
          ),
          shopping_list_items (
            id
          )
        `)
        .eq('shopping_list_members.user_id', user.id);

      if (error) throw error;
      setLists(data || []);
      fetchUserRoles(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch shopping lists');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserRoles = async (lists) => {
    try {
      const { data, error } = await supabase
        .from('shopping_list_members')
        .select('list_id, role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = {};
      data.forEach(item => {
        roles[item.list_id] = item.role;
      });
      setUserRoles(roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchLists();
  }, []);

  const deleteList = async (listId) => {
    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
      fetchLists();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete list');
      console.error(error);
    }
  };

  const handleDeleteList = (listId) => {
    Alert.alert(
      'Delete List',
      'Are you sure you want to delete this list? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteList(listId),
        },
      ]
    );
  };

  const handleLeaveList = async (listId: string) => {
    Alert.alert(
      'Leave List',
      'Are you sure you want to leave this list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shopping_list_members')
                .delete()
                .eq('list_id', listId)
                .eq('user_id', user.id);

              if (error) throw error;
              fetchLists();
            } catch (error) {
              console.error('Error leaving list:', error);
              Alert.alert('Error', 'Failed to leave list');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.listCard}>
      <TouchableOpacity
        style={styles.listInfo}
        onPress={() => navigation.navigate('ListDetails', { listId: item.id })}
      >
        <Text style={styles.listName}>{item.name}</Text>
        <Text style={styles.listMeta}>
          {item.shopping_list_items.length} items
        </Text>
      </TouchableOpacity>

      <View style={styles.listActions}>
        {userRoles[item.id] === 'owner' && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('ListSettings', { listId: item.id })}
          >
            <Ionicons name="settings-outline" size={24} color="#4A90E2" />
          </TouchableOpacity>
        )}
        
        {userRoles[item.id] === 'owner' ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteList(item.id)}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.leaveButton}
            onPress={() => handleLeaveList(item.id)}
          >
            <Ionicons name="exit-outline" size={24} color="#FF9500" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={lists}
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
              No shopping lists yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Create a list to get started
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateList')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Create List</Text>
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
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  listMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
  },
  createButton: {
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
  createButtonText: {
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
  settingsButton: {
    padding: 8,
    marginRight: 8,
  },
  leaveButton: {
    padding: 8,
  },
});

export default CartScreen; 