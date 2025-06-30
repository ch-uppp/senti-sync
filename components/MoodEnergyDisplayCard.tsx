import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MoodEnergyDisplayCardProps {
  currentMood: number;
  currentEnergy: number;
}

export function MoodEnergyDisplayCard({ currentMood, currentEnergy }: MoodEnergyDisplayCardProps) {
  // Updated to use purple for mood (consistent with graph marker)
  const getMoodColor = (mood: number) => {
    if (mood >= 70) return '#8B5CF6'; // Purple for high mood
    if (mood >= 40) return '#A78BFA'; // Light purple for medium mood
    return '#C4B5FD'; // Very light purple for low mood
  };

  // Updated to use green for energy (consistent with graph marker)
  const getEnergyColor = (energy: number) => {
    if (energy >= 70) return '#10B981'; // Green for high energy
    if (energy >= 40) return '#34D399'; // Light green for medium energy
    return '#6EE7B7'; // Very light green for low energy
  };

  return (
    <View style={styles.container}>
      <View style={styles.valueContainer}>
        <View style={styles.valueItem}>
          <Text style={styles.label}>Mood</Text>
          <Text style={[styles.value, { color: getMoodColor(currentMood) }]}>
            {currentMood}
          </Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.valueItem}>
          <Text style={styles.label}>Energy</Text>
          <Text style={[styles.value, { color: getEnergyColor(currentEnergy) }]}>
            {currentEnergy}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  valueItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
});