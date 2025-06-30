import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Save, TrendingUp, TrendingDown, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { InteractiveGraphTracker } from '@/components/InteractiveGraphTracker';
import { MoodEnergyDisplayCard } from '@/components/MoodEnergyDisplayCard';
import { SuggestionCard } from '@/components/SuggestionCard';
import { MoodEnergyEntry } from '@/models/MoodEnergyEntry';
import { LocalStateManager } from '@/storage/LocalStateManager';
import { BoltSuggester } from '@/ai/BoltSuggester';
import { PatternPredictor } from '@/prediction/PatternPredictor';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

export default function TrackScreen() {
  const [mood, setMood] = useState(50);
  const [energy, setEnergy] = useState(50);
  const [entries, setEntries] = useState<MoodEnergyEntry[]>([]);
  const [todayEntries, setTodayEntries] = useState<MoodEnergyEntry[]>([]);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadData = async () => {
    try {
      const allEntries = await LocalStateManager.getEntries();
      const today = await LocalStateManager.getTodaysEntries();
      const lastEntry = await LocalStateManager.getLastEntry();
      const dailySuggestion = await BoltSuggester.generateDailySuggestion();
      
      // Load predictions for insights
      const predictionData = await PatternPredictor.generatePredictions(12);

      if (!mountedRef.current) return;

      setEntries(allEntries.slice(-50)); // Show last 50 entries for performance
      setTodayEntries(today);
      setSuggestion(dailySuggestion);
      setPredictions(predictionData);

      if (lastEntry) {
        setMood(lastEntry.mood);
        setEnergy(lastEntry.energy);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleDataChange = (newMood: number, newEnergy: number) => {
    if (!mountedRef.current) return;
    setMood(newMood);
    setEnergy(newEnergy);
    setHasUnsavedChanges(true);
  };

  const saveEntry = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const entry: MoodEnergyEntry = {
        id: `${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        mood,
        energy,
      };

      await LocalStateManager.saveEntry(entry);
      
      if (!mountedRef.current) return;
      
      setHasUnsavedChanges(false);
      await loadData();

      // Update patterns in background
      PatternPredictor.analyzeDailyPatterns();
      PatternPredictor.analyzeWeeklyPatterns();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const getGradientColors = () => {
    const moodColor = mood > 70 ? '#10B981' : mood > 40 ? '#F59E0B' : '#EF4444';
    const energyColor = energy > 70 ? '#3B82F6' : energy > 40 ? '#8B5CF6' : '#6B7280';
    
    return [
      `${moodColor}15`,
      `${energyColor}15`,
      '#FFFFFF',
    ];
  };

  const getInsightText = () => {
    // Find next predicted dip or peak
    const now = Date.now();
    const upcomingPredictions = predictions.filter(p => p.timestamp > now);
    
    if (upcomingPredictions.length === 0) {
      if (todayEntries.length === 0) {
        return "Start tracking to see predictions about your energy and mood patterns";
      }
      return `${todayEntries.length} entries tracked today`;
    }

    // Find the most significant upcoming change
    let nextSignificantEvent = null;
    let eventType = '';
    
    for (const prediction of upcomingPredictions.slice(0, 6)) { // Check next 6 hours
      const timeDiff = prediction.timestamp - now;
      const hours = Math.round(timeDiff / (1000 * 60 * 60));
      
      // Check for energy dip (below 30)
      if (prediction.predictedEnergy < 30 && !nextSignificantEvent) {
        nextSignificantEvent = { ...prediction, hours };
        eventType = 'energy_dip';
        break;
      }
      
      // Check for mood dip (below 35)
      if (prediction.predictedMood < 35 && !nextSignificantEvent) {
        nextSignificantEvent = { ...prediction, hours };
        eventType = 'mood_dip';
        break;
      }
      
      // Check for energy peak (above 75)
      if (prediction.predictedEnergy > 75 && !nextSignificantEvent) {
        nextSignificantEvent = { ...prediction, hours };
        eventType = 'energy_peak';
        break;
      }
      
      // Check for mood peak (above 75)
      if (prediction.predictedMood > 75 && !nextSignificantEvent) {
        nextSignificantEvent = { ...prediction, hours };
        eventType = 'mood_peak';
        break;
      }
    }

    if (nextSignificantEvent) {
      const timeText = nextSignificantEvent.hours === 1 ? '1 hour' : `${nextSignificantEvent.hours} hours`;
      
      switch (eventType) {
        case 'energy_dip':
          return `Energy dip predicted in ${timeText} (${nextSignificantEvent.predictedEnergy})`;
        case 'mood_dip':
          return `Mood dip predicted in ${timeText} (${nextSignificantEvent.predictedMood})`;
        case 'energy_peak':
          return `Energy peak predicted in ${timeText} (${nextSignificantEvent.predictedEnergy})`;
        case 'mood_peak':
          return `Mood peak predicted in ${timeText} (${nextSignificantEvent.predictedMood})`;
      }
    }

    // Fallback to general trend
    if (todayEntries.length > 0) {
      const avgMood = todayEntries.reduce((sum, e) => sum + e.mood, 0) / todayEntries.length;
      const avgEnergy = todayEntries.reduce((sum, e) => sum + e.energy, 0) / todayEntries.length;
      
      if (avgMood > 70 && avgEnergy > 70) {
        return "You're having a great day! Keep up the positive momentum.";
      } else if (avgMood < 40 || avgEnergy < 40) {
        return "Consider taking a break or doing something you enjoy";
      }
    }
    
    return `${todayEntries.length} entries tracked today`;
  };

  const getInsightIcon = () => {
    const now = Date.now();
    const upcomingPredictions = predictions.filter(p => p.timestamp > now);
    
    if (upcomingPredictions.length === 0) {
      return <TrendingUp size={18} color="#3B82F6" />;
    }

    // Check for upcoming dips or peaks
    for (const prediction of upcomingPredictions.slice(0, 6)) {
      if (prediction.predictedEnergy < 30 || prediction.predictedMood < 35) {
        return <TrendingDown size={18} color="#EF4444" />;
      }
      if (prediction.predictedEnergy > 75 || prediction.predictedMood > 75) {
        return <TrendingUp size={18} color="#10B981" />;
      }
    }

    return <Clock size={18} color="#3B82F6" />;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={getGradientColors()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>How are you feeling?</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {/* Interactive Graph Tracker */}
          <View style={styles.trackerContainer}>
            <InteractiveGraphTracker
              entries={entries}
              onDataChange={handleDataChange}
              currentMood={mood}
              currentEnergy={energy}
              width={screenWidth - 32}
              height={200}
            />
          </View>

          {/* Current Mood and Energy Display Card */}
          <View style={styles.displayCardContainer}>
            <MoodEnergyDisplayCard 
              currentMood={mood} 
              currentEnergy={energy} 
            />
          </View>

          {/* Save Button - Now positioned between mood card and insights */}
          <View style={styles.saveButtonContainer}>
            <TouchableOpacity 
              style={[
                styles.saveButton,
                hasUnsavedChanges && styles.saveButtonActive
              ]} 
              onPress={saveEntry}
              disabled={!hasUnsavedChanges}
            >
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {hasUnsavedChanges ? 'Save Entry' : 'Saved'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Insights - Renamed from "Today's Insight" and focused on predictions */}
          <View style={styles.insightContainer}>
            <View style={styles.insightHeader}>
              {getInsightIcon()}
              <Text style={styles.insightTitle}>Insights</Text>
            </View>
            <Text style={styles.insightText}>{getInsightText()}</Text>
            
            {todayEntries.length > 0 && (
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Entries</Text>
                  <Text style={styles.summaryValue}>{todayEntries.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Avg Mood</Text>
                  <Text style={styles.summaryValue}>
                    {Math.round(
                      todayEntries.reduce((sum, e) => sum + e.mood, 0) / todayEntries.length
                    )}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Avg Energy</Text>
                  <Text style={styles.summaryValue}>
                    {Math.round(
                      todayEntries.reduce((sum, e) => sum + e.energy, 0) / todayEntries.length
                    )}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* AI Suggestion */}
          {suggestion && (
            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>AI Insight</Text>
              <SuggestionCard
                suggestion={suggestion}
                onDismiss={() => {
                  if (mountedRef.current) {
                    setSuggestion(null);
                  }
                }}
              />
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  trackerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  displayCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 20, // Added 20px spacing before Insights
  },
  saveButton: {
    backgroundColor: '#9CA3AF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  insightContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
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
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
  },
  suggestionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  suggestionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
});