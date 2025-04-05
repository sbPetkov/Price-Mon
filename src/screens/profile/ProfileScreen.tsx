import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, Alert, FlatList, TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';

interface PriceItem {
  id: string;
  price: number;
  date_observed: string;
  user_id: string;
  products: {
    name: string;
  };
}

const ProfileScreen = () => {
  const { user, profile, fetchProfile } = useAuth();
  const navigation = useNavigation<any>();
  const [recentlyAddedPrices, setRecentlyAddedPrices] = useState<PriceItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRecentlyAddedPrices();
    fetchProfile();
  }, [page]);

  const fetchRecentlyAddedPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_prices')
        .select(`
          id, price, date_observed, user_id,
          products (name)
        `)
        .eq('user_id', user?.id)
        .order('date_observed', { ascending: false })
        .range(page * itemsPerPage, (page + 1) * itemsPerPage - 1);

      if (error) throw error;

      setRecentlyAddedPrices(data as unknown as PriceItem[] || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch recently added prices');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrice = (priceId: string) => {
    navigation.navigate('EditPrice', { priceId });
  };

  const confirmDeletePrice = (priceId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this price?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeletePrice(priceId) },
      ]
    );
  };

  const handleDeletePrice = async (priceId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('product_prices')
        .delete()
        .eq('id', priceId)
        .eq('user_id', user?.id);  

      if (error) throw error;

      Alert.alert('Success', 'Price deleted successfully!');
      fetchRecentlyAddedPrices(); 
    } catch (error) {
      Alert.alert('Error', 'Failed to delete price');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const renderItem = ({ item }: { item: PriceItem }) => (
    <View style={styles.priceItem}>
      <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
        {item.products?.name || "Unknown Product"}
      </Text>
      <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      <Text style={styles.date}>{formatDate(item.date_observed)}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleEditPrice(item.id)}>
          <Ionicons name="pencil-outline" size={20} color="#4A90E2" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDeletePrice(item.id)} style={styles.deleteIcon}>
          <Ionicons name="trash-outline" size={20} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getFullName = () => {
    if (profile) {
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
    }
    return 'N/A';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      <View style={styles.profileInfo}>
        <Text style={styles.label}>Email: {user?.email}</Text>
        <Text style={styles.label}>Name: {getFullName()}</Text>
        {profile && profile.city && <Text style={styles.label}>City: {profile.city}</Text>}
        {profile && profile.phone_number && <Text style={styles.label}>Phone: {profile.phone_number}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Recently Added Prices</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" />
      ) : (
        <FlatList
          data={recentlyAddedPrices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListFooterComponent={
            <View style={styles.pagination}>
              <TouchableOpacity 
                onPress={() => setPage((prev) => Math.max(prev - 1, 0))} 
                disabled={page === 0}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={24} 
                  color={page === 0 ? '#ccc' : '#4A90E2'} 
                />
              </TouchableOpacity>
              <Text style={styles.pageNumber}>Page {page + 1}</Text>
              <TouchableOpacity 
                onPress={() => setPage((prev) => prev + 1)} 
                disabled={recentlyAddedPrices.length < itemsPerPage}
              >
                <Ionicons 
                  name="arrow-forward" 
                  size={24} 
                  color={recentlyAddedPrices.length < itemsPerPage ? '#ccc' : '#4A90E2'} 
                />
              </TouchableOpacity>
            </View>
          }
        />
      )}
      <Ionicons 
        name="settings" 
        size={24} 
        color="#4A90E2" 
        style={styles.settingsIcon} 
        onPress={() => navigation.navigate('ProfileSettings')} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileInfo: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  productName: {
    flex: 2.5,
    fontSize: 16,
  },
  price: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  date: {
    flex: 1.5,
    fontSize: 16,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIcon: {
    marginLeft: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginTop: 10,
  },
  pageNumber: {
    fontSize: 18,
    marginHorizontal: 20,
  },
  settingsIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
});

export default ProfileScreen;
