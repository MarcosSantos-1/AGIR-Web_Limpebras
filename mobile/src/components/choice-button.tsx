import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { FeedbackPressable as Pressable } from "./feedback-pressable";

export function ChoiceButton({ label, letter, selected, disabled, onPress }: { label: string; letter: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 rounded-2xl border-2 px-3 py-3 ${selected ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}
    >
      <View className={`h-8 w-8 items-center justify-center rounded-full ${selected ? "bg-accent" : "bg-default"}`}>
        <Text className={`text-xs font-semibold ${selected ? "text-accent-foreground" : "text-muted"}`}>{letter}</Text>
      </View>
      <Text className="flex-1 text-sm font-medium text-foreground">{label}</Text>
    </Pressable>
  );
}

export function CheckCard({ label, icon, selected, disabled, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-16 flex-row items-center gap-3 rounded-2xl border-2 px-3 py-3 ${selected ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}
    >
      <View className={`h-11 w-11 items-center justify-center rounded-xl ${selected ? "bg-accent" : "bg-default"}`}>
        <Ionicons name={icon} size={20} color={selected ? "#f8fafc" : "#71717a"} />
      </View>
      <Text className="flex-1 text-sm font-medium leading-5 text-foreground">{label}</Text>
      <Ionicons name={selected ? "checkbox" : "square-outline"} size={22} color={selected ? "#16a34a" : "#a1a1aa"} />
    </Pressable>
  );
}
