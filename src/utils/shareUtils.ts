import { Share, Platform } from 'react-native';

interface ShareNotificationOptions {
  productName?: string;
  price?: string;
  store?: string;
  message: string;
  additionalText?: string;
}

/**
 * Shares notification content using the native share dialog
 * @param options Configuration for the share content
 * @returns Promise that resolves when sharing is complete
 */
export const shareNotification = async (options: ShareNotificationOptions) => {
  try {
    // Build a nicely formatted message
    let shareMessage = options.message;
    
    // Add product, price and store info if available
    if (options.productName && options.price && options.store) {
      shareMessage = `Price Alert: ${options.productName} is now at ${options.price} at ${options.store}`;
    }
    
    // Add app link or additional text
    if (options.additionalText) {
      shareMessage += `\n\n${options.additionalText}`;
    } else {
      // Default app promo message
      shareMessage += `\n\nShared from PriceMon - Track prices and save money`;
    }
    
    // Add app link based on platform
    const appLink = Platform.select({
      ios: 'https://apps.apple.com/app/pricemon/id123456789', // Replace with actual App Store link
      android: 'https://play.google.com/store/apps/details?id=com.pricemon', // Replace with actual Play Store link
      default: 'https://pricemon.app', // Replace with your website
    });
    
    shareMessage += `\n${appLink}`;
    
    // Open native share dialog
    const result = await Share.share({
      message: shareMessage,
      // iOS allows separate title and URL
      title: 'Price Alert from PriceMon',
      url: appLink, // Only used on iOS
    });
    
    if (result.action === Share.sharedAction) {
      return true;
    } else if (result.action === Share.dismissedAction) {
      // Share was dismissed
      return false;
    }
    return false;
  } catch (error) {
    console.error('Error sharing notification:', error);
    return false;
  }
};

/**
 * Formats price alert data for sharing
 * @param notificationData The notification data object
 * @returns Formatted share options
 */
export const formatPriceAlertForSharing = (notificationData: any): ShareNotificationOptions => {
  // Log the received data to debug
  console.log('Notification data for sharing:', notificationData);
  
  // Extract data from the notification
  // The data might be nested inside a data property or at the root level
  const data = notificationData?.data || notificationData;
  
  const productName = data?.product_name || 'Product';
  const price = data?.price ? `$${data.price}` : 'a new price';
  
  // Check multiple possible fields for store name
  const store = data?.store_name || data?.store || 'a store';
  
  console.log(`Extracted values - Product: ${productName}, Price: ${price}, Store: ${store}`);
  
  return {
    productName,
    price,
    store,
    message: `Price Alert: ${productName} is now at ${price} at ${store}`,
    additionalText: 'Check it out in PriceMon!'
  };
};

/**
 * Shares generic content using the native share dialog
 * @param message The message to share
 * @param title Optional title for the share dialog (iOS only)
 * @returns Promise that resolves when sharing is complete
 */
export const shareContent = async (message: string, title?: string) => {
  try {
    const result = await Share.share({
      message,
      title: title || 'Shared from PriceMon',
    });
    
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Error sharing content:', error);
    return false;
  }
}; 