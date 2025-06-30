import { MoodEnergyEntry } from '@/models/MoodEnergyEntry';
import { LocalStateManager } from '@/storage/LocalStateManager';

export interface BoltAISuggestion {
  id: string;
  type: 'mood_boost' | 'energy_management' | 'pattern_insight' | 'wellness_tip' | 'behavioral_nudge';
  title: string;
  message: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number; // 0-1
  timestamp: number;
  context: {
    currentMood: number;
    currentEnergy: number;
    timeOfDay: string;
    dayOfWeek: string;
    recentTrend: 'improving' | 'declining' | 'stable';
    patternMatch?: string;
  };
  actions?: {
    label: string;
    type: 'reminder' | 'activity' | 'reflection' | 'external_link';
    data?: any;
  }[];
}

export interface BoltAIAnalysisRequest {
  recentEntries: MoodEnergyEntry[];
  currentContext: {
    timestamp: number;
    timeOfDay: string;
    dayOfWeek: string;
    weatherContext?: string;
    userPreferences?: any;
  };
  patterns: {
    dailyPatterns: any[];
    weeklyPatterns: any[];
    energyDips: any[];
  };
  userProfile: {
    trackingDuration: number;
    averageMood: number;
    averageEnergy: number;
    consistencyScore: number;
  };
}

