import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { decodeListShareCode, joinSharedList } from '../../utils/listSharingUtils';
import { LinearGradient } from 'expo-linear-gradient';

// Define the barcode scanning result type
interface BarcodeScanningResult {
  data: string;
  type?: string;
  bounds?: {
    origin: {
      x: number;
      y: number;
    };
    size: {
      width: number;
      height: number;
    };
  };
}

const { width } = Dimensions.get('window');
const scanAreaSize = width * 0.7;

const ScanToJoinScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanInstructions, setScanInstructions] = useState('Scan a list QR code to join');
  const [flashMode, setFlashMode] = useState('off');
  const [facing, setFacing] = useState('back');
  
  // Animation for scan line
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start the scanning animation
    animateScanLine();
  }, []);
  
  const animateScanLine = () => {
    scanLineAnimation.setValue(0);
    Animated.loop(
      Animated.timing(scanLineAnimation, {
        toValue: scanAreaSize,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();
  };

  const toggleCamera = () => {
    setFacing(prevFacing => prevFacing === 'back' ? 'front' : 'back');
  };

  const toggleFlash = () => {
    setFlashMode(prevMode => prevMode === 'off' ? 'torch' : 'off');
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    try {
      if (scanned || processing) return;
      setScanned(true);
      setProcessing(true);
      setScanInstructions('Processing...');

      // Try to decode the QR code data
      const shareData = decodeListShareCode(data);
      
      if (!shareData) {
        Alert.alert('Invalid QR Code', 'This doesn\'t appear to be a valid shopping list QR code.');
        setProcessing(false);
        setScanInstructions('Try scanning again');
        setTimeout(() => {
          setScanned(false);
        }, 2000);
        return;
      }

      // Join the list
      if (!user) {
        Alert.alert('Error', 'You must be logged in to join a list.');
        setProcessing(false);
        setScanInstructions('Try scanning again');
        setTimeout(() => {
          setScanned(false);
        }, 2000);
        return;
      }
      
      const success = await joinSharedList(user.id, shareData);
      
      if (success) {
        Alert.alert(
          'Success',
          'You have joined the shopping list!',
          [
            {
              text: 'View List',
              onPress: () => {
                // Navigate to the list details screen
                navigation.navigate('ListDetails' as never, { listId: shareData.listId } as never);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to join the shopping list. Please try again.');
        setProcessing(false);
        setScanInstructions('Try scanning again');
        setTimeout(() => {
          setScanned(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      Alert.alert('Error', 'An error occurred while processing the QR code.');
      setProcessing(false);
      setScanInstructions('Try scanning again');
      setTimeout(() => {
        setScanned(false);
      }, 2000);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#FF3B30" />
          <Text style={styles.permissionText}>Camera permission not granted</Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        flashMode={flashMode}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"]
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Gradient overlays to create the faded effect */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.gradientTop}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradientBottom}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.7)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradientHorizontal}
        />

        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={processing}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Scan to Join</Text>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              {/* Corner indicators */}
              <View style={[styles.cornerTL, styles.corner]} />
              <View style={[styles.cornerTR, styles.corner]} />
              <View style={[styles.cornerBL, styles.corner]} />
              <View style={[styles.cornerBR, styles.corner]} />
              
              {/* Animated scan line */}
              <Animated.View 
                style={[
                  styles.scanLine, 
                  { 
                    transform: [{ translateY: scanLineAnimation }]
                  }
                ]} 
              />
            </View>
            {processing ? (
              <ActivityIndicator size="large" color="#4A90E2" style={styles.processingIndicator} />
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.instructions}>{scanInstructions}</Text>
            
            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={toggleFlash}
                disabled={processing}
              >
                <Ionicons 
                  name={flashMode === 'torch' ? "flash" : "flash-off"} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.controlText}>Flash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={toggleCamera}
                disabled={processing}
              >
                <Ionicons name="camera-reverse-outline" size={24} color="white" />
                <Text style={styles.controlText}>Flip</Text>
              </TouchableOpacity>
              
              {scanned && !processing && (
                <TouchableOpacity 
                  style={styles.rescanButton}
                  onPress={() => setScanned(false)}
                >
                  <Text style={styles.rescanButtonText}>Scan Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#333',
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gradientTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
    zIndex: 2,
  },
  gradientBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    zIndex: 2,
  },
  gradientHorizontal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: scanAreaSize,
    height: scanAreaSize,
    borderRadius: 12,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#4A90E2',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(74, 144, 226, 0.7)',
    top: 0,
  },
  processingIndicator: {
    position: 'absolute',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
  },
  controlText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  rescanButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginLeft: 16,
  },
  rescanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ScanToJoinScreen; 