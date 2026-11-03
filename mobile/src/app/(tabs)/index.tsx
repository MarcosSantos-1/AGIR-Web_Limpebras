import { signOut } from "firebase/auth";
import { Spinner } from "heroui-native";
import { useMemo, useState, type JSX } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { EmptyState, Notice, SubFilterBar } from "@/components/field-chrome";
import { matchesPointQuery, PointRow, PointSearch } from "@/components/point-row";
import { PointPreview } from "@/components/point-preview";
import type { FieldPoint } from "@/features/format";
import { useWorkspace } from "@/features/workspace";
import { getFirebaseAuth } from "@/lib/firebase";

export default function NearbyScreen(): JSX.Element {
  const router = useRouter();
  const { ready, error, warning, survey, progress, points, location } = useWorkspace();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<FieldPoint | null>(null);
  const pending = useMemo(() => points.filter((point) => point.state !== "concluido" && matchesPointQuery(point, query)).slice(0, 30), [points, query]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f4f5" }} edges={["top", "left", "right"]}>
      <View className="flex-row items-start justify-between px-5 pb-3 pt-2">
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-semibold text-foreground">Perto de você</Text>
          <Text className="mt-1 text-sm text-muted">{survey ? `${survey.title} · ${progress.completed} de ${progress.total} concluídos` : "Nenhum levantamento em preenchimento"}</Text>
          <Text className="text-xs text-muted">{location?.accuracy ? `30 mais próximos · GPS ±${Math.round(location.accuracy)} m` : "30 mais próximos nesta ordem"}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sair da conta" onPress={() => void signOut(getFirebaseAuth())} className="min-h-12 justify-center px-2">
          <Text className="text-sm font-semibold text-accent">Sair</Text>
        </Pressable>
      </View>
      <SubFilterBar />
      <PointSearch value={query} onChange={setQuery} />
      <View style={{ flex: 1, marginTop: 12 }}>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {warning ? <View className="mt-3"><Notice tone="warning">{warning}</Notice></View> : null}
        {!ready ? <View className="flex-1 items-center justify-center"><Spinner /><Text className="mt-3 text-sm text-muted">Carregando pontos do levantamento…</Text></View> : !survey ? <EmptyState title="Nenhum levantamento aberto" body="Abra um levantamento na página de Diagnósticos do AGIR. Ele aparece aqui para a equipe de campo." /> : pending.length === 0 ? <EmptyState title={query ? "Nenhum ponto com essa busca" : "Nada pendente neste filtro"} body={query ? "Tente o código, como CV-001, ou um pedaço do endereço." : "Troque a sub-regional ou veja os pontos já preenchidos na aba Feitos."} /> : (
          <FlatList style={{ flex: 1 }} data={pending} keyExtractor={(item) => item.code} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 24 }} renderItem={({ item }) => <PointRow point={item} onPress={() => setPicked(item)} />} />
        )}
      </View>
      <PointPreview point={picked} onClose={() => setPicked(null)} onContinue={(point) => { setPicked(null); router.push(point.state === "concluido" ? `/resumo/${point.code}` : `/vistoria/${point.code}`); }} />
    </SafeAreaView>
  );
}
