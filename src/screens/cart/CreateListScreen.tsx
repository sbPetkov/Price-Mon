import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

const CreateListScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateList = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    setLoading(true);
    try {
      // Create new shopping list
      const { data: listData, error: listError } = await supabase
        .from('shopping_lists')
        .insert([{
          name: name.trim(),
          created_by: user.id,
        }])
        .select()
        .single();

      if (listError) throw listError;

      // Add creator as list member with 'owner' role
      const { error: memberError } = await supabase
        .from('shopping_list_members')
        .insert([{
          list_id: listData.id,
          user_id: user.id,
          role: 'owner',
        }]);

      if (memberError) throw memberError;

      Alert.alert('Success', 'Shopping list created successfully');
      navigation.navigate('ListDetails', { listId: listData.id });
    } catch (error) {
      Alert.alert('Error', 'Failed to create shopping list');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.content}>
          <Text style={styles.label}>List Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter list name"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreateList}
          />
          <TouchableOpacity
            style={[
              styles.createButton,
              (!name.trim() || loading) && styles.disabledButton
            ]}
            onPress={handleCreateList}
            disabled={!name.trim() || loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create List'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5C8F0',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateListScreen; 