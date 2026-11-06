import { useState } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

/** Keep feedback native and cheap, including on long point lists. */
export function FeedbackPressable({ style, disabled, onHoverIn, onHoverOut, ...props }: PressableProps) {
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion();
  return <Pressable {...props} disabled={disabled}
    onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
    style={(state) => [typeof style === "function" ? style(state) : style, {
      opacity: disabled ? 0.45 : state.pressed ? 0.75 : hovered ? 0.9 : 1,
      transform: [{ scale: state.pressed && !reduceMotion ? 0.98 : 1 }],
    }]} />;
}
