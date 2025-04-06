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
  Modal,
  Share,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { generateListShareCode } from '../../utils/listSharingUtils';

interface RouteParams {
  listId: string;
}

interface Member {
  id: string;
  email: string;
  role: string;
  userId: string;
}

const ListSettingsScreen = () => {
  const route = useRoute();
  const params = route.params as RouteParams;
  const listId = params?.listId;
  const navigation = useNavigation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [adding, setAdding] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [listName, setListName] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchListDetails();
  }, []);

  const fetchListDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('name')
        .eq('id', listId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setListName(data.name);
      }
    } catch (error) {
      console.error('Error fetching list details:', error);
    }
  };

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

  const generateQRCode = async () => {
    setQrLoading(true);
    try {
      const shareCode = await generateListShareCode(listId);
      setQrValue(shareCode);
      setQrVisible(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setQrLoading(false);
    }
  };

  const shareList = async () => {
    try {
      if (!qrValue) {
        await generateQRCode();
      }
      
      // Share link (you could implement a web-based list joining system)
      await Share.share({
        message: `Join my shopping list "${listName}" in PriceMon! Open the app and use the "Scan to Join" feature to scan the QR code.`,
        title: 'Join Shopping List',
      });
    } catch (error) {
      console.error('Error sharing list:', error);
      Alert.alert('Error', 'Failed to share list');
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
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Modal
          visible={qrVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setQrVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Shopping List QR Code</Text>
              <Text style={styles.modalSubtitle}>{listName}</Text>
              
              <View style={styles.qrContainer}>
                {qrValue ? (
                  <QRCode
                    value={qrValue}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                ) : (
                  <ActivityIndicator size="large" color="#4A90E2" />
                )}
              </View>
              
              <Text style={styles.modalDescription}>
                Others can scan this QR code using the "Scan to Join" feature to join this list.
              </Text>
              
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setQrVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share List</Text>
          
          <View style={styles.shareButtons}>
            <TouchableOpacity 
              style={[styles.shareButton, styles.qrButton]}
              onPress={generateQRCode}
              disabled={qrLoading}
            >
              {qrLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="qr-code" size={24} color="#fff" />
                  <Text style={styles.shareButtonText}>Generate QR Code</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.shareButton, styles.inviteButton]}
              onPress={shareList}
              disabled={qrLoading}
            >
              {qrLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={24} color="#fff" />
                  <Text style={styles.shareButtonText}>Share Invite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          
          <View style={styles.addMemberSection}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter member's email"
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
          
          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <FlatList
              data={members}
              renderItem={renderMember}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.memberList}
              scrollEnabled={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>No members yet</Text>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  addMemberSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addingButton: {
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  memberList: {
    paddingBottom: 8,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontWeight: '500',
    color: '#333',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  removeButton: {
    padding: 8,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
    height: 230,
    width: 230,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  qrButton: {
    backgroundColor: '#4A90E2',
    marginRight: 8,
  },
  inviteButton: {
    backgroundColor: '#34C759',
    marginLeft: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default ListSettingsScreen;
