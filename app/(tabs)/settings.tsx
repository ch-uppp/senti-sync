import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Trash2, Download, Upload, Bell, Moon, Sun } from 'lucide-react-native';

import { LocalStateManager } from '@/storage/LocalStateManager';

export default function SettingsScreen() {
  const [totalEntries, setTotalEntries] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const entries = await LocalStateManager.getEntries();
      setTotalEntries(entries.length);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const entries = await LocalStateManager.getEntries();
      const dailyPatterns = await LocalStateManager.getDailyPatterns();
      const weeklyPatterns = await LocalStateManager.getWeeklyPatterns();
      
      const exportData = {
        entries,
        dailyPatterns,
        weeklyPatterns,
        exportDate: new Date().toISOString(),
        version: '1.0',
      };

      // In a real app, this would trigger a file download or share
      console.log('Export data:', exportData);
      
      Alert.alert(
        'Export Complete',
        `Exported ${entries.length} entries. In a full app, this would be saved as a file.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Export Failed', 'There was an error exporting your data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your mood and energy entries. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await LocalStateManager.clearAllData();
              setTotalEntries(0);
              Alert.alert('Data Cleared', 'All your data has been deleted.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'There was an error clearing your data.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleImportData = () => {
    // In a real app, this would open a file picker
    Alert.alert(
      'Import Data',
      'Import functionality would allow you to restore data from a previous export.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Settings size={28} color="#3B82F6" />
          <View>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Customize your experience</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data</Text>
          
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Entries</Text>
              <Text style={styles.statValue}>{totalEntries}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Member Since</Text>
              <Text style={styles.statValue}>
                {totalEntries > 0 ? 'Recently' : 'Today'}
              </Text>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Bell size={18} color="#3B82F6" />
                <Text style={styles.settingLabel}>Daily Reminders</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={styles.settingDivider} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                {darkModeEnabled ? (
                  <Moon size={18} color="#3B82F6" />
                ) : (
                  <Sun size={18} color="#3B82F6" />
                )}
                <Text style={styles.settingLabel}>Dark Mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <View style={styles.actionsCard}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={handleExportData}
              disabled={isLoading || totalEntries === 0}
            >
              <Download size={18} color={totalEntries === 0 ? '#9CA3AF' : '#10B981'} />
              <View style={styles.actionInfo}>
                <Text style={[
                  styles.actionLabel,
                  { color: totalEntries === 0 ? '#9CA3AF' : '#1F2937' }
                ]}>
                  Export Data
                </Text>
                <Text style={styles.actionDescription}>
                  Download your data as JSON
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.actionDivider} />
            
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={handleImportData}
              disabled={isLoading}
            >
              <Upload size={18} color="#3B82F6" />
              <View style={styles.actionInfo}>
                <Text style={styles.actionLabel}>Import Data</Text>
                <Text style={styles.actionDescription}>
                  Restore from backup file
                </Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.actionDivider} />
            
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={handleClearData}
              disabled={isLoading || totalEntries === 0}
            >
              <Trash2 size={18} color={totalEntries === 0 ? '#9CA3AF' : '#EF4444'} />
              <View style={styles.actionInfo}>
                <Text style={[
                  styles.actionLabel,
                  { color: totalEntries === 0 ? '#9CA3AF' : '#EF4444' }
                ]}>
                  Clear All Data
                </Text>
                <Text style={styles.actionDescription}>
                  Permanently delete all entries
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>SentiSync</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDescription}>
              Track your mood and energy patterns with AI-powered insights. 
              Built for your personal wellness journey.
            </Text>
            
            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>📊 Pattern Recognition</Text>
              <Text style={styles.featureItem}>🤖 AI-Powered Insights</Text>
              <Text style={styles.featureItem}>📈 Predictive Analytics</Text>
              <Text style={styles.featureItem}>🔒 Privacy-First Design</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerText}>
            SentiSync is for wellness tracking purposes only and is not intended 
            as a substitute for professional medical advice, diagnosis, or treatment.
          </Text>
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
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 10,
  },
  statCard: {
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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  settingsCard: {
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  actionsCard: {
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginBottom: 1,
  },
  actionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  aboutTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
    textAlign: 'center',
    marginBottom: 2,
  },
  aboutVersion: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  aboutDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresList: {
    gap: 6,
  },
  featureItem: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    textAlign: 'center',
  },
  disclaimerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 14,
  },
  bottomSpacing: {
    height: 16,
  },
});