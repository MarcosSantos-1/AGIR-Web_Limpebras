import { useEffect, useState, type ReactNode } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

export function AnimatedSection({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: reduceMotion ? 0 : 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduceMotion ? 0 : 6, 0] }) }] }}>{children}</Animated.View>;
}
