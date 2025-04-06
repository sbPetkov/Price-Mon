import { supabase } from '../config/supabase';

// The format of the encoded share data
interface ListShareData {
  listId: string;
  timestamp: number;
  invitation: string; // A unique invitation identifier
}

/**
 * Generates an encoded string for sharing a shopping list
 * @param listId The ID of the shopping list to share
 * @returns A base64 encoded string with list sharing data
 */
export const generateListShareCode = async (listId: string): Promise<string> => {
  try {
    // First, get the list name to include in invitation data
    const { data: list, error } = await supabase
      .from('shopping_lists')
      .select('name')
      .eq('id', listId)
      .single();
    
    if (error) throw error;
    
    // Create a unique invitation identifier (doesn't need to be stored in DB)
    const invitation = `${listId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Create the share data
    const shareData: ListShareData = {
      listId,
      timestamp: Date.now(),
      invitation
    };
    
    // Encode it to string (base64)
    return btoa(JSON.stringify(shareData));
  } catch (error) {
    console.error('Error generating list share code:', error);
    throw error;
  }
};

/**
 * Decodes a shopping list share code
 * @param shareCode The base64 encoded share code
 * @returns The decoded list sharing data or null if invalid
 */
export const decodeListShareCode = (shareCode: string): ListShareData | null => {
  try {
    // Decode from base64
    const decodedData = atob(shareCode);
    
    // Parse the JSON
    const shareData: ListShareData = JSON.parse(decodedData);
    
    // Validate that it has the expected format
    if (!shareData.listId || !shareData.timestamp || !shareData.invitation) {
      return null;
    }
    
    // Check if the invitation is expired (24 hours)
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - shareData.timestamp > expirationTime) {
      return null; // Expired
    }
    
    return shareData;
  } catch (error) {
    console.error('Error decoding list share code:', error);
    return null;
  }
};

/**
 * Joins a user to a shared shopping list
 * @param userId The ID of the user joining the list
 * @param shareData The decoded share data
 * @returns A boolean indicating success
 */
export const joinSharedList = async (userId: string, shareData: ListShareData): Promise<boolean> => {
  try {
    // Check if the user is already a member of this list
    const { data: existingMember, error: checkError } = await supabase
      .from('shopping_list_members')
      .select('id')
      .eq('list_id', shareData.listId)
      .eq('user_id', userId)
      .single();
    
    if (existingMember) {
      // User is already a member
      return true;
    }
    
    // Add the user to the list
    const { error } = await supabase
      .from('shopping_list_members')
      .insert({
        list_id: shareData.listId,
        user_id: userId,
        role: 'editor', // Default role for invited members
        joined_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error joining shared list:', error);
    return false;
  }
}; 