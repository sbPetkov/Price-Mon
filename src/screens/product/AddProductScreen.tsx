import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
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
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Add Product</Text>
          <TextInput
            style={styles.input}
            placeholder="Product Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Brand"
            value={brand}
            onChangeText={setBrand}
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.bottomButtonsContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddProduct}
          >
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  bottomButtonsContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addButton: {
    backgroundColor: '#9ACD32',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddProductScreen; 