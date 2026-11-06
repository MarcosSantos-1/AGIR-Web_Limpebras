import { Ionicons } from "@expo/vector-icons";
import { Image, Linking, Modal, Pressable as Backdrop, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedbackPressable as Pressable } from "./feedback-pressable";
import type { FieldPoint } from "@/features/format";

const mapsIcon = require("../../assets/images/maps.png");
const wazeIcon = require("../../assets/images/waze-icon-logo.png");

function coordsOf(point: FieldPoint) {
  if (!point.position) return null;
  const [latitude, longitude] = point.position;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export function openGoogleMaps(point: FieldPoint) {
  const coords = coordsOf(point);
  if (!coords) return;
  const { latitude, longitude } = coords;
  return Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`);
}

export function openWaze(point: FieldPoint) {
  const coords = coordsOf(point);
  if (!coords) return;
  const { latitude, longitude } = coords;
  return Linking.openURL(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`);
}

export function RouteButtons({ point }: { point: FieldPoint }) {
  const disabled = !coordsOf(point);
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir no Google Maps" disabled={disabled} onPress={() => void openGoogleMaps(point)} style={{ flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#f4f4f5", opacity: disabled ? 0.4 : 1 }}>
        <Image source={mapsIcon} style={{ width: 28, height: 28, borderRadius: 6 }} />
        <Text style={{ fontWeight: "700", color: "#18181b" }}>Maps</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir no Waze" disabled={disabled} onPress={() => void openWaze(point)} style={{ flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, backgroundColor: "#e0f7ff", opacity: disabled ? 0.4 : 1 }}>
        <Image source={wazeIcon} style={{ width: 28, height: 28, borderRadius: 6 }} />
        <Text style={{ fontWeight: "700", color: "#18181b" }}>Waze</Text>
      </Pressable>
    </View>
  );
}

export function PointPreview({ point, onClose, onContinue, showRoutes = true }: { point: FieldPoint | null; onClose: () => void; onContinue: (point: FieldPoint) => void; showRoutes?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!point} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Backdrop accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <View style={{ maxHeight: "85%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#ffffff" }} onStartShouldSetResponder={() => true}>
        <ScrollView bounces={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 24 }}>
          {point ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name={point.state === "concluido" ? "checkmark-circle" : "location-outline"} size={22} color={point.state === "concluido" ? "#16a34a" : "#eab308"} />
                <Text style={{ flex: 1, fontSize: 20, fontWeight: "700", color: "#18181b" }}>{point.code}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="close" size={22} color="#18181b" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 14, color: "#52525b" }}>{String(point.row.answers.endereco ?? "")}</Text>
              <Text style={{ fontSize: 13, color: "#71717a" }}>{point.subLabel}</Text>
              {showRoutes ? <RouteButtons point={point} /> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={point.state === "concluido" ? "Ver resumo" : "Ir para o registro"} onPress={() => onContinue(point)} style={{ minHeight: 52, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#15803d" }}>
                <Text style={{ fontWeight: "700", color: "#ffffff" }}>{point.state === "concluido" ? "Ver resumo" : "Ir para o registro"}</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
        </View>
      </Backdrop>
    </Modal>
  );
}
