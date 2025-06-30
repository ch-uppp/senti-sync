import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Lightbulb, TrendingUp, Heart, CircleAlert as AlertCircle, ThumbsUp, ThumbsDown, CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { BoltAISuggestion } from '@/services/BoltAIService';
import { BoltSuggester } from '@/ai/BoltSuggester';

interface EnhancedSuggestionCardProps {
  suggestion: BoltAISuggestion;
  onDismiss?: (id: string) => void;
  onActionTaken?: (id: string, actionType: string) => void;
}

export function EnhancedSuggestionCard({ 
  suggestion, 
  onDismiss, 
  onActionTaken 
}: EnhancedSuggestionCardProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const getIcon = () => {
    switch (suggestion.type) {
      case 'mood_boost':
        return <Heart size={16} color={getIconColor()} />;
      case 'energy_management':
        return <TrendingUp size={16} color={getIconColor()} />;
      case 'pattern_insight':
        return <Lightbulb size={16} color={getIconColor()} />;
      case 'wellness_tip':
        return <CheckCircle size={16} color={getIconColor()} />;
      case 'behavioral_nudge':
        return <Clock size={16} color={getIconColor()} />;
      default:
        return <Lightbulb size={16} color={getIconColor()} />;
    }
  };

  const getIconColor = () => {
    switch (suggestion.priority) {
      case 'urgent':
        return '#DC2626';
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
      case 'urgent':
        return '#FEF2F2';
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
      case 'urgent':
        return '#FECACA';
      case 'high':
        return '#FECACA';
      case 'medium':
        return '#FED7AA';
      default:
        return '#DBEAFE';
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    setFeedbackGiven(true);
    await BoltSuggester.sendSuggestionFeedback(suggestion.id, helpful, actionTaken);
    
    // Fade out after feedback
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDismiss?.(suggestion.id);
      });
    }, 1500);
  };

  const handleActionPress = (action: any) => {
    setActionTaken(true);
    onActionTaken?.(suggestion.id, action.type);
    
    // You could implement specific action handling here
    switch (action.type) {
      case 'activity':
        // Navigate to activity or show activity modal
        console.log('Starting activity:', action.data);
        break;
      case 'reminder':
        // Set up a reminder
        console.log('Setting reminder:', action.data);
        break;
      case 'reflection':
        // Open reflection prompt
        console.log('Opening reflection:', action.data);
        break;
      case 'external_link':
        // Open external link
        console.log('Opening link:', action.data);
        break;
    }
  };

  const getTypeLabel = () => {
    switch (suggestion.type) {
      case 'mood_boost':
        return 'Mood Support';
      case 'energy_management':
        return 'Energy Management';
      case 'pattern_insight':
        return 'Pattern Insight';
      case 'wellness_tip':
        return 'Wellness Tip';
      case 'behavioral_nudge':
        return 'Gentle Nudge';
      default:
        return 'Insight';
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      { 
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
        opacity: fadeAnim,
      }
    ]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {getIcon()}
          <View style={styles.titleTextContainer}>
            <Text style={styles.title}>{suggestion.title}</Text>
            <Text style={styles.typeLabel}>{getTypeLabel()}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {suggestion.priority === 'urgent' && (
            <AlertCircle size={12} color="#DC2626" />
          )}
          <Text style={styles.confidence}>
            {Math.round(suggestion.confidence * 100)}%
          </Text>
        </View>
      </View>
      
      <Text style={styles.message}>{suggestion.message}</Text>
      
      {/* Context Information */}
      {suggestion.context && (
        <View style={styles.contextContainer}>
          <Text style={styles.contextText}>
            {suggestion.context.timeOfDay} • {suggestion.context.dayOfWeek}
            {suggestion.context.recentTrend && ` • ${suggestion.context.recentTrend} trend`}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {suggestion.actions && suggestion.actions.length > 0 && (
        <View style={styles.actionsContainer}>
          {suggestion.actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.actionButton,
                actionTaken && styles.actionButtonTaken
              ]}
              onPress={() => handleActionPress(action)}
              disabled={actionTaken}
            >
              <Text style={[
                styles.actionButtonText,
                actionTaken && styles.actionButtonTextTaken
              ]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {new Date(suggestion.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        
        {!feedbackGiven ? (
          <View style={styles.feedbackContainer}>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleFeedback(true)}
            >
              <ThumbsUp size={12} color="#10B981" />
              <Text style={styles.feedbackText}>Helpful</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleFeedback(false)}
            >
              <ThumbsDown size={12} color="#6B7280" />
              <Text style={styles.feedbackText}>Not helpful</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.thankYouText}>Thank you for your feedback!</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 1,
  },
  typeLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  confidence: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  message: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  contextContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  contextText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonTaken: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  actionButtonTextTaken: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  feedbackText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  thankYouText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    fontStyle: 'italic',
  },
});