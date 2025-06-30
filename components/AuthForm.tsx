import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Mail, Lock, Apple, Facebook, Eye, EyeOff } from 'lucide-react-native';

interface AuthFormProps {
  onSignUp: (email: string, password: string) => void;
  onLogIn: (email: string, password: string) => void;
  onAppleSignIn?: () => void;
  onFacebookSignIn?: () => void;
  isLoading?: boolean;
}

export function AuthForm({ 
  onSignUp, 
  onLogIn, 
  onAppleSignIn, 
  onFacebookSignIn,
  isLoading = false 
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (touched.email) {
      setErrors(prev => ({
        ...prev,
        email: validateEmail(text) ? undefined : 'Please enter a valid email address'
      }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (touched.password) {
      setErrors(prev => ({
        ...prev,
        password: validatePassword(text) ? undefined : 'Password must be at least 6 characters'
      }));
    }
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({
      ...prev,
      email: validateEmail(email) ? undefined : 'Please enter a valid email address'
    }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({
      ...prev,
      password: validatePassword(password) ? undefined : 'Password must be at least 6 characters'
    }));
  };

  const handleSubmit = () => {
    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(password);

    setTouched({ email: true, password: true });
    setErrors({
      email: emailValid ? undefined : 'Please enter a valid email address',
      password: passwordValid ? undefined : 'Password must be at least 6 characters'
    });

    if (emailValid && passwordValid) {
      if (isSignUp) {
        onSignUp(email, password);
      } else {
        onLogIn(email, password);
      }
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setTouched({});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignUp 
            ? 'Sign up to start tracking your wellness journey' 
            : 'Sign in to continue your wellness journey'
          }
        </Text>
      </View>

      {/* Social Login Buttons */}
      <View style={styles.socialContainer}>
        {Platform.OS === 'ios' && onAppleSignIn && (
          <TouchableOpacity 
            style={[styles.socialButton, styles.appleButton]}
            onPress={onAppleSignIn}
            disabled={isLoading}
          >
            <Apple size={20} color="#FFFFFF" />
            <Text style={styles.socialButtonTextWhite}>
              {isSignUp ? 'Sign up with Apple' : 'Sign in with Apple'}
            </Text>
          </TouchableOpacity>
        )}
        
        {onFacebookSignIn && (
          <TouchableOpacity 
            style={[styles.socialButton, styles.facebookButton]}
            onPress={onFacebookSignIn}
            disabled={isLoading}
          >
            <Facebook size={20} color="#FFFFFF" />
            <Text style={styles.socialButtonTextWhite}>
              {isSignUp ? 'Sign up with Facebook' : 'Sign in with Facebook'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Divider */}
      {(onAppleSignIn || onFacebookSignIn) && (
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <View style={[
          styles.inputWrapper,
          errors.email && touched.email && styles.inputWrapperError
        ]}>
          <Mail size={20} color={errors.email && touched.email ? '#EF4444' : '#6B7280'} />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={handleEmailChange}
            onBlur={handleEmailBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>
        {errors.email && touched.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <View style={[
          styles.inputWrapper,
          errors.password && touched.password && styles.inputWrapperError
        ]}>
          <Lock size={20} color={errors.password && touched.password ? '#EF4444' : '#6B7280'} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={handlePasswordChange}
            onBlur={handlePasswordBlur}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff size={20} color="#6B7280" />
            ) : (
              <Eye size={20} color="#6B7280" />
            )}
          </TouchableOpacity>
        </View>
        {errors.password && touched.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isLoading && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.submitButtonText}>
          {isLoading 
            ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
            : (isSignUp ? 'Create Account' : 'Sign In')
          }
        </Text>
      </TouchableOpacity>

      {/* Toggle Mode */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleText}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        </Text>
        <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
          <Text style={styles.toggleButton}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Terms and Privacy */}
      {isSignUp && (
        <Text style={styles.termsText}>
          By creating an account, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  socialContainer: {
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonTextWhite: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  toggleButton: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#3B82F6',
    fontFamily: 'Inter-SemiBold',
  },
});