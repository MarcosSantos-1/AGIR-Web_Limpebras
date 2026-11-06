import { Spinner } from "heroui-native";
import { useDeferredValue, useMemo, useState, type JSX } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { EmptyState, Notice, SubFilterBar } from "@/components/field-chrome";
import { matchesPointQuery, PointRow, PointSearch } from "@/components/point-row";
import { PointPreview } from "@/components/point-preview";
import type { FieldPoint } from "@/features/format";
import { useWorkspace } from "@/features/workspace";

export default function DoneScreen(): JSX.Element {
  const router = useRouter();
  const { ready, error, survey, points } = useWorkspace();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [visibleCount, setVisibleCount] = useState(40);
  const [picked, setPicked] = useState<FieldPoint | null>(null);
  const done = useMemo(() => points.filter((point) => point.state === "concluido" && matchesPointQuery(point, deferredQuery)), [points, deferredQuery]);
  const shown = done.slice(0, visibleCount);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f4f5" }} edges={["top", "left", "right"]}>
      <View className="px-5 pb-3 pt-2">
        <Text className="text-2xl font-semibold text-foreground">Preenchidos</Text>
        <Text className="mt-1 text-sm text-muted">{shown.length} de {done.length}, do mais próximo ao mais longe</Text>
      </View>
      <SubFilterBar mode="done" />
      <PointSearch value={query} onChange={(next) => { setQuery(next); setVisibleCount(40); }} />
      <View style={{ flex: 1, marginTop: 12 }}>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {!ready ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Spinner /></View> : !survey ? <EmptyState title="Nenhum levantamento aberto" body="Quando houver um levantamento em preenchimento, os pontos concluídos aparecem aqui." /> : done.length === 0 ? <EmptyState title={query ? "Nenhum ponto com essa busca" : "Nenhum ponto concluído"} body={query ? "Tente o código ou um pedaço do endereço." : "Os pontos concluídos aparecem com a foto, a data e a cor da sub-regional."} /> : (
          <FlatList
            style={{ flex: 1 }}
            data={shown}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 24 }}
            renderItem={({ item }) => <PointRow point={item} showPhoto onPress={() => setPicked(item)} />}
            ListFooterComponent={shown.length < done.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Mostrar mais 40 pontos concluídos" onPress={() => setVisibleCount((count) => count + 40)} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#ffffff" }}>
                <Text style={{ fontWeight: "700", color: "#15803d" }}>Ver mais 40</Text>
              </Pressable>
            ) : undefined}
          />
        )}
      </View>
      <PointPreview showRoutes={false} point={picked} onClose={() => setPicked(null)} onContinue={(point) => { setPicked(null); router.push(`/resumo/${point.code}`); }} />
    </SafeAreaView>
  );
}
