import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback 
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext'; // Use auth context if needed for post-reset actions

// Define ParamList for type safety
type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { access_token?: string }; // Expect token from deep link
};

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const { user } = useAuth(); // Get user state to confirm auth after verifyOtp
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenVerified, setTokenVerified] = useState(false); // State to track if token was verified

  // This screen should ideally only be reached AFTER token verification via deep link
  // We re-check user state here as a safeguard
  useEffect(() => {
    // Check if the user object is available, implying successful OTP verification
    // Supabase auth state listener should update the user context
    if (user) {
      setTokenVerified(true);
    } else {
      // If no user, the token might not have been verified or the state update is pending/failed
      setError("Authentication session not found. Please try the password reset link again.");
      // Optionally navigate back or show a persistent error
      // navigation.navigate('Login'); 
    }
  }, [user]); // Re-run when user context changes

  const handlePasswordReset = async () => {
    if (!tokenVerified) {
      Alert.alert('Error', 'Password reset token not verified. Please use the link from your email again.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError(null);

    try {
      // Since token verification (verifyOtp) should have established a session,
      // we can now update the password for the authenticated user.
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      Alert.alert('Success', 'Your password has been updated successfully. Please log in with your new password.');
      // Navigate to Login screen after successful reset
      navigation.navigate('Login');

    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'An unexpected error occurred while resetting your password.');
      Alert.alert('Error', err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Set New Password</Text>
        
        {!tokenVerified && error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {tokenVerified && (
          <>
            <Text style={styles.subtitle}>Enter your new password below.</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handlePasswordReset} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Show loading indicator if verifying token initially or resetting */}
        {loading && !tokenVerified && (
           <View style={styles.loadingOverlay}>
             <ActivityIndicator size="large" color="#4A90E2"/>
             <Text style={styles.loadingText}>Verifying token...</Text>
           </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#a0c8f0',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
   loadingOverlay: {
     position: 'absolute',
     top: 0,
     left: 0,
     right: 0,
     bottom: 0,
     backgroundColor: 'rgba(255, 255, 255, 0.8)',
     justifyContent: 'center',
     alignItems: 'center',
   },
   loadingText: {
     marginTop: 10,
     fontSize: 16,
     color: '#4A90E2',
   },
});

export default ResetPasswordScreen; 