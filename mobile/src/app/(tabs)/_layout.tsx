import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps, JSX } from "react";
import type { ColorValue } from "react-native";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color }: { name: IoniconName; color: ColorValue }): JSX.Element {
  const iconColor = color === null || typeof color === "number" ? undefined : color;
  return <Ionicons name={name} size={24} color={iconColor} />;
}

export default function TabsLayout(): JSX.Element {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarLabelStyle: { fontFamily: "Geist_500Medium" } }}>
      <Tabs.Screen name="index" options={{ title: "Perto", tabBarAccessibilityLabel: "Pontos pendentes mais próximos", tabBarIcon: ({ color }) => <TabIcon name="navigate-outline" color={color} /> }} />
      <Tabs.Screen name="mapa" options={{ title: "Mapa", tabBarAccessibilityLabel: "Mapa dos pontos", tabBarIcon: ({ color }) => <TabIcon name="map-outline" color={color} /> }} />
      <Tabs.Screen name="feitos" options={{ title: "Feitos", tabBarAccessibilityLabel: "Pontos já preenchidos", tabBarIcon: ({ color }) => <TabIcon name="checkmark-circle-outline" color={color} /> }} />
    </Tabs>
  );
}
