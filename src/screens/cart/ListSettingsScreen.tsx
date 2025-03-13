import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Member {
  id: string;
  email: string;
  role: string;
  userId: string;
}

const ListSettingsScreen = () => {
  const route = useRoute();
  const { listId } = route.params;
  const navigation = useNavigation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      // Fetch list members
      const { data: memberData, error: memberError } = await supabase
        .from('shopping_list_members')
        .select('id, role, user_id')
        .eq('list_id', listId);
  
      if (memberError) throw memberError;
  
      const userIds = memberData.map(member => member.user_id);
  
      // Fetch emails from the profiles table using user_id
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('user_id', userIds);
  
      if (userError) throw userError;
  
      // Merge users with emails
      const formattedMembers = memberData.map(member => ({
        id: member.id,
        email: userData.find(user => user.user_id === member.user_id)?.email || 'Email not found',
        role: member.role,
        userId: member.user_id
      }));
  
      setMembers(formattedMembers);
      setIsOwner(formattedMembers.some(m => m.userId === user?.id && m.role === 'owner'));
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch list members');
    } finally {
      setLoading(false);
    }
  };
  
  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberEmail}>{item.email}</Text>
        <Text style={styles.memberRole}>{item.role}</Text>
      </View>
      {isOwner && item.role !== 'owner' && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            Alert.alert(
              'Remove Member',
              'Are you sure you want to remove this member?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeMember(item.id) }
              ]
            );
          }}
        >
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );

  const addMember = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!isOwner) {
      Alert.alert('Error', 'Only the list owner can add members');
      return;
    }

    setAdding(true);
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          Alert.alert('Error', 'User with this email not found');
        } else {
          throw userError;
        }
        return;
      }

      // Check if user is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from('shopping_list_members')
        .select('id')
        .eq('list_id', listId)
        .eq('user_id', userData.user_id)
        .single();

      if (!checkError && existingMember) {
        Alert.alert('Error', 'This user is already a member of the list');
        return;
      }

      // Add the user to the list
      const { error: insertError } = await supabase
        .from('shopping_list_members')
        .insert({
          list_id: listId,
          user_id: userData.user_id,
          role: 'editor',
          joined_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      Alert.alert('Success', 'Member added successfully');
      setEmail('');
      fetchMembers();
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isOwner) {
      Alert.alert('Error', 'Only the list owner can remove members');
      return;
    }

    try {
      const { error } = await supabase
        .from('shopping_list_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      Alert.alert('Success', 'Member removed successfully');
      fetchMembers(); // Refresh the members list
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('Error', 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOwner && (
        <View style={styles.addMemberSection}>
          <Text style={styles.sectionTitle}>Add Member</Text>
          <View style={styles.addMemberForm}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.addButton, adding && styles.addingButton]}
              onPress={addMember}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Members</Text>
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.membersList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMemberSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  addMemberForm: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  addingButton: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  membersList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    fontSize: 16,
    color: '#333',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  removeButton: {
    padding: 4,
  },
  addMemberButton: {
    padding: 8,
    marginRight: 8,
  },
});

export default ListSettingsScreen;
