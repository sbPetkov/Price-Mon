import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import { supabase } from '../../config/supabase';

const AddProductScreen = ({ route, navigation }) => {
  const { barcode } = route.params; // Get the barcode from navigation params
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');

  const handleAddProduct = async () => {
    if (!name || !brand) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Insert the product and get the response
      const { data, error } = await supabase
        .from('products')
        .insert([{ barcode, name, brand, description }])
        .select() // Add this to get the inserted record
        .single(); // Get single record

      if (error) throw error;

      Alert.alert('Success', 'Product added successfully!');
      
      // Navigate to ProductDetails with the new product's ID
      navigation.replace('ProductDetails', {
        productId: data.id,
        barcode: barcode
      });

    } catch (error) {
      Alert.alert('Error', 'Failed to add product');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Product</Text>
      <TextInput
        style={styles.input}
        placeholder="Product Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Brand"
        value={brand}
        onChangeText={setBrand}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
      />
      <Button title="Add Product" onPress={handleAddProduct} />
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
});

export default AddProductScreen; 