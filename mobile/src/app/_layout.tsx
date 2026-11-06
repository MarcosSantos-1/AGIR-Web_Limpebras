import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Geist_700Bold } from "@expo-google-fonts/geist/700Bold";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, type JSX } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/features/auth";
import { WorkspaceProvider } from "@/features/workspace";

import "../global.css";

export default function RootLayout(): JSX.Element {
  const [fontsReady, fontError] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  if (!fontsReady && !fontError) return <GestureHandlerRootView style={{ flex: 1 }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false }, textProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.6 }, textInputProps: { allowFontScaling: true, maxFontSizeMultiplier: 1.6 } }}>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Gate() {
  const { ready, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === "login";
  useEffect(() => {
    if (!ready) return;
    if (!user && !onLogin) router.replace("/login");
    if (user && onLogin) router.replace("/");
  }, [onLogin, ready, router, user]);
  if (!ready) return null;
  return (
    <WorkspaceProvider key={user?.uid ?? "signed-out"}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="vistoria/[code]" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="resumo/[code]" options={{ presentation: "modal" }} />
      </Stack>
    </WorkspaceProvider>
  );
}
