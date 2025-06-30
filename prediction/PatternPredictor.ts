import { MoodEnergyEntry, DailyPattern, WeeklyPattern, PredictionData } from '@/models/MoodEnergyEntry';
import { LocalStateManager } from '@/storage/LocalStateManager';

// Default baseline patterns based on research and common circadian rhythms
const DEFAULT_DAILY_PATTERNS: DailyPattern[] = [
  // Early morning (6-8 AM) - Lower energy, moderate mood
  { hour: 6, averageMood: 45, averageEnergy: 30, entryCount: 0 },
  { hour: 7, averageMood: 50, averageEnergy: 35, entryCount: 0 },
  { hour: 8, averageMood: 55, averageEnergy: 45, entryCount: 0 },
  
  // Morning peak (9-11 AM) - Rising energy and mood
  { hour: 9, averageMood: 60, averageEnergy: 60, entryCount: 0 },
  { hour: 10, averageMood: 65, averageEnergy: 70, entryCount: 0 },
  { hour: 11, averageMood: 68, averageEnergy: 75, entryCount: 0 },
  
  // Midday (12-1 PM) - Peak performance
  { hour: 12, averageMood: 70, averageEnergy: 75, entryCount: 0 },
  { hour: 13, averageMood: 68, averageEnergy: 70, entryCount: 0 },
  
  // Afternoon dip (2-3 PM) - Natural energy decline
  { hour: 14, averageMood: 60, averageEnergy: 55, entryCount: 0 },
  { hour: 15, averageMood: 58, averageEnergy: 50, entryCount: 0 },
  
  // Late afternoon recovery (4-6 PM) - Second wind
  { hour: 16, averageMood: 62, averageEnergy: 60, entryCount: 0 },
  { hour: 17, averageMood: 65, averageEnergy: 65, entryCount: 0 },
  { hour: 18, averageMood: 63, averageEnergy: 60, entryCount: 0 },
  
  // Evening (7-9 PM) - Gradual decline
  { hour: 19, averageMood: 60, averageEnergy: 55, entryCount: 0 },
  { hour: 20, averageMood: 58, averageEnergy: 50, entryCount: 0 },
  { hour: 21, averageMood: 55, averageEnergy: 45, entryCount: 0 },
  
  // Night (10 PM-12 AM) - Wind down
  { hour: 22, averageMood: 50, averageEnergy: 35, entryCount: 0 },
  { hour: 23, averageMood: 45, averageEnergy: 30, entryCount: 0 },
  { hour: 0, averageMood: 40, averageEnergy: 25, entryCount: 0 },
  
  // Late night/early morning (1-5 AM) - Lowest points
  { hour: 1, averageMood: 35, averageEnergy: 20, entryCount: 0 },
  { hour: 2, averageMood: 30, averageEnergy: 15, entryCount: 0 },
  { hour: 3, averageMood: 28, averageEnergy: 12, entryCount: 0 },
  { hour: 4, averageMood: 30, averageEnergy: 15, entryCount: 0 },
  { hour: 5, averageMood: 35, averageEnergy: 20, entryCount: 0 },
];

const DEFAULT_WEEKLY_PATTERNS: WeeklyPattern[] = [
  // Sunday - Lower mood due to "Sunday blues", moderate energy
  { dayOfWeek: 0, averageMood: 55, averageEnergy: 60, entryCount: 0 },
  
  // Monday - Monday blues, lower mood but building energy
  { dayOfWeek: 1, averageMood: 50, averageEnergy: 65, entryCount: 0 },
  
  // Tuesday-Thursday - Peak weekdays, higher mood and energy
  { dayOfWeek: 2, averageMood: 65, averageEnergy: 70, entryCount: 0 },
  { dayOfWeek: 3, averageMood: 68, averageEnergy: 72, entryCount: 0 },
  { dayOfWeek: 4, averageMood: 70, averageEnergy: 70, entryCount: 0 },
  
  // Friday - High mood (TGIF), good energy
  { dayOfWeek: 5, averageMood: 72, averageEnergy: 68, entryCount: 0 },
  
  // Saturday - Highest mood and energy (weekend freedom)
  { dayOfWeek: 6, averageMood: 75, averageEnergy: 65, entryCount: 0 },
];

