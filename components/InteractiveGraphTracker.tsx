import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, Circle, Line } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { MoodEnergyEntry } from '@/models/MoodEnergyEntry';
import { PatternPredictor } from '@/prediction/PatternPredictor';

interface InteractiveGraphTrackerProps {
  entries: MoodEnergyEntry[];
  onDataChange: (mood: number, energy: number) => void;
  currentMood: number;
  currentEnergy: number;
  width?: number;
  height?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export function InteractiveGraphTracker({
  entries,
  onDataChange,
  currentMood,
  currentEnergy,
  width = screenWidth - 32,
  height = 200,
}: InteractiveGraphTrackerProps) {
  const padding = 30;
  const bottomPadding = 70;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding - bottomPadding;

  // Graph boundaries
  const graphLeft = padding;
  const graphRight = padding + graphWidth;
  const graphTop = padding;
  const graphBottom = padding + graphHeight;

  // Current time position (based on actual current hour)
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const currentTimeProgress = (currentHour + currentMinute / 60) / 24;
  const currentTimeX = graphLeft + currentTimeProgress * graphWidth;

  // Marker positions - locked to current time X position
  const moodMarkerX = useSharedValue(currentTimeX);
  const moodMarkerY = useSharedValue(graphTop + ((100 - currentMood) / 100) * graphHeight);
  const energyMarkerX = useSharedValue(currentTimeX);
  const energyMarkerY = useSharedValue(graphTop + ((100 - currentEnergy) / 100) * graphHeight);

  const [predictions, setPredictions] = useState<any[]>([]);
  const [energyDipTime, setEnergyDipTime] = useState<string | null>(null);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Load predictions
  useEffect(() => {
    const loadPredictions = async () => {
      try {
        const predictionData = await PatternPredictor.generatePredictions(12);
        const energyDips = await PatternPredictor.findEnergyDips();
        
        setPredictions(predictionData);
        if (energyDips.length > 0) {
          setEnergyDipTime(energyDips[0].time);
        }
      } catch (error) {
        console.error('Error loading predictions:', error);
      }
    };
    
    loadPredictions();
  }, [entries]);

  const updateMoodValue = useCallback((absoluteY: number) => {
    const relativeY = absoluteY - graphTop;
    const clampedY = Math.max(0, Math.min(graphHeight, relativeY));
    const moodValue = Math.round(100 - (clampedY / graphHeight) * 100);
    const constrainedMood = Math.max(0, Math.min(100, moodValue));
    onDataChange(constrainedMood, currentEnergy);
  }, [currentEnergy, onDataChange, graphHeight, graphTop]);

  const updateEnergyValue = useCallback((absoluteY: number) => {
    const relativeY = absoluteY - graphTop;
    const clampedY = Math.max(0, Math.min(graphHeight, relativeY));
    const energyValue = Math.round(100 - (clampedY / graphHeight) * 100);
    const constrainedEnergy = Math.max(0, Math.min(100, energyValue));
    onDataChange(currentMood, constrainedEnergy);
  }, [currentMood, onDataChange, graphHeight, graphTop]);

  // Gesture handlers - only allow vertical movement, X stays at current time
  const moodGestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(triggerHaptic)();
    },
    onActive: (event) => {
      const newY = moodMarkerY.value + event.translationY;
      const clampedY = Math.max(graphTop, Math.min(graphBottom, newY));
      moodMarkerY.value = clampedY;
      // Keep X position locked to current time
      moodMarkerX.value = currentTimeX;
      runOnJS(updateMoodValue)(clampedY);
    },
    onEnd: () => {
      runOnJS(triggerHaptic)();
    },
  });

  const energyGestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(triggerHaptic)();
    },
    onActive: (event) => {
      const newY = energyMarkerY.value + event.translationY;
      const clampedY = Math.max(graphTop, Math.min(graphBottom, newY));
      energyMarkerY.value = clampedY;
      // Keep X position locked to current time
      energyMarkerX.value = currentTimeX;
      runOnJS(updateEnergyValue)(clampedY);
    },
    onEnd: () => {
      runOnJS(triggerHaptic)();
    },
  });

  // Update marker positions when values change
  useEffect(() => {
    const moodY = graphTop + ((100 - currentMood) / 100) * graphHeight;
    const energyY = graphTop + ((100 - currentEnergy) / 100) * graphHeight;
    
    moodMarkerY.value = withSpring(moodY);
    energyMarkerY.value = withSpring(energyY);
    // Always keep markers at current time position
    moodMarkerX.value = currentTimeX;
    energyMarkerX.value = currentTimeX;
  }, [currentMood, currentEnergy, graphHeight, graphTop, currentTimeX]);

  // Animated styles
  const moodMarkerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: moodMarkerX.value - 12,
    top: moodMarkerY.value - 12,
    zIndex: 30,
  }));

  const energyMarkerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: energyMarkerX.value - 12,
    top: energyMarkerY.value - 12,
    zIndex: 25,
  }));

  // Generate realistic historical data
  const generateHistoricalData = () => {
    const historicalData = { mood: [], energy: [] };
    const currentTimeInHours = currentHour + currentMinute / 60;
    
    // Create data points for each hour up to current time
    for (let hour = 0; hour <= Math.floor(currentTimeInHours); hour++) {
      const x = graphLeft + (hour / 24) * graphWidth;
      
      // Use actual entries if available for this hour
      const entryForHour = entries.find(entry => {
        const entryHour = new Date(entry.timestamp).getHours();
        const entryDate = new Date(entry.timestamp).toDateString();
        const today = new Date().toDateString();
        return entryHour === hour && entryDate === today;
      });
      
      if (entryForHour) {
        // Use actual data
        const moodY = graphTop + ((100 - entryForHour.mood) / 100) * graphHeight;
        const energyY = graphTop + ((100 - entryForHour.energy) / 100) * graphHeight;
        historicalData.mood.push({ x, y: moodY });
        historicalData.energy.push({ x, y: energyY });
      } else if (hour === Math.floor(currentTimeInHours)) {
        // Use current values for current hour - position at exact current time
        const exactX = currentTimeX;
        const moodY = graphTop + ((100 - currentMood) / 100) * graphHeight;
        const energyY = graphTop + ((100 - currentEnergy) / 100) * graphHeight;
        historicalData.mood.push({ x: exactX, y: moodY });
        historicalData.energy.push({ x: exactX, y: energyY });
      } else {
        // Generate realistic interpolated data
        const timeOfDay = hour / 24;
        
        // Mood tends to be lower in early morning, higher midday
        const moodBase = 45 + Math.sin(timeOfDay * Math.PI) * 20 + (Math.random() - 0.5) * 12;
        const moodValue = Math.max(25, Math.min(75, moodBase));
        const moodY = graphTop + ((100 - moodValue) / 100) * graphHeight;
        
        // Energy follows a different pattern - low early morning, peak afternoon
        const energyBase = 35 + Math.sin((timeOfDay - 0.25) * Math.PI) * 25 + (Math.random() - 0.5) * 12;
        const energyValue = Math.max(20, Math.min(80, energyBase));
        const energyY = graphTop + ((100 - energyValue) / 100) * graphHeight;
        
        historicalData.mood.push({ x, y: moodY });
        historicalData.energy.push({ x, y: energyY });
      }
    }
    
    return historicalData;
  };

  // Enhanced prediction data generation for the rest of the day
  const generatePredictionData = () => {
    const predictionData = { mood: [], energy: [] };
    const currentTimeInHours = currentHour + currentMinute / 60;
    
    // Start predictions from current position
    predictionData.mood.push({ x: currentTimeX, y: graphTop + ((100 - currentMood) / 100) * graphHeight });
    predictionData.energy.push({ x: currentTimeX, y: graphTop + ((100 - currentEnergy) / 100) * graphHeight });
    
    // Generate predictions for remaining hours of the day
    const hoursRemaining = 24 - currentTimeInHours;
    const hourStep = 0.5; // Generate predictions every 30 minutes for smoother curves
    
    for (let step = hourStep; step <= hoursRemaining; step += hourStep) {
      const futureHour = currentTimeInHours + step;
      if (futureHour >= 24) break; // Don't go past midnight
      
      const x = graphLeft + (futureHour / 24) * graphWidth;
      
      // Use actual predictions if available
      const prediction = predictions.find(p => {
        const predHour = new Date(p.timestamp).getHours();
        return Math.abs(predHour - Math.floor(futureHour)) <= 0.5;
      });
      
      if (prediction) {
        const moodY = graphTop + ((100 - prediction.predictedMood) / 100) * graphHeight;
        const energyY = graphTop + ((100 - prediction.predictedEnergy) / 100) * graphHeight;
        predictionData.mood.push({ x, y: moodY });
        predictionData.energy.push({ x, y: energyY });
      } else {
        // Generate realistic predictions based on current values and time patterns
        const timeProgress = step / hoursRemaining;
        const hourOfDay = futureHour;
        
        // Mood prediction with natural daily patterns
        let moodTrend = currentMood;
        
        // Evening decline pattern
        if (hourOfDay > 18) {
          moodTrend -= (hourOfDay - 18) * 2; // Gradual evening decline
        }
        
        // Late night fatigue
        if (hourOfDay > 22) {
          moodTrend -= (hourOfDay - 22) * 4; // Steeper decline after 10 PM
        }
        
        // Add some natural variation
        moodTrend += Math.sin(timeProgress * Math.PI * 2) * 5;
        const moodPred = Math.max(20, Math.min(80, moodTrend));
        const moodY = graphTop + ((100 - moodPred) / 100) * graphHeight;
        
        // Energy prediction with more pronounced evening decline
        let energyTrend = currentEnergy;
        
        // Natural energy decline throughout the day
        if (hourOfDay > 14) {
          energyTrend -= (hourOfDay - 14) * 3; // Afternoon energy decline
        }
        
        // Evening energy drop
        if (hourOfDay > 20) {
          energyTrend -= (hourOfDay - 20) * 6; // Steeper evening decline
        }
        
        // Add natural variation
        energyTrend += Math.sin(timeProgress * Math.PI * 1.5) * 4;
        const energyPred = Math.max(15, Math.min(75, energyTrend));
        const energyY = graphTop + ((100 - energyPred) / 100) * graphHeight;
        
        predictionData.mood.push({ x, y: moodY });
        predictionData.energy.push({ x, y: energyY });
      }
    }
    
    return predictionData;
  };

  const historicalData = generateHistoricalData();
  const predictionData = generatePredictionData();

  // Create smooth paths
  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      const tension = 0.3;
      const dx = curr.x - prev.x;
      
      const cp1x = prev.x + dx * tension;
      const cp1y = prev.y;
      const cp2x = curr.x - dx * tension;
      const cp2y = curr.y;
      
      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
    }

    return path;
  };

  const createAreaPath = (points: { x: number; y: number }[]) => {
    const linePath = createSmoothPath(points);
    if (!linePath || points.length === 0) return '';

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    
    return `${linePath} L ${lastX} ${graphBottom} L ${firstX} ${graphBottom} Z`;
  };

  const moodHistoricalPath = createSmoothPath(historicalData.mood);
  const energyHistoricalPath = createSmoothPath(historicalData.energy);
  const moodPredictionPath = createSmoothPath(predictionData.mood);
  const energyPredictionPath = createSmoothPath(predictionData.energy);

  const moodAreaPath = createAreaPath(historicalData.mood);
  const energyAreaPath = createAreaPath(historicalData.energy);

  return (
    <View style={[styles.container, { width, height: height + 90 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Forecast</Text>
        {energyDipTime && (
          <Text style={styles.predictionAlert}>Energy dip predicted at {energyDipTime}</Text>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Drag the markers up or down to set your current mood and energy levels
        </Text>
      </View>

      {/* Graph */}
      <View style={styles.graphContainer}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="moodAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#A78BFA" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#A78BFA" stopOpacity={0.03} />
            </LinearGradient>
            <LinearGradient id="energyAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#34D399" stopOpacity={0.2} />
              <Stop offset="100%" stopColor="#34D399" stopOpacity={0.03} />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[25, 50, 75].map(value => {
            const y = graphTop + ((100 - value) / 100) * graphHeight;
            return (
              <Line
                key={value}
                x1={graphLeft}
                y1={y}
                x2={graphRight}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Y-axis labels */}
          <SvgText x={12} y={graphTop + 4} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">100</SvgText>
          <SvgText x={18} y={graphTop + graphHeight / 2 + 4} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">50</SvgText>
          <SvgText x={24} y={graphBottom + 4} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">0</SvgText>

          {/* Time labels */}
          <SvgText x={graphLeft - 10} y={height - 30} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">00</SvgText>
          <SvgText x={graphLeft + graphWidth * 0.5 - 8} y={height - 30} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">12</SvgText>
          <SvgText x={graphRight - 15} y={height - 30} fontSize={10} fill="#6B7280" fontFamily="Inter-Medium">23</SvgText>

          {/* Area fills for historical data */}
          {energyAreaPath && <Path d={energyAreaPath} fill="url(#energyAreaGradient)" />}
          {moodAreaPath && <Path d={moodAreaPath} fill="url(#moodAreaGradient)" />}

          {/* Historical curves (solid lines) */}
          {energyHistoricalPath && (
            <Path 
              d={energyHistoricalPath} 
              stroke="#10B981" 
              strokeWidth={2.5} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}
          {moodHistoricalPath && (
            <Path 
              d={moodHistoricalPath} 
              stroke="#8B5CF6" 
              strokeWidth={2.5} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Enhanced prediction curves (dashed lines) */}
          {energyPredictionPath && (
            <Path 
              d={energyPredictionPath} 
              stroke="#10B981" 
              strokeWidth={2} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              strokeDasharray="6,4"
              strokeOpacity={0.8}
            />
          )}
          {moodPredictionPath && (
            <Path 
              d={moodPredictionPath} 
              stroke="#8B5CF6" 
              strokeWidth={2} 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              strokeDasharray="6,4"
              strokeOpacity={0.8}
            />
          )}

          {/* Current time indicator */}
          <Line
            x1={currentTimeX}
            y1={graphTop - 3}
            x2={currentTimeX}
            y2={graphBottom + 3}
            stroke="#374151"
            strokeWidth={1.5}
            strokeDasharray="3,2"
          />
          <SvgText x={currentTimeX - 8} y={height - 40} fontSize={9} fill="#374151" fontFamily="Inter-Bold">Now</SvgText>

          {/* Data points on curves at current time */}
          <Circle
            cx={currentTimeX}
            cy={graphTop + ((100 - currentMood) / 100) * graphHeight}
            r={3}
            fill="#8B5CF6"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Circle
            cx={currentTimeX}
            cy={graphTop + ((100 - currentEnergy) / 100) * graphHeight}
            r={3}
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </Svg>

        {/* Draggable Markers */}
        <PanGestureHandler onGestureEvent={energyGestureHandler}>
          <Animated.View style={[styles.marker, energyMarkerStyle]}>
            <View style={[styles.markerOuter, { borderColor: '#10B981' }]}>
              <View style={[styles.markerInner, { backgroundColor: '#10B981' }]} />
            </View>
          </Animated.View>
        </PanGestureHandler>

        <PanGestureHandler onGestureEvent={moodGestureHandler}>
          <Animated.View style={[styles.marker, moodMarkerStyle]}>
            <View style={[styles.markerOuter, { borderColor: '#8B5CF6' }]}>
              <View style={[styles.markerInner, { backgroundColor: '#8B5CF6' }]} />
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
          <Text style={styles.legendText}>Mood</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Energy</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendDash} />
          <Text style={styles.legendText}>Predicted</Text>
        </View>
      </View>

      {/* Current Values Display */}
      <View style={styles.valuesContainer}>
        <View style={styles.valueItem}>
          <Text style={styles.valueLabel}>Current Mood</Text>
          <Text style={[styles.valueNumber, { color: '#8B5CF6' }]}>{currentMood}</Text>
        </View>
        <View style={styles.valueItem}>
          <Text style={styles.valueLabel}>Current Energy</Text>
          <Text style={[styles.valueNumber, { color: '#10B981' }]}>{currentEnergy}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    paddingBottom: 22, // Reduced by 10px (was 32px)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  predictionAlert: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  instructionsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
    textAlign: 'center',
  },
  graphContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  marker: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDash: {
    width: 12,
    height: 2,
    backgroundColor: '#6B7280',
    borderRadius: 1,
  },
  legendText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  valuesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingVertical: 8,
  },
  valueItem: {
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  valueNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});