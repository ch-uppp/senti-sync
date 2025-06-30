import { MoodEnergyEntry } from '@/models/MoodEnergyEntry';
import { LocalStateManager } from '@/storage/LocalStateManager';
import { PatternPredictor } from '@/prediction/PatternPredictor';
import { boltAIService, BoltAISuggestion } from '@/services/BoltAIService';

interface Suggestion {
  id: string;
  type: 'mood' | 'energy' | 'general';
  title: string;
  message: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
}

export class BoltSuggester {
  private static suggestions: string[] = [
    // Energy suggestions
    "Your energy typically dips around {time}. Consider scheduling a 10-minute walk.",
    "You've had {count} low-energy days this week. Try getting sunlight within 30 minutes of waking.",
    "Your energy peaks at {time}. This might be perfect for your most important tasks.",
    "Consider a 5-minute breathing exercise when your energy drops below 30.",
    
    // Mood suggestions
    "Your mood tends to improve after physical activity. A short walk might help right now.",
    "You seem to have better moods on {day}s. What's different about those days?",
    "Your mood has been consistent around {score} lately. Small wins might help boost it.",
    "When your mood is low, try the 5-4-3-2-1 grounding technique.",
    
    // Pattern-based suggestions
    "You consistently feel better in the {timeOfDay}. Try protecting this time for yourself.",
    "Your {metric} follows a predictable pattern. Use this to plan your day strategically.",
    "Weekend vs weekday patterns show significant differences. Consider work-life balance adjustments.",
    
    // General wellness
    "Tracking for {days} days! Consistency is key to understanding your patterns.",
    "Your data shows improvement over the past week. Keep up the great work!",
    "Consider adding a brief note about what influenced your mood or energy today.",
  ];

  static async generateDailySuggestion(): Promise<Suggestion | null> {
    try {
      // First, try to get AI-powered suggestions
      const aiSuggestions = await boltAIService.generateSuggestions(1);
      
      if (aiSuggestions.length > 0) {
        const aiSuggestion = aiSuggestions[0];
        
        // Convert BoltAISuggestion to legacy Suggestion format
        return {
          id: aiSuggestion.id,
          type: this.mapAITypeToLegacyType(aiSuggestion.type),
          title: aiSuggestion.title,
          message: aiSuggestion.message,
          actionable: aiSuggestion.actionable,
          priority: aiSuggestion.priority === 'urgent' ? 'high' : aiSuggestion.priority,
          timestamp: aiSuggestion.timestamp,
        };
      }

      // Fallback to original logic if AI suggestions fail
      await PatternPredictor.analyzeDailyPatterns();
      await PatternPredictor.analyzeWeeklyPatterns();
      
      const recentEntries = await LocalStateManager.getEntries();
      const todayEntries = await LocalStateManager.getTodaysEntries();
      const energyDips = await PatternPredictor.findEnergyDips();
      
      if (recentEntries.length === 0) {
        return this.createWelcomeSuggestion();
      }

      // Analyze recent patterns
      const lastWeekEntries = recentEntries.filter(
        entry => entry.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
      );

      const avgMood = lastWeekEntries.reduce((sum, entry) => sum + entry.mood, 0) / lastWeekEntries.length;
      const avgEnergy = lastWeekEntries.reduce((sum, entry) => sum + entry.energy, 0) / lastWeekEntries.length;

      // Generate contextual suggestion
      let suggestion: Suggestion;

      if (energyDips.length > 0) {
        suggestion = this.createEnergyDipSuggestion(energyDips[0]);
      } else if (avgMood < 40) {
        suggestion = this.createLowMoodSuggestion(avgMood);
      } else if (avgEnergy < 40) {
        suggestion = this.createLowEnergySuggestion(avgEnergy);
      } else if (recentEntries.length >= 7) {
        suggestion = this.createPatternSuggestion(recentEntries);
      } else {
        suggestion = this.createGeneralSuggestion(recentEntries.length);
      }

      return suggestion;
    } catch (error) {
      console.error('Error generating suggestion:', error);
      return null;
    }
  }

  static async generateMultipleSuggestions(count: number = 3): Promise<BoltAISuggestion[]> {
    try {
      return await boltAIService.generateSuggestions(count);
    } catch (error) {
      console.error('Error generating multiple suggestions:', error);
      return [];
    }
  }

  static async sendSuggestionFeedback(suggestionId: string, helpful: boolean, actionTaken?: boolean, note?: string): Promise<void> {
    try {
      await boltAIService.sendFeedback(suggestionId, {
        helpful,
        actionTaken,
        userNote: note,
      });
    } catch (error) {
      console.error('Error sending suggestion feedback:', error);
    }
  }

