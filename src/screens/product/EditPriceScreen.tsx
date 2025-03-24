import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, Switch } from 'react-native';
import { supabase } from '../../config/supabase';

const EditPriceScreen = ({ route, navigation }) => {
  const { priceId } = route.params;
  const [priceData, setPriceData] = useState({ price: '', store_id: '', is_on_sale: false, regular_price: '' });
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      const { data, error } = await supabase
        .from('product_prices')
        .select('*')
        .eq('id', priceId)
        .single();

      if (error) {
        Alert.alert('Error', 'Failed to fetch price data');
        console.error(error);
      } else {
        setPriceData({
          price: data.price.toString(),
          store_id: data.store_id,
          is_on_sale: data.is_on_sale,
          regular_price: data.regular_price ? data.regular_price.toString() : '',
        });
        setSelectedStore(data.store_id);
      }
    };

    const fetchStores = async () => {
      const { data, error } = await supabase.from('stores').select('*');
      if (error) {
        Alert.alert('Error', 'Failed to fetch stores');
        console.error(error);
      } else {
        setStores(data);
      }
    };

    fetchPriceData();
    fetchStores();
  }, [priceId]);

  const handleUpdate = async () => {
    console.log("Using priceId:", priceId); 

    // Fetch the existing data before updating
    const { data: beforeUpdate, error: fetchError } = await supabase
      .from('product_prices')
      .select('*')
      .eq('id', String(priceId))
      .single();

    if (fetchError) {
      console.error("Error fetching data before update:", fetchError);
    } else {
      console.log("Before update data:", beforeUpdate);
    }

    try {
      const { error } = await supabase
        .from('product_prices')
        .update({
          price: parseFloat(priceData.price),
          store_id: selectedStore,
          is_on_sale: priceData.is_on_sale,
          regular_price: priceData.is_on_sale ? parseFloat(priceData.regular_price) : null,
        })
        .eq('id', String(priceId));

      if (error) {
        console.error("Error updating price:", error);
        throw error;
      }

      // Fetch the updated data to verify the change
      const { data: afterUpdate, error: fetchAfterError } = await supabase
        .from('product_prices')
        .select('*', { head: false }) // Forces fresh data
        .eq('id', String(priceId))
        .single();

      if (fetchAfterError) {
        console.error("Error fetching data after update:", fetchAfterError);
      } else {
        console.log("After update data:", afterUpdate);
      }

      Alert.alert('Success', 'Price updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update price');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Price</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter Price"
        value={priceData.price}
        onChangeText={(text) => setPriceData({ ...priceData, price: text })}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Select Store"
        value={selectedStore}
        onChangeText={(text) => setSelectedStore(text)}
      />
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>On Sale</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={priceData.is_on_sale ? "#f5dd4b" : "#f4f3f4"}
          value={priceData.is_on_sale}
          onValueChange={() => setPriceData({ ...priceData, is_on_sale: !priceData.is_on_sale })}
        />
      </View>
      {priceData.is_on_sale && (
        <TextInput
          style={styles.input}
          placeholder="Enter Regular Price"
          value={priceData.regular_price}
          onChangeText={(text) => setPriceData({ ...priceData, regular_price: text })}
          keyboardType="numeric"
        />
      )}
      <Button title="Update Price" onPress={handleUpdate} />
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    marginRight: 15,
  },
});

export default EditPriceScreen;
