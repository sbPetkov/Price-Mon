import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface PriceAlertRouteParams {
  productId: string;
  productName: string;
  userCity: string;
}

interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  price_limit: number;
  city: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

const PriceAlertScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  
  // Get params from route
  const { productId, productName, userCity } = route.params as PriceAlertRouteParams;
  
  const [priceLimit, setPriceLimit] = useState('');
  const [city, setCity] = useState(userCity || '');
  const [loading, setLoading] = useState(false);
  const [existingAlert, setExistingAlert] = useState<PriceAlert | null>(null);
  const [loadingExistingAlert, setLoadingExistingAlert] = useState(true);

  // Fetch existing price alert for this product and user
  useEffect(() => {
    const fetchExistingAlert = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('price_alerts')
          .select('*')
          .eq('user_id', user.id)
          .eq('product_id', productId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for no rows returned
          console.error('Error fetching existing alert:', error);
        }

        if (data) {
          setExistingAlert(data);
          setPriceLimit(data.price_limit.toString());
          setCity(data.city || userCity || '');
        }
      } catch (error) {
        console.error('Error in fetchExistingAlert:', error);
      } finally {
        setLoadingExistingAlert(false);
      }
    };

    fetchExistingAlert();
  }, [user?.id, productId]);

  const handleCreateAlert = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create price alerts');
      return;
    }

    if (!priceLimit || parseFloat(priceLimit) <= 0) {
      Alert.alert('Error', 'Please enter a valid price limit');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Error', 'Please enter a city');
      return;
    }

    setLoading(true);
    try {
      if (existingAlert) {
        // Update existing alert
        const { error } = await supabase
          .from('price_alerts')
          .update({
            price_limit: parseFloat(priceLimit),
            city: city.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingAlert.id);

        if (error) throw error;
        
        Alert.alert(
          'Success', 
          `Alert updated! You'll be notified when ${productName} drops below $${priceLimit} in ${city}`
        );
      } else {
        // Create new alert
        const { error } = await supabase
          .from('price_alerts')
          .insert({
            user_id: user.id,
            product_id: productId,
            price_limit: parseFloat(priceLimit),
            city: city.trim(),
            active: true,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;
        
        Alert.alert(
          'Success', 
          `Alert created! You'll be notified when ${productName} drops below $${priceLimit} in ${city}`
        );
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error creating/updating price alert:', error);
      Alert.alert('Error', 'Failed to save price alert');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async () => {
    if (!existingAlert) return;

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this price alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from('price_alerts')
                .delete()
                .eq('id', existingAlert.id);

              if (error) throw error;
              
              Alert.alert('Success', 'Price alert deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting price alert:', error);
              Alert.alert('Error', 'Failed to delete price alert');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loadingExistingAlert) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Price Alert</Text>
            <Text style={styles.productName}>{productName}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={24} color="#4A90E2" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              You'll receive a notification when this product drops below your price limit in the specified city.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Price Limit ($)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={priceLimit}
                onChangeText={setPriceLimit}
                keyboardType="decimal-pad"
                autoFocus={!existingAlert}
              />
            </View>

            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city"
              value={city}
              onChangeText={setCity}
            />
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleCreateAlert}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="notifications" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {existingAlert ? 'Update Alert' : 'Create Alert'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {existingAlert && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAlert}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Delete Alert</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  productName: {
    fontSize: 18,
    color: '#4A90E2',
    marginBottom: 5,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f5ff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
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
  buttonContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default PriceAlertScreen; 