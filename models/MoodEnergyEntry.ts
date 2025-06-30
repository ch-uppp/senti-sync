export interface MoodEnergyEntry {
  id: string;
  timestamp: number;
  mood: number; // 0-100
  energy: number; // 0-100
  notes?: string;
  predictedMood?: number;
  predictedEnergy?: number;
}

export interface DailyPattern {
  hour: number;
  averageMood: number;
  averageEnergy: number;
  entryCount: number;
}

export interface WeeklyPattern {
  dayOfWeek: number; // 0 = Sunday
  averageMood: number;
  averageEnergy: number;
  entryCount: number;
}

export interface PredictionData {
  timestamp: number;
  predictedMood: number;
  predictedEnergy: number;
  confidence: number;
}