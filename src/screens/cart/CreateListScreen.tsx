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
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';

const CreateListScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberEmails, setMemberEmails] = useState<string[]>(['']); // State to hold member emails

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

      // Add additional members
      for (const email of memberEmails) {
        if (email.trim()) {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', email.trim().toLowerCase())
            .single();

          if (userError) {
            Alert.alert('Error', `Failed to find user with email: ${email}`);
            continue; // Skip to the next email
          }

          // Add member to the list
          await supabase
            .from('shopping_list_members')
            .insert([{
              list_id: listData.id,
              user_id: userData.user_id,
              role: 'editor',
            }]);
        }
      }

      Alert.alert('Success', 'Shopping list created successfully');
      navigation.navigate('ListDetails', { listId: listData.id });
    } catch (error) {
      Alert.alert('Error', 'Failed to create shopping list');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addMemberField = () => {
    setMemberEmails([...memberEmails, '']); // Add a new empty field
  };

  const handleEmailChange = (text: string, index: number) => {
    const updatedEmails = [...memberEmails];
    updatedEmails[index] = text; // Update the specific email field
    setMemberEmails(updatedEmails);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.content}>
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

          <Text style={styles.label}>Add Members</Text>
          {memberEmails.map((email, index) => (
            <View key={index} style={styles.memberInputContainer}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => handleEmailChange(text, index)}
                placeholder="Enter member email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          ))}
          <TouchableOpacity onPress={addMemberField} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add Member</Text>
          </TouchableOpacity>

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
        </ScrollView>
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
  memberInputContainer: {
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
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