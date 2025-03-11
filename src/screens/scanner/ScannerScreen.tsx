import React, { useState } from 'react';
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
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';

type ScannerScreenProps = NativeStackScreenProps<any, 'ScannerScreen'>;

const ScannerScreen = ({ navigation }: ScannerScreenProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [facing, setFacing] = useState('back');
  const [modalVisible, setModalVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'torch' : 'off');
  };

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    setLoading(true);

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
      <View style={styles.container}>
        <Text>We need your permission to use the camera</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        flashMode={flashMode}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_e', 'qr'],
          interval: 1000
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.overlayText}>
            Position barcode within the frame
          </Text>
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Processing barcode...</Text>
          </View>
        )}
        
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons 
              name={flashMode === 'torch' ? 'flash' : 'flash-off'} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.manualButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.manualButtonText}>Enter Barcode Manually</Text>
          </TouchableOpacity>

          {scanned && !loading && (
            <TouchableOpacity 
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.manualButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
    marginTop: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlButton: {
    padding: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginBottom: 20,
  },
  manualButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  scanAgainButton: {
    backgroundColor: '#22AA22',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  manualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
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
  },
  loadingText: {
    color: 'white',
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
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
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
  },
  cancelButton: {
    backgroundColor: '#f8f8f8',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScannerScreen;