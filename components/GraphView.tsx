import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { MoodEnergyEntry, PredictionData } from '@/models/MoodEnergyEntry';

interface GraphViewProps {
  entries: MoodEnergyEntry[];
  predictions?: PredictionData[];
  width?: number;
  height?: number;
  showPredictions?: boolean;
}

export function GraphView({
  entries,
  predictions = [],
  width = Dimensions.get('window').width - 32,
  height = 160,
  showPredictions = false,
}: GraphViewProps) {
  if (entries.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { width, height }]}>
        <Text style={styles.emptyText}>No data to display</Text>
        <Text style={styles.emptySubtext}>Start tracking to see your patterns</Text>
      </View>
    );
  }

  const padding = 16;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const allData = [...entries];
  if (showPredictions && predictions.length > 0) {
    allData.push(...predictions.map(p => ({
      id: `pred_${p.timestamp}`,
      timestamp: p.timestamp,
      mood: p.predictedMood,
      energy: p.predictedEnergy,
    })));
  }

  const minTime = Math.min(...allData.map(e => e.timestamp));
  const maxTime = Math.max(...allData.map(e => e.timestamp));
  const timeRange = maxTime - minTime || 1;

  const createPath = (data: { timestamp: number; value: number }[]) => {
    if (data.length === 0) return '';

    const points = data.map(point => {
      const x = padding + ((point.timestamp - minTime) / timeRange) * graphWidth;
      const y = padding + ((100 - point.value) / 100) * graphHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      
      const cpx1 = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.4;
      const cpy1 = prevPoint.y;
      const cpx2 = prevPoint.x + (currentPoint.x - prevPoint.x) * 0.6;
      const cpy2 = currentPoint.y;
      
      path += ` C ${cpx1} ${cpy1} ${cpx2} ${cpy2} ${currentPoint.x} ${currentPoint.y}`;
    }

    return path;
  };

  const createAreaPath = (data: { timestamp: number; value: number }[]) => {
    if (data.length === 0) return '';

    const linePath = createPath(data);
    const lastPoint = data[data.length - 1];
    const firstPoint = data[0];
    
    const lastX = padding + ((lastPoint.timestamp - minTime) / timeRange) * graphWidth;
    const firstX = padding + ((firstPoint.timestamp - minTime) / timeRange) * graphWidth;
    const bottomY = padding + graphHeight;
    
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const moodData = entries.map(e => ({ timestamp: e.timestamp, value: e.mood }));
  const energyData = entries.map(e => ({ timestamp: e.timestamp, value: e.energy }));

  const moodPath = createPath(moodData);
  const energyPath = createPath(energyData);
  const moodAreaPath = createAreaPath(moodData);
  const energyAreaPath = createAreaPath(energyData);

  // Prediction paths
  let moodPredictionPath = '';
  let energyPredictionPath = '';
  
  if (showPredictions && predictions.length > 0) {
    const moodPredData = predictions.map(p => ({ timestamp: p.timestamp, value: p.predictedMood }));
    const energyPredData = predictions.map(p => ({ timestamp: p.timestamp, value: p.predictedEnergy }));
    
    moodPredictionPath = createPath(moodPredData);
    energyPredictionPath = createPath(energyPredData);
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: false 
    });
  };

  const getLatestValues = () => {
    if (entries.length === 0) return { mood: 0, energy: 0 };
    const latest = entries[entries.length - 1];
    return { mood: latest.mood, energy: latest.energy };
  };

  const { mood: latestMood, energy: latestEnergy } = getLatestValues();

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
          </LinearGradient>
          <LinearGradient id="energyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[25, 50, 75].map(value => {
          const y = padding + ((100 - value) / 100) * graphHeight;
          return (
            <Path
              key={value}
              d={`M ${padding} ${y} L ${width - padding} ${y}`}
              stroke="#E5E7EB"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
          );
        })}

        {/* Area fills */}
        <Path d={moodAreaPath} fill="url(#moodGradient)" />
        <Path d={energyAreaPath} fill="url(#energyGradient)" />

        {/* Main lines */}
        <Path d={moodPath} stroke="#8B5CF6" strokeWidth={2.5} fill="none" />
        <Path d={energyPath} stroke="#10B981" strokeWidth={2.5} fill="none" />

        {/* Prediction lines (dashed) */}
        {showPredictions && (
          <>
            <Path d={moodPredictionPath} stroke="#8B5CF6" strokeWidth={2} fill="none" strokeDasharray="4,3" strokeOpacity={0.7} />
            <Path d={energyPredictionPath} stroke="#10B981" strokeWidth={2} fill="none" strokeDasharray="4,3" strokeOpacity={0.7} />
          </>
        )}

        {/* Data points */}
        {moodData.slice(-3).map((point, index) => {
          const x = padding + ((point.timestamp - minTime) / timeRange) * graphWidth;
          const y = padding + ((100 - point.value) / 100) * graphHeight;
          return (
            <Circle
              key={`mood-${index}`}
              cx={x}
              cy={y}
              r={3}
              fill="#8B5CF6"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          );
        })}

        {energyData.slice(-3).map((point, index) => {
          const x = padding + ((point.timestamp - minTime) / timeRange) * graphWidth;
          const y = padding + ((100 - point.value) / 100) * graphHeight;
          return (
            <Circle
              key={`energy-${index}`}
              cx={x}
              cy={y}
              r={3}
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Y-axis labels */}
        <SvgText x={8} y={padding + 4} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">100</SvgText>
        <SvgText x={12} y={padding + graphHeight / 2 + 4} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">50</SvgText>
        <SvgText x={16} y={padding + graphHeight + 4} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">0</SvgText>

        {/* Time labels */}
        {entries.length > 1 && (
          <>
            <SvgText x={padding} y={height - 4} fontSize={9} fill="#6B7280" fontFamily="Inter-Medium">
              {formatTime(minTime)}
            </SvgText>
            <SvgText x={width - padding - 25} y={height - 4} fontSize={9} fill="#6B7280" fontFamily="Inter-Medium">
              {formatTime(maxTime)}
            </SvgText>
          </>
        )}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#8B5CF6' }]} />
          <Text style={styles.legendText}>Mood ({latestMood})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Energy ({latestEnergy})</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 2,
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
});