class BoltAIService {
  private apiKey: string;
  private isDebugMode: boolean;

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
    this.isDebugMode = process.env.EXPO_PUBLIC_DEBUG_MODE === 'true';
  }

  async generateSuggestions(limit: number = 3): Promise<BoltAISuggestion[]> {
    try {
      // Gather comprehensive context
      const analysisRequest = await this.buildAnalysisRequest();
      
      if (this.isDebugMode) {
        console.log('🤖 AI Analysis Request:', analysisRequest);
      }

      // If no API key, return mock suggestions for development
      if (!this.apiKey) {
        return this.generateMockSuggestions(analysisRequest, limit);
      }

      // Make API call to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI wellness coach specializing in mood and energy tracking. Your role is to provide personalized, actionable insights based on user data.

IMPORTANT: You must respond with valid JSON only. No additional text or formatting.

Response format:
{
  "suggestions": [
    {
      "id": "unique_id",
      "type": "mood_boost|energy_management|pattern_insight|wellness_tip|behavioral_nudge",
      "title": "Brief title (max 40 chars)",
      "message": "Helpful message (max 150 chars)",
      "actionable": true|false,
      "priority": "low|medium|high|urgent",
      "confidence": 0.0-1.0,
      "context": {
        "currentMood": number,
        "currentEnergy": number,
        "timeOfDay": "string",
        "dayOfWeek": "string",
        "recentTrend": "improving|declining|stable"
      },
      "actions": [
        {
          "label": "Action text",
          "type": "activity|reminder|reflection",
          "data": {}
        }
      ]
    }
  ]
}

Guidelines:
- Be supportive and encouraging
- Focus on actionable advice
- Consider time of day and recent patterns
- Prioritize urgent suggestions for very low mood/energy
- Keep messages concise but meaningful
- Provide 1-3 suggestions maximum`
            },
            {
              role: 'user',
              content: `Analyze this mood/energy data and provide personalized suggestions:

User Profile:
- Total entries: ${analysisRequest.userProfile.trackingDuration} days
- Average mood: ${analysisRequest.userProfile.averageMood}/100
- Average energy: ${analysisRequest.userProfile.averageEnergy}/100
- Consistency: ${Math.round(analysisRequest.userProfile.consistencyScore * 100)}%

Current Context:
- Time: ${analysisRequest.currentContext.timeOfDay}
- Day: ${analysisRequest.currentContext.dayOfWeek}

Recent Entries (last 5):
${analysisRequest.recentEntries.slice(-5).map(entry => {
  const date = new Date(entry.timestamp);
  return `- ${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}: Mood ${entry.mood}, Energy ${entry.energy}`;
}).join('\n')}

Please provide ${limit} personalized suggestions in the exact JSON format specified.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (this.isDebugMode) {
        console.log('🤖 OpenAI Response:', data);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      try {
        const parsedResponse = JSON.parse(content);
        return this.processOpenAIResponse(parsedResponse);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        throw new Error('Invalid JSON response from OpenAI');
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      
      // Fallback to local suggestions
      const analysisRequest = await this.buildAnalysisRequest();
      return this.generateMockSuggestions(analysisRequest, limit);
    }
  }

  private async buildAnalysisRequest(): Promise<BoltAIAnalysisRequest> {
    const recentEntries = await LocalStateManager.getEntries();
    const dailyPatterns = await LocalStateManager.getDailyPatterns();
    const weeklyPatterns = await LocalStateManager.getWeeklyPatterns();
    
    const now = new Date();
    const timeOfDay = this.getTimeOfDay(now.getHours());
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Calculate user profile metrics
    const userProfile = this.calculateUserProfile(recentEntries);

    return {
      recentEntries: recentEntries.slice(-20), // Last 20 entries
      currentContext: {
        timestamp: Date.now(),
        timeOfDay,
        dayOfWeek,
      },
      patterns: {
        dailyPatterns,
        weeklyPatterns,
        energyDips: [], // Would be populated by PatternPredictor
      },
      userProfile,
    };
  }

  private calculateUserProfile(entries: MoodEnergyEntry[]) {
    if (entries.length === 0) {
      return {
        trackingDuration: 0,
        averageMood: 50,
        averageEnergy: 50,
        consistencyScore: 0,
      };
    }

    const totalMood = entries.reduce((sum, e) => sum + e.mood, 0);
    const totalEnergy = entries.reduce((sum, e) => sum + e.energy, 0);
    
    // Calculate consistency (how regular is their tracking)
    const firstEntry = entries[0].timestamp;
    const lastEntry = entries[entries.length - 1].timestamp;
    const daysCovered = Math.ceil((lastEntry - firstEntry) / (24 * 60 * 60 * 1000));
    const consistencyScore = Math.min(entries.length / Math.max(daysCovered, 1), 1);

    return {
      trackingDuration: daysCovered,
      averageMood: Math.round(totalMood / entries.length),
      averageEnergy: Math.round(totalEnergy / entries.length),
      consistencyScore: Math.round(consistencyScore * 100) / 100,
    };
  }

  private getTimeOfDay(hour: number): string {
    if (hour < 6) return 'early_morning';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  private processOpenAIResponse(data: any): BoltAISuggestion[] {
    // Process the OpenAI response
    return data.suggestions?.map((suggestion: any) => ({
      id: suggestion.id || `ai_${Date.now()}_${Math.random()}`,
      type: suggestion.type || 'wellness_tip',
      title: suggestion.title,
      message: suggestion.message,
      actionable: suggestion.actionable ?? true,
      priority: suggestion.priority || 'medium',
      confidence: suggestion.confidence || 0.8,
      timestamp: Date.now(),
      context: {
        currentMood: suggestion.context?.currentMood || 50,
        currentEnergy: suggestion.context?.currentEnergy || 50,
        timeOfDay: suggestion.context?.timeOfDay || 'unknown',
        dayOfWeek: suggestion.context?.dayOfWeek || 'unknown',
        recentTrend: suggestion.context?.recentTrend || 'stable',
      },
      actions: suggestion.actions || [],
    })) || [];
  }

  private generateMockSuggestions(request: BoltAIAnalysisRequest, limit: number): BoltAISuggestion[] {
    const { recentEntries, currentContext, userProfile } = request;
    const suggestions: BoltAISuggestion[] = [];

    // Analyze current state
    const latestEntry = recentEntries[recentEntries.length - 1];
    const currentMood = latestEntry?.mood || 50;
    const currentEnergy = latestEntry?.energy || 50;
    
    // Determine trend
    const recentTrend = this.calculateTrend(recentEntries.slice(-5));
    
    // Generate contextual suggestions based on patterns
    const contextualSuggestions = this.generateContextualSuggestions({
      currentMood,
      currentEnergy,
      timeOfDay: currentContext.timeOfDay,
      dayOfWeek: currentContext.dayOfWeek,
      recentTrend,
      userProfile,
    });

    return contextualSuggestions.slice(0, limit);
  }

  private calculateTrend(entries: MoodEnergyEntry[]): 'improving' | 'declining' | 'stable' {
    if (entries.length < 2) return 'stable';
    
    const recent = entries.slice(-2);
    const older = entries.slice(-4, -2);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, e) => sum + e.mood + e.energy, 0) / (recent.length * 2);
    const olderAvg = older.reduce((sum, e) => sum + e.mood + e.energy, 0) / (older.length * 2);
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  private generateContextualSuggestions(context: {
    currentMood: number;
    currentEnergy: number;
    timeOfDay: string;
    dayOfWeek: string;
    recentTrend: 'improving' | 'declining' | 'stable';
    userProfile: any;
  }): BoltAISuggestion[] {
    const suggestions: BoltAISuggestion[] = [];
    const { currentMood, currentEnergy, timeOfDay, dayOfWeek, recentTrend, userProfile } = context;

    // Energy-based suggestions
    if (currentEnergy < 30) {
      suggestions.push({
        id: `energy_low_${Date.now()}`,
        type: 'energy_management',
        title: 'Energy Boost Needed',
        message: this.getEnergyBoostMessage(timeOfDay),
        actionable: true,
        priority: 'high',
        confidence: 0.9,
        timestamp: Date.now(),
        context: {
          currentMood,
          currentEnergy,
          timeOfDay,
          dayOfWeek,
          recentTrend,
        },
        actions: [
          {
            label: 'Quick energizer',
            type: 'activity',
            data: { activity: 'breathing_exercise', duration: 300 },
          },
        ],
      });
    }

    // Mood-based suggestions
    if (currentMood < 40) {
      suggestions.push({
        id: `mood_low_${Date.now()}`,
        type: 'mood_boost',
        title: 'Mood Support',
        message: this.getMoodBoostMessage(timeOfDay, recentTrend),
        actionable: true,
        priority: currentMood < 25 ? 'urgent' : 'high',
        confidence: 0.85,
        timestamp: Date.now(),
        context: {
          currentMood,
          currentEnergy,
          timeOfDay,
          dayOfWeek,
          recentTrend,
        },
        actions: [
          {
            label: 'Mood lifter',
            type: 'activity',
            data: { activity: 'gratitude_practice', duration: 180 },
          },
        ],
      });
    }

    // Time-based suggestions
    if (timeOfDay === 'morning' && currentEnergy > 70) {
      suggestions.push({
        id: `morning_energy_${Date.now()}`,
        type: 'behavioral_nudge',
        title: 'Great Morning Energy!',
        message: 'Your energy is high this morning. Perfect time to tackle your most important tasks or try something new.',
        actionable: true,
        priority: 'medium',
        confidence: 0.8,
        timestamp: Date.now(),
        context: {
          currentMood,
          currentEnergy,
          timeOfDay,
          dayOfWeek,
          recentTrend,
        },
        actions: [
          {
            label: 'Plan priority task',
            type: 'reminder',
            data: { reminderType: 'task_planning' },
          },
        ],
      });
    }

    // Pattern-based suggestions
    if (recentTrend === 'improving') {
      suggestions.push({
        id: `trend_positive_${Date.now()}`,
        type: 'pattern_insight',
        title: 'Positive Trend Detected!',
        message: 'Your mood and energy have been improving. Keep up whatever you\'ve been doing differently!',
        actionable: false,
        priority: 'low',
        confidence: 0.75,
        timestamp: Date.now(),
        context: {
          currentMood,
          currentEnergy,
          timeOfDay,
          dayOfWeek,
          recentTrend,
        },
      });
    }

    // Weekend vs weekday suggestions
    if (dayOfWeek === 'Sunday' && currentMood < 50) {
      suggestions.push({
        id: `sunday_blues_${Date.now()}`,
        type: 'wellness_tip',
        title: 'Sunday Preparation',
        message: 'Sunday evening can feel overwhelming. Try preparing something small for tomorrow to ease the transition.',
        actionable: true,
        priority: 'medium',
        confidence: 0.7,
        timestamp: Date.now(),
        context: {
          currentMood,
          currentEnergy,
          timeOfDay,
          dayOfWeek,
          recentTrend,
        },
        actions: [
          {
            label: 'Plan tomorrow',
            type: 'activity',
            data: { activity: 'weekly_prep', duration: 600 },
          },
        ],
      });
    }

    return suggestions;
  }

  private getEnergyBoostMessage(timeOfDay: string): string {
    const messages = {
      early_morning: 'Try gentle stretching or stepping outside for natural light to wake up your system.',
      morning: 'A brief walk or some deep breathing exercises could help boost your energy naturally.',
      afternoon: 'The afternoon dip is normal. Try a 5-minute movement break or stay hydrated.',
      evening: 'Low evening energy might mean you need to wind down. Consider a calming activity.',
      night: 'Your energy is naturally lower at night. Focus on rest and recovery.',
    };
    
    return messages[timeOfDay as keyof typeof messages] || messages.afternoon;
  }

  private getMoodBoostMessage(timeOfDay: string, trend: string): string {
    const baseMessages = {
      early_morning: 'Morning mood dips are common. Try starting with something small that brings you joy.',
      morning: 'A gentle morning routine or connecting with someone you care about might help.',
      afternoon: 'Afternoon mood changes are normal. Consider what your body and mind need right now.',
      evening: 'Evening reflection time. What went well today, even if it was small?',
      night: 'Nighttime can bring up difficult feelings. Be gentle with yourself.',
    };

    const trendModifiers = {
      declining: ' Remember, this feeling will pass.',
      improving: ' You\'re already on a positive path.',
      stable: ' Small steps can make a big difference.',
    };

    const base = baseMessages[timeOfDay as keyof typeof baseMessages] || baseMessages.afternoon;
    const modifier = trendModifiers[trend as keyof typeof trendModifiers] || '';
    
    return base + modifier;
  }

  // Method to send feedback to OpenAI about suggestion effectiveness
  async sendFeedback(suggestionId: string, feedback: {
    helpful: boolean;
    actionTaken?: boolean;
    userNote?: string;
  }): Promise<void> {
    try {
      if (this.isDebugMode) {
        console.log('🤖 Feedback sent:', { suggestionId, feedback });
      }
      
      // In a production app, you might want to store this feedback
      // to improve future suggestions or send it to your analytics service
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  }
}

export const boltAIService = new BoltAIService();