export class PatternPredictor {
  static async analyzeDailyPatterns(): Promise<DailyPattern[]> {
    const entries = await LocalStateManager.getEntries();
    const patterns: { [hour: number]: { mood: number[], energy: number[] } } = {};

    // Group entries by hour
    entries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (!patterns[hour]) {
        patterns[hour] = { mood: [], energy: [] };
      }
      patterns[hour].mood.push(entry.mood);
      patterns[hour].energy.push(entry.energy);
    });

    // Calculate averages for each hour, using defaults when no data exists
    const dailyPatterns: DailyPattern[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const defaultPattern = DEFAULT_DAILY_PATTERNS.find(p => p.hour === hour);
      
      if (patterns[hour] && patterns[hour].mood.length > 0) {
        // Use actual data when available
        const avgMood = patterns[hour].mood.reduce((a, b) => a + b, 0) / patterns[hour].mood.length;
        const avgEnergy = patterns[hour].energy.reduce((a, b) => a + b, 0) / patterns[hour].energy.length;
        
        // Blend with default patterns for more stable predictions (weighted average)
        const dataWeight = Math.min(patterns[hour].mood.length / 10, 0.8); // Max 80% weight for user data
        const defaultWeight = 1 - dataWeight;
        
        const blendedMood = Math.round(
          (avgMood * dataWeight) + (defaultPattern?.averageMood || 50) * defaultWeight
        );
        const blendedEnergy = Math.round(
          (avgEnergy * dataWeight) + (defaultPattern?.averageEnergy || 50) * defaultWeight
        );
        
        dailyPatterns.push({
          hour,
          averageMood: blendedMood,
          averageEnergy: blendedEnergy,
          entryCount: patterns[hour].mood.length,
        });
      } else {
        // Use default pattern when no user data exists
        dailyPatterns.push(
          defaultPattern || { hour, averageMood: 50, averageEnergy: 50, entryCount: 0 }
        );
      }
    }

    await LocalStateManager.saveDailyPatterns(dailyPatterns);
    return dailyPatterns;
  }

  static async analyzeWeeklyPatterns(): Promise<WeeklyPattern[]> {
    const entries = await LocalStateManager.getEntries();
    const patterns: { [dayOfWeek: number]: { mood: number[], energy: number[] } } = {};

    // Group entries by day of week
    entries.forEach(entry => {
      const dayOfWeek = new Date(entry.timestamp).getDay();
      if (!patterns[dayOfWeek]) {
        patterns[dayOfWeek] = { mood: [], energy: [] };
      }
      patterns[dayOfWeek].mood.push(entry.mood);
      patterns[dayOfWeek].energy.push(entry.energy);
    });

    // Calculate averages for each day, using defaults when no data exists
    const weeklyPatterns: WeeklyPattern[] = [];
    for (let day = 0; day < 7; day++) {
      const defaultPattern = DEFAULT_WEEKLY_PATTERNS.find(p => p.dayOfWeek === day);
      
      if (patterns[day] && patterns[day].mood.length > 0) {
        // Use actual data when available
        const avgMood = patterns[day].mood.reduce((a, b) => a + b, 0) / patterns[day].mood.length;
        const avgEnergy = patterns[day].energy.reduce((a, b) => a + b, 0) / patterns[day].energy.length;
        
        // Blend with default patterns for more stable predictions
        const dataWeight = Math.min(patterns[day].mood.length / 15, 0.7); // Max 70% weight for user data
        const defaultWeight = 1 - dataWeight;
        
        const blendedMood = Math.round(
          (avgMood * dataWeight) + (defaultPattern?.averageMood || 60) * defaultWeight
        );
        const blendedEnergy = Math.round(
          (avgEnergy * dataWeight) + (defaultPattern?.averageEnergy || 60) * defaultWeight
        );
        
        weeklyPatterns.push({
          dayOfWeek: day,
          averageMood: blendedMood,
          averageEnergy: blendedEnergy,
          entryCount: patterns[day].mood.length,
        });
      } else {
        // Use default pattern when no user data exists
        weeklyPatterns.push(
          defaultPattern || { dayOfWeek: day, averageMood: 60, averageEnergy: 60, entryCount: 0 }
        );
      }
    }

    await LocalStateManager.saveWeeklyPatterns(weeklyPatterns);
    return weeklyPatterns;
  }

  static async generatePredictions(hoursAhead: number = 12): Promise<PredictionData[]> {
    const dailyPatterns = await LocalStateManager.getDailyPatterns();
    const weeklyPatterns = await LocalStateManager.getWeeklyPatterns();
    const recentEntries = await LocalStateManager.getEntries();
    const lastEntries = recentEntries.slice(-10); // Last 10 entries for trend

    const predictions: PredictionData[] = [];
    const now = Date.now();

    for (let i = 1; i <= hoursAhead; i++) {
      const futureTime = now + (i * 60 * 60 * 1000);
      const futureDate = new Date(futureTime);
      const futureHour = futureDate.getHours();
      const futureDayOfWeek = futureDate.getDay();
      
      // Get baseline patterns (will include defaults if no user data)
      const hourPattern = dailyPatterns.find(p => p.hour === futureHour) || 
                         DEFAULT_DAILY_PATTERNS.find(p => p.hour === futureHour) ||
                         { hour: futureHour, averageMood: 50, averageEnergy: 50, entryCount: 0 };
      
      const dayPattern = weeklyPatterns.find(p => p.dayOfWeek === futureDayOfWeek) ||
                        DEFAULT_WEEKLY_PATTERNS.find(p => p.dayOfWeek === futureDayOfWeek) ||
                        { dayOfWeek: futureDayOfWeek, averageMood: 60, averageEnergy: 60, entryCount: 0 };
      
      // Start with baseline predictions
      let predictedMood = (hourPattern.averageMood + dayPattern.averageMood) / 2;
      let predictedEnergy = (hourPattern.averageEnergy + dayPattern.averageEnergy) / 2;
      
      // Calculate confidence based on data availability
      let confidence = 0.6; // Base confidence for default patterns
      
      if (hourPattern.entryCount > 0 || dayPattern.entryCount > 0) {
        // Increase confidence when we have some user data
        const hourConfidence = Math.min(hourPattern.entryCount / 10, 1);
        const dayConfidence = Math.min(dayPattern.entryCount / 15, 1);
        confidence = Math.max(0.6, (hourConfidence + dayConfidence) / 2);
      }

      // Apply recent trend if we have enough data
      if (lastEntries.length >= 3) {
        const moodTrend = this.calculateTrend(lastEntries.map(e => e.mood));
        const energyTrend = this.calculateTrend(lastEntries.map(e => e.energy));
        
        // Apply trend with diminishing effect over time
        const trendWeight = Math.max(0.1, 0.4 - (i * 0.03)); // Decreases with time
        predictedMood += moodTrend * trendWeight;
        predictedEnergy += energyTrend * trendWeight;
        
        // Increase confidence when we have recent trend data
        confidence = Math.min(1, confidence + 0.1);
      }

      // Add natural variation based on time of day
      const timeVariation = this.getTimeBasedVariation(futureHour, i);
      predictedMood += timeVariation.mood;
      predictedEnergy += timeVariation.energy;

      // Ensure values stay within realistic bounds
      predictedMood = Math.max(10, Math.min(90, predictedMood));
      predictedEnergy = Math.max(10, Math.min(90, predictedEnergy));

      predictions.push({
        timestamp: futureTime,
        predictedMood: Math.round(predictedMood),
        predictedEnergy: Math.round(predictedEnergy),
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return predictions;
  }

  private static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-3); // Last 3 values
    const older = values.slice(-6, -3); // Previous 3 values
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return recentAvg - olderAvg;
  }

  private static getTimeBasedVariation(hour: number, hoursAhead: number): { mood: number; energy: number } {
    // Add subtle variations based on circadian rhythms
    const circadianMood = Math.sin((hour - 6) / 24 * 2 * Math.PI) * 3; // Peak around 2 PM
    const circadianEnergy = Math.sin((hour - 4) / 24 * 2 * Math.PI) * 4; // Peak around noon
    
    // Add some randomness that decreases with prediction distance
    const randomFactor = Math.max(0.2, 1 - (hoursAhead * 0.05));
    const moodNoise = (Math.random() - 0.5) * 4 * randomFactor;
    const energyNoise = (Math.random() - 0.5) * 5 * randomFactor;
    
    return {
      mood: circadianMood + moodNoise,
      energy: circadianEnergy + energyNoise,
    };
  }

  static async findEnergyDips(): Promise<{ time: string; energy: number }[]> {
    const predictions = await this.generatePredictions(12);
    
    // Look for significant energy dips (below 35 for default patterns, below 30 for user data)
    const dips = predictions.filter(p => {
      // Use different thresholds based on confidence (higher confidence = more user data)
      const threshold = p.confidence > 0.7 ? 30 : 35;
      return p.predictedEnergy < threshold;
    });
    
    return dips.map(dip => ({
      time: new Date(dip.timestamp).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      }),
      energy: dip.predictedEnergy,
    }));
  }

  // Helper method to get default patterns for specific times (useful for testing)
  static getDefaultPatternForHour(hour: number): DailyPattern {
    return DEFAULT_DAILY_PATTERNS.find(p => p.hour === hour) || 
           { hour, averageMood: 50, averageEnergy: 50, entryCount: 0 };
  }

  static getDefaultPatternForDay(dayOfWeek: number): WeeklyPattern {
    return DEFAULT_WEEKLY_PATTERNS.find(p => p.dayOfWeek === dayOfWeek) || 
           { dayOfWeek, averageMood: 60, averageEnergy: 60, entryCount: 0 };
  }
}