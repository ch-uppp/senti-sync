import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoodEnergyEntry, DailyPattern, WeeklyPattern } from '@/models/MoodEnergyEntry';

const STORAGE_KEYS = {
  ENTRIES: 'mood_energy_entries',
  DAILY_PATTERNS: 'daily_patterns',
  WEEKLY_PATTERNS: 'weekly_patterns',
  LAST_ENTRY: 'last_entry',
  SETTINGS: 'user_settings',
};

export class LocalStateManager {
  static async saveEntry(entry: MoodEnergyEntry): Promise<void> {
    try {
      const entries = await this.getEntries();
      const updatedEntries = [...entries.filter(e => e.id !== entry.id), entry];
      await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ENTRY, JSON.stringify(entry));
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  }

  static async getEntries(): Promise<MoodEnergyEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting entries:', error);
      return [];
    }
  }

  static async getLastEntry(): Promise<MoodEnergyEntry | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ENTRY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting last entry:', error);
      return null;
    }
  }

  static async getEntriesInRange(startTime: number, endTime: number): Promise<MoodEnergyEntry[]> {
    const entries = await this.getEntries();
    return entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    ).sort((a, b) => a.timestamp - b.timestamp);
  }

  static async getTodaysEntries(): Promise<MoodEnergyEntry[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
    
    return this.getEntriesInRange(startOfDay, endOfDay);
  }

  static async saveDailyPatterns(patterns: DailyPattern[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_PATTERNS, JSON.stringify(patterns));
    } catch (error) {
      console.error('Error saving daily patterns:', error);
    }
  }

  static async getDailyPatterns(): Promise<DailyPattern[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_PATTERNS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting daily patterns:', error);
      return [];
    }
  }

  static async saveWeeklyPatterns(patterns: WeeklyPattern[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_PATTERNS, JSON.stringify(patterns));
    } catch (error) {
      console.error('Error saving weekly patterns:', error);
    }
  }

  static async getWeeklyPatterns(): Promise<WeeklyPattern[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_PATTERNS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting weekly patterns:', error);
      return [];
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}