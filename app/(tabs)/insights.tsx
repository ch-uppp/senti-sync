import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, ChartBar as BarChart3, Clock } from 'lucide-react-native';

import { GraphView } from '@/components/GraphView';
import { MoodEnergyEntry, DailyPattern, WeeklyPattern, PredictionData } from '@/models/MoodEnergyEntry';
import { LocalStateManager } from '@/storage/LocalStateManager';
import { PatternPredictor } from '@/prediction/PatternPredictor';

const { width } = Dimensions.get('window');

export default function InsightsScreen() {
  const [entries, setEntries] = useState<MoodEnergyEntry[]>([]);
  const [dailyPatterns, setDailyPatterns] = useState<DailyPattern[]>([]);
  const [weeklyPatterns, setWeeklyPatterns] = useState<WeeklyPattern[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [selectedTimeframe]);

  const loadInsights = async () => {
    try {
      setIsLoading(true);
      
      // Load entries based on timeframe
      let timeframeEntries: MoodEnergyEntry[];
      const now = Date.now();
      
      switch (selectedTimeframe) {
        case 'week':
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          timeframeEntries = await LocalStateManager.getEntriesInRange(weekAgo, now);
          break;
        case 'month':
          const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
          timeframeEntries = await LocalStateManager.getEntriesInRange(monthAgo, now);
          break;
        default:
          timeframeEntries = await LocalStateManager.getEntries();
      }

      // Load patterns and predictions
      const daily = await PatternPredictor.analyzeDailyPatterns();
      const weekly = await PatternPredictor.analyzeWeeklyPatterns();
      const pred = await PatternPredictor.generatePredictions(12);

      setEntries(timeframeEntries);
      setDailyPatterns(daily);
      setWeeklyPatterns(weekly);
      setPredictions(pred);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAverages = () => {
    if (entries.length === 0) return { mood: 0, energy: 0 };
    
    const totalMood = entries.reduce((sum, entry) => sum + entry.mood, 0);
    const totalEnergy = entries.reduce((sum, entry) => sum + entry.energy, 0);
    
    return {
      mood: Math.round(totalMood / entries.length),
      energy: Math.round(totalEnergy / entries.length),
    };
  };

  const getTrends = () => {
    if (entries.length < 2) return { mood: 0, energy: 0 };
    
    const recent = entries.slice(-Math.ceil(entries.length / 2));
    const older = entries.slice(0, Math.floor(entries.length / 2));
    
    const recentMoodAvg = recent.reduce((sum, e) => sum + e.mood, 0) / recent.length;
    const olderMoodAvg = older.reduce((sum, e) => sum + e.mood, 0) / older.length;
    const recentEnergyAvg = recent.reduce((sum, e) => sum + e.energy, 0) / recent.length;
    const olderEnergyAvg = older.reduce((sum, e) => sum + e.energy, 0) / older.length;
    
    return {
      mood: Math.round(recentMoodAvg - olderMoodAvg),
      energy: Math.round(recentEnergyAvg - olderEnergyAvg),
    };
  };

  const getBestDayOfWeek = () => {
    if (weeklyPatterns.length === 0) return 'Not enough data';
    
    const bestDay = weeklyPatterns.reduce((best, current) => 
      (current.averageMood + current.averageEnergy) > (best.averageMood + best.averageEnergy) 
        ? current 
        : best
    );
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[bestDay.dayOfWeek];
  };

  const getBestTimeOfDay = () => {
    if (dailyPatterns.length === 0) return 'Not enough data';
    
    const bestHour = dailyPatterns.reduce((best, current) => 
      (current.averageMood + current.averageEnergy) > (best.averageMood + best.averageEnergy) 
        ? current 
        : best
    );
    
    const hour = bestHour.hour;
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getUpcomingEnergyDip = () => {
    const energyDips = predictions.filter(p => p.predictedEnergy < 40);
    if (energyDips.length === 0) return null;
    
    const nextDip = energyDips[0];
    const time = new Date(nextDip.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    
    return { time, energy: nextDip.predictedEnergy };
  };

  const averages = getAverages();
  const trends = getTrends();
  const bestDay = getBestDayOfWeek();
  const bestTime = getBestTimeOfDay();
  const energyDip = getUpcomingEnergyDip();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing your patterns...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Insights</Text>
          <Text style={styles.subtitle}>Discover your patterns</Text>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {(['week', 'month', 'all'] as const).map((timeframe) => (
            <TouchableOpacity
              key={timeframe}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe(timeframe)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === timeframe && styles.timeframeTextActive,
              ]}>
                {timeframe === 'all' ? 'All Time' : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BarChart3 size={40} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>Start tracking to see your insights</Text>
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{averages.mood}</Text>
                <Text style={styles.statLabel}>Avg Mood</Text>
                <Text style={[
                  styles.statTrend,
                  { color: trends.mood >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {trends.mood >= 0 ? '↗' : '↘'} {Math.abs(trends.mood)}
                </Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{averages.energy}</Text>
                <Text style={styles.statLabel}>Avg Energy</Text>
                <Text style={[
                  styles.statTrend,
                  { color: trends.energy >= 0 ? '#10B981' : '#EF4444' }
                ]}>
                  {trends.energy >= 0 ? '↗' : '↘'} {Math.abs(trends.energy)}
                </Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{entries.length}</Text>
                <Text style={styles.statLabel}>Total Entries</Text>
                <Text style={styles.statTrend}>📊</Text>
              </View>
            </View>

            {/* Graph with Predictions */}
            <View style={styles.graphContainer}>
              <Text style={styles.sectionTitle}>Trends & Forecast</Text>
              <GraphView 
                entries={entries} 
                predictions={predictions}
                showPredictions={true}
                width={width - 32}
                height={160}
              />
              {energyDip && (
                <View style={styles.predictionAlert}>
                  <Clock size={14} color="#F59E0B" />
                  <Text style={styles.predictionText}>
                    Energy dip predicted at {energyDip.time}
                  </Text>
                </View>
              )}
            </View>

            {/* Pattern Insights */}
            <View style={styles.patternsContainer}>
              <Text style={styles.sectionTitle}>Pattern Insights</Text>
              
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Calendar size={18} color="#3B82F6" />
                  <Text style={styles.insightTitle}>Best Day</Text>
                </View>
                <Text style={styles.insightValue}>{bestDay}</Text>
                <Text style={styles.insightDescription}>
                  You tend to feel your best on this day
                </Text>
              </View>
              
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Clock size={18} color="#8B5CF6" />
                  <Text style={styles.insightTitle}>Peak Time</Text>
                </View>
                <Text style={styles.insightValue}>{bestTime}</Text>
                <Text style={styles.insightDescription}>
                  Your energy and mood are typically highest at this time
                </Text>
              </View>
            </View>

            {/* Patterns Breakdown */}
            {dailyPatterns.length > 0 && (
              <View style={styles.patternsBreakdown}>
                <Text style={styles.sectionTitle}>Daily Patterns</Text>
                <View style={styles.patternsList}>
                  {dailyPatterns.slice(0, 6).map((pattern) => (
                    <View key={pattern.hour} style={styles.patternItem}>
                      <Text style={styles.patternTime}>
                        {pattern.hour.toString().padStart(2, '0')}:00
                      </Text>
                      <View style={styles.patternBars}>
                        <View style={styles.patternBar}>
                          <View 
                            style={[
                              styles.patternBarFill,
                              { width: `${pattern.averageMood}%`, backgroundColor: '#8B5CF6' }
                            ]} 
                          />
                        </View>
                        <View style={styles.patternBar}>
                          <View 
                            style={[
                              styles.patternBarFill,
                              { width: `${pattern.averageEnergy}%`, backgroundColor: '#10B981' }
                            ]} 
                          />
                        </View>
                      </View>
                      <Text style={styles.patternCount}>{pattern.entryCount}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  timeframeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 6,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeframeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  timeframeText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  statTrend: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  graphContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  predictionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  predictionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
  },
  patternsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
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
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  insightValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  patternsBreakdown: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  patternsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  patternTime: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    width: 35,
  },
  patternBars: {
    flex: 1,
    gap: 3,
  },
  patternBar: {
    height: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  patternBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  patternCount: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    width: 15,
    textAlign: 'right',
  },
  bottomSpacing: {
    height: 16,
  },
});