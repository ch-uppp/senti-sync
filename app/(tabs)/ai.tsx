import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, RefreshCw, Lightbulb, TrendingUp, Sparkles } from 'lucide-react-native';

import { EnhancedSuggestionCard } from '@/components/EnhancedSuggestionCard';
import { BoltSuggester } from '@/ai/BoltSuggester';
import { BoltAISuggestion } from '@/services/BoltAIService';
import { PatternPredictor } from '@/prediction/PatternPredictor';
import { LocalStateManager } from '@/storage/LocalStateManager';

export default function AIScreen() {
  const [suggestions, setSuggestions] = useState<BoltAISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<{
    totalEntries: number;
    streakDays: number;
    topInsight: string;
    aiConfidence: number;
  }>({
    totalEntries: 0,
    streakDays: 0,
    topInsight: 'Start tracking to get personalized insights',
    aiConfidence: 0,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadAIData();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAIData = async () => {
    try {
      if (!mountedRef.current) return;
      setIsLoading(true);
      
      // Load basic insights
      const entries = await LocalStateManager.getEntries();
      const todayEntries = await LocalStateManager.getTodaysEntries();
      const energyDips = await PatternPredictor.findEnergyDips();
      
      // Calculate streak
      const streak = calculateStreak(entries);
      
      // Generate AI-powered suggestions
      const aiSuggestions = await BoltSuggester.generateMultipleSuggestions(5);
      
      // Calculate average AI confidence
      const avgConfidence = aiSuggestions.length > 0 
        ? aiSuggestions.reduce((sum, s) => sum + s.confidence, 0) / aiSuggestions.length
        : 0;
      
      if (!mountedRef.current) return;
      
      setSuggestions(aiSuggestions);
      setInsights({
        totalEntries: entries.length,
        streakDays: streak,
        topInsight: getTopInsight(entries, energyDips, aiSuggestions),
        aiConfidence: Math.round(avgConfidence * 100),
      });
      
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  };

  const calculateStreak = (entries: any[]) => {
    if (entries.length === 0) return 0;
    
    const sortedEntries = entries.sort((a, b) => b.timestamp - a.timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const dayEntries = sortedEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === currentDate.getTime();
      });
      
      if (dayEntries.length > 0) {
        streak++;
      } else if (streak > 0) {
        break; // Streak broken
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };

  const getTopInsight = (entries: any[], energyDips: any[], aiSuggestions: BoltAISuggestion[]) => {
    if (entries.length === 0) return 'Start tracking to discover your patterns';
    
    // Prioritize high-confidence AI insights
    const highConfidenceInsights = aiSuggestions.filter(s => s.confidence > 0.8 && s.type === 'pattern_insight');
    if (highConfidenceInsights.length > 0) {
      return highConfidenceInsights[0].message.substring(0, 50) + '...';
    }
    
    if (energyDips.length > 0) {
      return `AI detected energy dip pattern at ${energyDips[0].time}`;
    }
    
    if (entries.length >= 7) {
      const avgMood = entries.reduce((sum: number, e: any) => sum + e.mood, 0) / entries.length;
      if (avgMood > 70) return 'AI analysis shows positive mood patterns';
      if (avgMood < 40) return 'AI suggests focusing on mood-boosting activities';
    }
    
    return `AI is learning from ${entries.length} data points`;
  };

  const onRefresh = () => {
    if (!mountedRef.current) return;
    setRefreshing(true);
    loadAIData();
  };

  const dismissSuggestion = (id: string) => {
    if (!mountedRef.current) return;
    setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  const handleActionTaken = (id: string, actionType: string) => {
    console.log(`Action taken on suggestion ${id}: ${actionType}`);
    // You could track this for analytics or update the suggestion state
  };

  const generateNewSuggestions = async () => {
    try {
      if (!mountedRef.current) return;
      setIsLoading(true);
      const newSuggestions = await BoltSuggester.generateMultipleSuggestions(3);
      if (!mountedRef.current) return;
      setSuggestions(prev => [...newSuggestions, ...prev.slice(0, 2)]); // Keep max 5 suggestions
    } catch (error) {
      console.error('Error generating new suggestions:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Brain size={28} color="#3B82F6" />
            <View>
              <Text style={styles.title}>AI Coach</Text>
              <Text style={styles.subtitle}>Powered by Bolt AI • Personalized insights</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={generateNewSuggestions}
            disabled={isLoading}
          >
            <Sparkles size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Enhanced Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.totalEntries}</Text>
            <Text style={styles.statLabel}>Data Points</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: insights.aiConfidence > 70 ? '#10B981' : '#F59E0B' }]}>
              {insights.aiConfidence}%
            </Text>
            <Text style={styles.statLabel}>AI Confidence</Text>
          </View>
          
          <View style={[styles.statCard, styles.statCardWide]}>
            <Lightbulb size={14} color="#F59E0B" />
            <Text style={styles.topInsight}>{insights.topInsight}</Text>
          </View>
        </View>

        {/* AI Suggestions */}
        <View style={styles.suggestionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI-Powered Suggestions</Text>
            <Text style={styles.sectionSubtitle}>
              {suggestions.length} active suggestion{suggestions.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {isLoading && suggestions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <Brain size={28} color="#9CA3AF" />
              <Text style={styles.loadingText}>AI is analyzing your patterns...</Text>
              <Text style={styles.loadingSubtext}>This may take a moment</Text>
            </View>
          ) : suggestions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Lightbulb size={40} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No AI suggestions yet</Text>
              <Text style={styles.emptyText}>Keep tracking to get personalized AI insights</Text>
              
              <TouchableOpacity 
                style={styles.generateButton}
                onPress={generateNewSuggestions}
                disabled={isLoading}
              >
                <Brain size={14} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generate AI Insights</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Priority indicator */}
              {suggestions.some(s => s.priority === 'urgent' || s.priority === 'high') && (
                <View style={styles.priorityIndicator}>
                  <Text style={styles.priorityText}>
                    {suggestions.filter(s => s.priority === 'urgent' || s.priority === 'high').length} high-priority insights
                  </Text>
                </View>
              )}

              {suggestions
                .sort((a, b) => {
                  const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
                  return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                         (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
                })
                .map((suggestion) => (
                  <EnhancedSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onDismiss={dismissSuggestion}
                    onActionTaken={handleActionTaken}
                  />
                ))}
            </>
          )}
        </View>

        {/* How AI Works */}
        <View style={styles.howItWorksContainer}>
          <Text style={styles.sectionTitle}>How Bolt AI Works</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <TrendingUp size={18} color="#3B82F6" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Advanced Pattern Recognition</Text>
                <Text style={styles.featureDescription}>
                  Analyzes your mood and energy patterns using machine learning to identify trends and correlations
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Brain size={18} color="#8B5CF6" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Contextual Intelligence</Text>
                <Text style={styles.featureDescription}>
                  Considers time of day, day of week, and recent trends to provide relevant, timely suggestions
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Lightbulb size={18} color="#F59E0B" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Personalized Recommendations</Text>
                <Text style={styles.featureDescription}>
                  Learns from your feedback to improve suggestion quality and relevance over time
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Sparkles size={18} color="#10B981" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Emotional Awareness</Text>
                <Text style={styles.featureDescription}>
                  Provides emotionally intelligent responses that adapt to your current state and needs
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  refreshButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardWide: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    minWidth: 140,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  topInsight: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  priorityIndicator: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  priorityText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 10,
  },
  loadingSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  howItWorksContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featuresList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 16,
  },
  bottomSpacing: {
    height: 16,
  },
});