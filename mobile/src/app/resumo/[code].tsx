import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type JSX } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CONDICOES, ORIGENS, PROXIMIDADES, RESIDUOS, impactChoices, isMarked, volumeChoices } from "../../../../lib/vistoria-form";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { formatDate, inkOn, subColor } from "@/features/format";
import { useWorkspace } from "@/features/workspace";

const GROUP_ICONS = {
  residuos: "trash-outline",
  origens: "git-branch-outline",
  condicoes: "eye-outline",
  proximidades: "walk-outline",
} as const;

export default function SummaryScreen(): JSX.Element {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { points, survey } = useWorkspace();
  const [photo, setPhoto] = useState<string | null>(null);
  const point = points.find((item) => item.code === code);
  if (!point) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f4f5", paddingHorizontal: 24 }}>
      <Text style={{ textAlign: "center", fontFamily: "Geist_500Medium", color: "#18181b" }}>Não encontrei este ponto no levantamento.</Text>
    </View>
  );
  const record = point.row;
  const version = record.questionnaireVersion;
  const color = subColor(point.subId);
  const volume = volumeChoices(version).find((choice) => choice.value === record.answers.volume)?.label ?? String(record.answers.volume ?? "—");
  const pedestrians = impactChoices("impactoPedestres", version).find((choice) => choice.value === record.answers.impactoPedestres)?.label ?? "—";
  const vehicles = impactChoices("impactoVeiculos", version).find((choice) => choice.value === record.answers.impactoVeiculos)?.label ?? "—";
  const marked = (items: { key: string; label: string }[]) => items.filter((item) => isMarked(record.answers[item.key]));
  return (
    <View style={{ flex: 1, backgroundColor: "#f4f4f5", paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar resumo" onPress={() => router.back()} style={{ height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#ffffff" }}>
          <Ionicons name="close" size={22} color="#18181b" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 20, color: "#18181b" }}>{point.code}</Text>
          <Text style={{ fontFamily: "Geist_400Regular", fontSize: 12, color: "#71717a" }}>{formatDate(record.answers.dataChecagem)}</Text>
        </View>
        <View style={{ borderRadius: 999, backgroundColor: color, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 12, color: inkOn(color) }}>{point.subLabel}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ gap: 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {record.photos.length ? record.photos.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" accessibilityLabel="Ampliar foto" onPress={() => setPhoto(item.url)}>
              <Image source={{ uri: item.url }} style={{ height: 180, width: 240, borderRadius: 24, backgroundColor: "#e4e4e7" }} />
            </Pressable>
          )) : <View style={{ height: 140, width: "100%", alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#ffffff" }}><Ionicons name="image-outline" size={28} color="#a1a1aa" /></View>}
        </ScrollView>
        <Text style={{ fontFamily: "Geist_400Regular", fontSize: 14, color: "#3f3f46" }}>{String(record.answers.endereco ?? "—")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <InfoPill icon="pulse" label="Situação" value={String(record.answers.statusTrimestral ?? "—")} />
          <InfoPill icon="cube-outline" label="Volume" value={volume} />
          <InfoPill icon="walk" label="Pedestres" value={pedestrians} />
          <InfoPill icon="bus" label="Veículos" value={vehicles} />
        </View>
        <TagGroup icon={GROUP_ICONS.residuos} title="Resíduos" items={marked(RESIDUOS)} />
        <TagGroup icon={GROUP_ICONS.origens} title="Origem" items={marked(ORIGENS)} />
        <TagGroup icon={GROUP_ICONS.condicoes} title="Condições" items={marked(CONDICOES)} />
        <TagGroup icon={GROUP_ICONS.proximidades} title="Perto" items={marked(PROXIMIDADES)} />
        <InfoPill icon="chatbubble-ellipses-outline" label="Observações" value={record.notes.trim() || "Sem observações"} />
        <InfoPill icon="person-outline" label="Responsável" value={record.responsibleName || "—"} />
        {survey?.status === "em-preenchimento" ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Reabrir vistoria de ${point.code}`} onPress={() => router.replace(`/vistoria/${point.code}`)} style={{ marginTop: 28, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 18, backgroundColor: "#15803d" }}>
            <Ionicons name="create-outline" size={20} color="#ffffff" />
            <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 16, color: "#ffffff" }}>Reabrir vistoria</Text>
          </Pressable>
        ) : <View style={{ height: 24 }} />}
      </ScrollView>
      <PhotoLightbox uri={photo} onClose={() => setPhoto(null)} />
    </View>
  );
}

function InfoPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ minWidth: "47%", flexGrow: 1, gap: 4, borderRadius: 18, backgroundColor: "#ffffff", paddingHorizontal: 14, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={16} color="#15803d" />
        <Text style={{ fontFamily: "Geist_500Medium", fontSize: 12, color: "#71717a" }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 14, lineHeight: 20, color: "#18181b" }}>{value}</Text>
    </View>
  );
}

function TagGroup({ icon, title, items }: { icon: keyof typeof Ionicons.glyphMap; title: string; items: { key: string; label: string }[] }) {
  return (
    <View style={{ gap: 8, borderRadius: 18, backgroundColor: "#ffffff", padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={16} color="#15803d" />
        <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 14, color: "#18181b" }}>{title}</Text>
      </View>
      <Text style={{ fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 18, color: "#3f3f46" }}>{items.length ? items.map((item) => item.label).join(" · ") : "Nada marcado"}</Text>
    </View>
  );
}
