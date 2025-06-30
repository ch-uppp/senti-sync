import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuthForm } from '@/components/AuthForm';

export default function AuthScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Sign up:', { email, password });
      
      // Navigate to main app after successful sign up
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Log in:', { email, password });
      
      // Navigate to main app after successful login
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Log in error:', error);
      Alert.alert('Error', 'Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      // Simulate Apple Sign In
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Apple Sign In');
      
      // Navigate to main app after successful Apple sign in
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Apple Sign In error:', error);
      Alert.alert('Error', 'Apple Sign In failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      // Simulate Facebook Sign In
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Facebook Sign In');
      
      // Navigate to main app after successful Facebook sign in
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Facebook Sign In error:', error);
      Alert.alert('Error', 'Facebook Sign In failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AuthForm
          onSignUp={handleSignUp}
          onLogIn={handleLogIn}
          onAppleSignIn={handleAppleSignIn}
          onFacebookSignIn={handleFacebookSignIn}
          isLoading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
});