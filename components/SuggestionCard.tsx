import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lightbulb, TrendingUp, Heart, CircleAlert as AlertCircle } from 'lucide-react-native';

interface Suggestion {
  id: string;
  type: 'mood' | 'energy' | 'general';
  title: string;
  message: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onDismiss?: (id: string) => void;
}

export function SuggestionCard({ suggestion, onDismiss }: SuggestionCardProps) {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'mood':
        return <Heart size={16} color={getIconColor()} />;
      case 'energy':
        return <TrendingUp size={16} color={getIconColor()} />;
      default:
        return <Lightbulb size={16} color={getIconColor()} />;
    }
  };

  const getIconColor = () => {
    switch (suggestion.priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      default:
        return '#3B82F6';
    }
  };

  const getBackgroundColor = () => {
    switch (suggestion.priority) {
      case 'high':
        return '#FEF2F2';
      case 'medium':
        return '#FFFBEB';
      default:
        return '#EFF6FF';
    }
  };

  const getBorderColor = () => {
    switch (suggestion.priority) {
      case 'high':
        return '#FECACA';
      case 'medium':
        return '#FED7AA';
      default:
        return '#DBEAFE';
    }
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
      }
    ]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {getIcon()}
          <Text style={styles.title}>{suggestion.title}</Text>
        </View>
        {suggestion.priority === 'high' && (
          <AlertCircle size={12} color="#EF4444" />
        )}
      </View>
      
      <Text style={styles.message}>{suggestion.message}</Text>
      
      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {new Date(suggestion.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => onDismiss(suggestion.id)}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    flex: 1,
  },
  message: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  dismissText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});