  private static mapAITypeToLegacyType(aiType: string): 'mood' | 'energy' | 'general' {
    switch (aiType) {
      case 'mood_boost':
        return 'mood';
      case 'energy_management':
        return 'energy';
      case 'pattern_insight':
      case 'wellness_tip':
      case 'behavioral_nudge':
      default:
        return 'general';
    }
  }

  private static createWelcomeSuggestion(): Suggestion {
    return {
      id: `welcome_${Date.now()}`,
      type: 'general',
      title: 'Welcome to SentiSync!',
      message: 'Start tracking your mood and energy to discover your personal patterns and get AI-powered insights.',
      actionable: true,
      priority: 'medium',
      timestamp: Date.now(),
    };
  }

  private static createEnergyDipSuggestion(energyDip: { time: string; energy: number }): Suggestion {
    return {
      id: `energy_dip_${Date.now()}`,
      type: 'energy',
      title: 'Energy Dip Predicted',
      message: `Your energy typically dips around ${energyDip.time}. Consider scheduling a brief walk or energizing activity.`,
      actionable: true,
      priority: 'high',
      timestamp: Date.now(),
    };
  }

  private static createLowMoodSuggestion(avgMood: number): Suggestion {
    const tips = [
      'Try the 5-4-3-2-1 grounding technique: 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
      'Consider reaching out to a friend or loved one for a brief conversation.',
      'A 10-minute walk outside can help boost mood naturally.',
      'Practice deep breathing: 4 counts in, hold for 4, out for 6.',
    ];

    return {
      id: `low_mood_${Date.now()}`,
      type: 'mood',
      title: 'Mood Support',
      message: tips[Math.floor(Math.random() * tips.length)],
      actionable: true,
      priority: 'high',
      timestamp: Date.now(),
    };
  }

  private static createLowEnergySuggestion(avgEnergy: number): Suggestion {
    const tips = [
      'Try getting natural sunlight within 30 minutes of waking up.',
      'Stay hydrated - dehydration is a common cause of fatigue.',
      'Consider a 2-minute energizing stretch or movement break.',
      'Check if you\'re getting enough quality sleep (7-9 hours for most adults).',
    ];

    return {
      id: `low_energy_${Date.now()}`,
      type: 'energy',
      title: 'Energy Boost',
      message: tips[Math.floor(Math.random() * tips.length)],
      actionable: true,
      priority: 'medium',
      timestamp: Date.now(),
    };
  }

  private static createPatternSuggestion(entries: MoodEnergyEntry[]): Suggestion {
    const morningEntries = entries.filter(e => new Date(e.timestamp).getHours() < 12);
    const eveningEntries = entries.filter(e => new Date(e.timestamp).getHours() >= 18);

    if (morningEntries.length > 0 && eveningEntries.length > 0) {
      const morningAvgMood = morningEntries.reduce((sum, e) => sum + e.mood, 0) / morningEntries.length;
      const eveningAvgMood = eveningEntries.reduce((sum, e) => sum + e.mood, 0) / eveningEntries.length;

      const betterTime = morningAvgMood > eveningAvgMood ? 'morning' : 'evening';
      
      return {
        id: `pattern_${Date.now()}`,
        type: 'general',
        title: 'Pattern Insight',
        message: `You tend to feel better in the ${betterTime}. Consider scheduling important activities during your peak times.`,
        actionable: true,
        priority: 'medium',
        timestamp: Date.now(),
      };
    }

    return this.createGeneralSuggestion(entries.length);
  }

  private static createGeneralSuggestion(entryCount: number): Suggestion {
    const encouragements = [
      `Great job tracking for ${entryCount} entries! Consistency helps reveal your unique patterns.`,
      'Small daily check-ins create big insights over time. Keep it up!',
      'Your commitment to self-awareness is admirable. Every entry adds to your personal insights.',
      'Tracking mood and energy is a powerful form of self-care. You\'re investing in yourself!',
    ];

    return {
      id: `general_${Date.now()}`,
      type: 'general',
      title: 'Keep Going!',
      message: encouragements[Math.floor(Math.random() * encouragements.length)],
      actionable: false,
      priority: 'low',
      timestamp: Date.now(),
    };
  }

  static async getSuggestionHistory(): Promise<Suggestion[]> {
    // In a real app, this would be stored and retrieved
    // For now, return empty array as suggestions are generated on-demand
    return [];
  }
}