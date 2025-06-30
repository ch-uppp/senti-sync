import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  interpolateColor,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface DraggableSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  color: string;
  width?: number;
  height?: number;
}

export function DraggableSlider({
  value,
  onValueChange,
  label,
  color,
  width = 280,
  height = 60,
}: DraggableSliderProps) {
  const translateX = useSharedValue((value / 100) * (width - 60));
  const sliderWidth = width - 60;

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(triggerHaptic)();
    },
    onActive: (event) => {
      const newX = Math.max(0, Math.min(sliderWidth, event.translationX + translateX.value));
      translateX.value = newX;
      
      const newValue = Math.round((newX / sliderWidth) * 100);
      runOnJS(onValueChange)(newValue);
    },
    onEnd: () => {
      runOnJS(triggerHaptic)();
    },
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value / sliderWidth,
      [0, 0.5, 1],
      ['#EF4444', color, '#10B981']
    );

    return {
      transform: [{ translateX: translateX.value }],
      backgroundColor,
    };
  });

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value / sliderWidth,
      [0, 0.5, 1],
      ['#FEE2E2', `${color}20`, '#D1FAE5']
    );

    return {
      backgroundColor,
    };
  });

  React.useEffect(() => {
    translateX.value = withSpring((value / 100) * sliderWidth);
  }, [value, sliderWidth]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      
      <View style={[styles.sliderContainer, { width, height }]}>
        <Animated.View style={[styles.track, { width, height }, animatedTrackStyle]} />
        
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View style={[styles.thumb, animatedThumbStyle]}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </PanGestureHandler>
        
        <View style={styles.markers}>
          {[0, 25, 50, 75, 100].map((mark) => (
            <View key={mark} style={styles.marker}>
              <Text style={styles.markerText}>{mark}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  value: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
  },
  sliderContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
  },
  thumb: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  thumbInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  markers: {
    position: 'absolute',
    bottom: -20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marker: {
    alignItems: 'center',
  },
  markerText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});