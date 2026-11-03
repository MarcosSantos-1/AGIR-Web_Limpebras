import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import type { FieldPoint } from "@/features/format";

const STATE_COLOR = { concluido: "#16a34a", pendente: "#eab308", inativo: "#71717a" } as const;
const SUB_COLOR: Record<string, string> = {
  "casa-verde": "#84cc16",
  "jacana-tremembe": "#1e3a5f",
  "vila-maria-guilherme": "#06b6d4",
  "santana-tucuruvi": "#ca8a04",
};

function subPaint(id: string) {
  return SUB_COLOR[id] ?? "#a1a1aa";
}

function ink(color: string) {
  return color === "#1e3a5f" ? "#ffffff" : "#18181b";
}

function distanceLabel(meters: number | null) {
  if (meters === null || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

function dateLabel(value: unknown) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "";
}

export function PointSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ marginHorizontal: 20, marginTop: 12, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: "#ffffff", paddingHorizontal: 14 }}>
      <Ionicons name="search" size={18} color="#71717a" />
      <TextInput
        accessibilityLabel="Buscar ponto"
        value={value}
        onChangeText={onChange}
        placeholder="Código ou endereço"
        placeholderTextColor="#a1a1aa"
        autoCapitalize="characters"
        autoCorrect={false}
        style={{ flex: 1, minHeight: 48, fontSize: 16, color: "#18181b" }}
      />
      {value ? <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => onChange("")} style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}><Ionicons name="close-circle" size={18} color="#a1a1aa" /></Pressable> : null}
    </View>
  );
}

export function matchesPointQuery(point: FieldPoint, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const address = String(point.row?.answers?.endereco ?? "").toLowerCase();
  return point.code.toLowerCase().includes(text) || address.includes(text) || point.subLabel.toLowerCase().includes(text);
}

export function PointRow({ point, onPress, showPhoto = false }: { point: FieldPoint; onPress: () => void; showPhoto?: boolean }) {
  const color = subPaint(point.subId);
  const done = point.state === "concluido";
  const address = String(point.row?.answers?.endereco ?? "Endereço a preencher");
  const when = dateLabel(point.row?.answers?.dataChecagem);
  const photo = point.row?.photos?.[0]?.url;
  const stateColor = STATE_COLOR[point.state] ?? STATE_COLOR.pendente;
  const status = done ? "Concluído" : point.state === "inativo" ? "Inativo" : point.row?.revision > 0 ? "Rascunho" : "Pendente";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${point.code}, ${status}, ${address}`}
      onPress={onPress}
      style={{ minHeight: 84, flexDirection: "row", overflow: "hidden", borderRadius: 22, backgroundColor: "#ffffff" }}
    >
      <View style={{ width: 7, backgroundColor: color }} />
      {showPhoto ? (photo ? <Image source={{ uri: photo }} style={{ width: 84, height: 84 }} accessibilityLabel={`Foto de ${point.code}`} /> : <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f5" }}><Ionicons name="image-outline" size={22} color="#a1a1aa" /></View>) : null}
      <View style={{ flex: 1, justifyContent: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={done ? "checkmark-circle" : point.state === "inativo" ? "remove-circle-outline" : "location-outline"} size={18} color={done ? "#16a34a" : stateColor} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: "#18181b" }}>{point.code}</Text>
          <Ionicons name="navigate" size={14} color="#2563eb" />
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563eb" }}>{distanceLabel(point.distance)}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: 13, color: "#52525b" }}>{address}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ borderRadius: 999, backgroundColor: color, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: ink(color) }}>{point.subLabel}</Text>
          </View>
          <Text style={{ fontSize: 12, color: "#71717a" }}>{status}{done && when ? ` · ${when}` : ""}</Text>
        </View>
      </View>
    </Pressable>
  );
}
