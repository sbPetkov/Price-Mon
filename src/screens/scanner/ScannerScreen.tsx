import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { LinearGradient } from 'expo-linear-gradient';

type ScannerScreenProps = NativeStackScreenProps<any, 'ScannerScreen'>;

const { width } = Dimensions.get('window');
const scanAreaSize = width * 0.7;

const ScannerScreen = ({ navigation }: ScannerScreenProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [facing, setFacing] = useState('back');
  const [modalVisible, setModalVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  
  // Animation for scan line
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start the scanning animation
    animateScanLine();
    
    // Request camera permissions on mount if not already granted
    if (!permission?.granted) {
      requestPermission();
    }
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

  const toggleFlash = () => {
    setFlashMode(prevMode => prevMode === 'off' ? 'torch' : 'off');
  };

  const toggleCamera = () => {
    setFacing(prevFacing => prevFacing === 'back' ? 'front' : 'back');
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    // Play a success sound or haptic feedback here
    
    try {
      // Check if product exists
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', data)
        .limit(1);

      if (error) throw error;

      if (products && products.length > 0) {
        // Product exists, navigate to product details
        navigation.navigate('ProductDetails', {
          productId: products[0].id,
          barcode: data,
        });
      } else {
        // Product doesn't exist, navigate to add product
        navigation.navigate('AddProduct', { barcode: data });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process barcode');
      console.error(error);
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  const handleManualSubmit = async () => {
    if (manualBarcode.length < 8) {
      Alert.alert('Error', 'Please enter a valid barcode (minimum 8 digits)');
      return;
    }

    setModalVisible(false);
    setLoading(true);

    try {
      // Check if product exists
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', manualBarcode)
        .limit(1);

      if (error) throw error;

      if (products && products.length > 0) {
        // Product exists, navigate to product details
        navigation.navigate('ProductDetails', {
          productId: products[0].id,
          barcode: manualBarcode,
        });
      } else {
        // Product doesn't exist, navigate to add product
        navigation.navigate('AddProduct', { barcode: manualBarcode });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process barcode');
      console.error(error);
    } finally {
      setLoading(false);
      setManualBarcode('');
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Ionicons name="camera-outline" size={80} color="#fff" style={{ marginBottom: 20 }} />
        <Text style={styles.permissionText}>Camera Access Required</Text>
        <Text style={styles.permissionSubtext}>
          This app needs camera access to scan barcodes and help you track prices
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
      </View>
      
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          flashMode={flashMode}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_e', 'upc_a', 'qr'],
            interval: 1000
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
          
          <View style={styles.overlay}>
            {/* Scan area with corners */}
            <View style={styles.scanAreaContainer}>
              <View style={styles.scanArea}>
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
            </View>
            
            <Text style={styles.overlayText}>
              Position barcode within the frame
            </Text>
          </View>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Processing barcode...</Text>
            </View>
          )}
        </CameraView>
      </View>
      
      <View style={styles.controls}>
        {/* Camera controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons 
              name={flashMode === 'torch' ? "flash" : "flash-off"} 
              size={24} 
              color="white" 
            />
            <Text style={styles.controlText}>Flash</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <Ionicons name="camera-reverse-outline" size={24} color="white" />
            <Text style={styles.controlText}>Flip</Text>
          </TouchableOpacity>
        </View>

        {/* Manual entry button */}
        <TouchableOpacity 
          style={styles.manualButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="keypad-outline" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.manualButtonText}>Enter Barcode Manually</Text>
        </TouchableOpacity>

        {/* Scan again button */}
        {scanned && !loading && (
          <TouchableOpacity 
            style={styles.scanAgainButton}
            onPress={() => setScanned(false)}
          >
            <Ionicons name="scan-outline" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.manualButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Manual barcode entry modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Barcode</Text>
            <TextInput
              style={styles.input}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Enter barcode number"
              keyboardType="number-pad"
              maxLength={13}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setManualBarcode('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleManualSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 20,
    marginHorizontal: 12,
    marginVertical: 10,
  },
  camera: {
    flex: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  scanAreaContainer: {
    width: scanAreaSize,
    height: scanAreaSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
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
  overlayText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    overflow: 'hidden',
    width: scanAreaSize,
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
  },
  controlText: {
    color: 'white',
    marginTop: 5,
    fontSize: 12,
  },
  manualButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  scanAgainButton: {
    flexDirection: 'row',
    backgroundColor: '#22AA22',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonIcon: {
    marginRight: 8,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubtext: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    zIndex: 5,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScannerScreen;