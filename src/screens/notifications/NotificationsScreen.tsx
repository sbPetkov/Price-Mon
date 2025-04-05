import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Alert,
  AppState,
  AppStateStatus,
  Animated,
  Platform,
  Share,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { updateUnreadNotificationCount } from '../../navigation/BottomTabNavigator';
import { shareNotification, formatPriceAlertForSharing } from '../../utils/shareUtils';

interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  data: any;
  read: boolean;
  seen: boolean;
  created_at: string;
}

// Notification utility functions
export function subscribeToNotifications(userId: string, onNewNotification: (notification: any) => void) {
  const channel = supabase
    .channel('public:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewNotification(payload.new);
        }
      }
    )
    .subscribe();
    
  return channel;
}

export async function fetchUserNotifications(userId: string) {
  if (!userId) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string) {
  if (!notificationId) {
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const appState = useRef(AppState.currentState);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTime = useRef<number>(Date.now());
  const isMounted = useRef(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const initialLoadRef = useRef(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user || !isMounted.current) return;
    
    // Check if the session is still valid
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
          refreshInterval.current = null;
        }
        return;
      }
      
      // Skip throttling for initial load
      if (!initialLoadRef.current) {
        initialLoadRef.current = true;
      } else {
        // Don't reload if it's been less than 10 seconds since the last refresh
        const now = Date.now();
        if (now - lastRefreshTime.current < 10000) {
          return;
        }
      }
      
      lastRefreshTime.current = Date.now();
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && isMounted.current) {
        setNotifications(data);
        
        // Animate in the notifications
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
        
        // Mark all as seen when viewed
        const unseenIds = data
          .filter(notification => !notification.seen)
          .map(notification => notification.id);
        
        if (unseenIds.length > 0) {
          markNotificationsAsSeen(unseenIds);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [user, fadeAnim]);

  const markNotificationsAsSeen = async (notificationIds: string[]) => {
    if (!notificationIds.length || !user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ seen: true })
        .in('id', notificationIds);
      
      if (error) {
        console.error('Error marking notifications as seen:', error);
      } else if (isMounted.current) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notificationIds.includes(notif.id) 
              ? { ...notif, seen: true } 
              : notif
          )
        );
        
        // Update global notification count
        updateUnreadNotificationCount(user.id);
      }
    } catch (error) {
      console.error('Error in markNotificationsAsSeen:', error);
    }
  };

  // Set up auto-refresh when the app is in use
  useEffect(() => {
    if (!user) return;
    
    isMounted.current = true;
    initialLoadRef.current = false;
    
    // Force immediate load when component mounts
    loadNotifications().catch(err => {
      console.error('Error loading notifications on mount:', err);
    });
    
    // Handle app state changes for better battery usage
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadNotifications().catch(err => {
          console.error('Error refreshing after app state change:', err);
        });
      }
      appState.current = nextAppState;
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Real-time updates from Supabase
    const notificationSubscription = supabase
      .channel('notifications-screen')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (isMounted.current && appState.current === 'active') {
            // If it's an INSERT event and we're on the notifications screen, immediately refresh
            if (payload.eventType === 'INSERT') {
              // Set a small timeout to ensure database consistency
              setTimeout(() => {
                if (isMounted.current) {
                  loadNotifications().catch(err => {
                    console.error('Error refreshing after new notification:', err);
                  });
                }
              }, 300);
            } else {
              // For other events (UPDATE, DELETE)
              loadNotifications().catch(err => {
                console.error('Error refreshing after database change:', err);
              });
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      // Clean up on unmount
      isMounted.current = false;
      
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
      
      subscription.remove();
      notificationSubscription.unsubscribe();
    };
  }, [user, loadNotifications]);

  // Load notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Reset the animation when screen is focused
      fadeAnim.setValue(0);
      
      // Force a refresh when the screen gains focus, regardless of timer
      initialLoadRef.current = false;
      loadNotifications().catch(err => {
        console.error('Error loading notifications on focus:', err);
      });
      
      return () => {
        // Clean up any pending state updates when screen loses focus
      };
    }, [loadNotifications, fadeAnim])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    // Reset the animation for smooth transition
    fadeAnim.setValue(0);
    
    loadNotifications().catch(err => {
      console.error('Error in manual refresh:', err);
      setRefreshing(false);
    });
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        
        // Update local state to mark as read
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        
        // Also mark as seen if it wasn't already
        if (!notification.seen) {
          markNotificationsAsSeen([notification.id]);
        }
      } catch (error) {
        // Error handled silently
      }
    }

    // Navigate based on notification type
    if (notification.type === 'price_alert' && notification.data?.product_id) {
      navigation.navigate('ProductDetails', { 
        productId: notification.data.product_id 
      });
    }
    // Add more notification type handlers as needed
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update global notification count
      if (user) {
        updateUnreadNotificationCount(user.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const clearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            if (!user || notifications.length === 0) return;
            
            try {
              setLoading(true);
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);
              
              if (error) throw error;
              
              setNotifications([]);
              
              // Update global notification count to zero
              updateUnreadNotificationCount(user.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear notifications');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleShareNotification = async (notification: Notification) => {
    try {
      // Log the notification to debug the data structure
      console.log('Sharing notification:', notification);
      console.log('Notification data:', notification.data);
      
      // Format the notification for sharing based on its type
      if (notification.type === 'price_alert') {
        // For price alerts, use the specialized formatter
        const shareOptions = formatPriceAlertForSharing(notification.data);
        await shareNotification(shareOptions);
      } else {
        // For other notification types, just share the message
        await shareNotification({
          message: notification.message,
        });
      }
    } catch (error) {
      console.error('Error sharing notification:', error);
      Alert.alert('Error', 'Failed to share notification');
    }
  };

  const renderRightActions = (notification: Notification, dragX: Animated.AnimatedInterpolation<number>) => {
    // Using dragX to create a nice animation effect when swiping
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActions}>
        {/* Share button */}
        <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
          <TouchableOpacity
            style={styles.shareAction}
            onPress={() => handleShareNotification(notification)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Delete button */}
        <Animated.View style={[styles.actionButton, { transform: [{ scale }] }]}>
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => deleteNotification(notification.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string, isRead: boolean) => {
    switch (type) {
      case 'price_alert':
        return <Ionicons name="pricetag" size={24} color={!isRead ? "#4A90E2" : "#999"} />;
      case 'list_update':
        return <Ionicons name="list" size={24} color={!isRead ? "#4A90E2" : "#999"} />;
      case 'product_update':
        return <Ionicons name="basket" size={24} color={!isRead ? "#4A90E2" : "#999"} />;
      default:
        return <Ionicons name="notifications" size={24} color={!isRead ? "#4A90E2" : "#999"} />;
    }
  };

  // Format date to be more user friendly
  const formatDate = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    
    // If today, show time
    if (now.toDateString() === date.toDateString()) {
      return `Today at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (yesterday.toDateString() === date.toDateString()) {
      return "Yesterday";
    }
    
    // Otherwise show dd/mm/yyyy
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Alerts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton} 
            onPress={loadNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#4A90E2" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.alertsButton} 
            onPress={() => navigation.navigate('PriceAlerts')}
            activeOpacity={0.7}
          >
            <Ionicons name="pricetag" size={20} color="#4A90E2" />
            <Text style={styles.buttonText}>Manage Alerts</Text>
          </TouchableOpacity>
          
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllNotifications}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>No alerts yet</Text>
          <Text style={styles.emptySubtext}>
            Price drop alerts and other notifications will appear here
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => navigation.navigate('PriceAlerts')}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyButtonText}>Set Up Price Alerts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{flex: 1, opacity: fadeAnim}}>
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#4A90E2"]} />
            }
            renderItem={({ item, index }) => (
              <Animated.View 
                style={{
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }],
                  opacity: fadeAnim
                }}
              >
                <Swipeable
                  renderRightActions={(progress, dragX) => renderRightActions(item, dragX)}
                  rightThreshold={40}
                  friction={2}
                  overshootRight={false}
                  onSwipeableRightOpen={() => setSwipedId(item.id)}
                  onSwipeableClose={() => setSwipedId(null)}
                >
                  <View style={styles.notificationItemContainer}>
                    <TouchableOpacity
                      style={[
                        styles.notificationItem,
                        !item.seen && styles.unseenNotification,
                        !item.read && styles.unreadNotification,
                        index === 0 && styles.firstNotification,
                        index === notifications.length - 1 && styles.lastNotification
                      ]}
                      onPress={() => handleNotificationPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.iconContainer}>
                        {getNotificationIcon(item.type, item.read)}
                        {!item.read && <View style={styles.unreadDot} />}
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={[
                          styles.notificationMessage,
                          !item.read && styles.boldText
                        ]}>
                          {item.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.hintContainer}>
                        <Ionicons name="chevron-back" size={16} color="#999" />
                      </View>
                    </TouchableOpacity>

                    {/* Preview of action buttons - hidden when swiped */}
                    {swipedId !== item.id && (
                      <View style={styles.actionsPreview}>
                        <View style={styles.sharePreview} />
                        <View style={styles.deletePreview} />
                      </View>
                    )}
                  </View>
                </Swipeable>
              </Animated.View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#777',
    fontSize: 16,
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '70%',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30, // Extra padding at bottom for better UX
  },
  notificationItemContainer: {
    position: 'relative',
    flexDirection: 'row',
    marginBottom: 10,
    width: '100%',
  },
  notificationItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    width: '96%', // Take 96% of the container width
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  firstNotification: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  lastNotification: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  unseenNotification: {
    backgroundColor: '#e6f2ff',
    borderColor: '#c2dcff',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  boldText: {
    fontWeight: 'bold',
  },
  iconContainer: {
    marginRight: 16,
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: '#fff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  notificationTime: {
    fontSize: 12,
    color: '#888',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertsButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
    height: 36,
    ...Platform.select({
      ios: {
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  clearButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8E6',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  buttonText: {
    marginLeft: 4,
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButtonText: {
    marginLeft: 4,
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    width: 160,
    marginBottom: 10,
  },
  actionButton: {
    width: 80,
    justifyContent: 'center',
  },
  shareAction: {
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#4CD964',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 4,
    fontSize: 12,
  },
  hintContainer: {
    justifyContent: 'center',
    paddingLeft: 4,
  },
  actionsPreview: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '4%', // 4% total for both color indicators
    flexDirection: 'row', // Arrange horizontally
  },
  sharePreview: {
    backgroundColor: '#4CD964',
    flex: 1, // Takes 50% of the 4% (so 2%)
    height: '100%', // Full height
  },
  deletePreview: {
    backgroundColor: '#FF3B30',
    flex: 1, // Takes 50% of the 4% (so 2%)
    height: '100%', // Full height
  },
});

export default NotificationsScreen; 