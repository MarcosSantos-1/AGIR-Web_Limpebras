import { useLocalSearchParams, useRouter } from "expo-router";
import { type JSX } from "react";
import { Text, View } from "react-native";
import { Button } from "heroui-native";
import { VistoriaWizard } from "@/components/vistoria-wizard";
import { useWorkspace } from "@/features/workspace";

export default function VistoriaScreen(): JSX.Element {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { ready, points } = useWorkspace();
  const point = points.find((item) => item.code === code);
  if (!ready) return <View className="flex-1 items-center justify-center bg-background"><Text className="text-muted">Carregando o ponto…</Text></View>;
  if (!point) return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text className="text-center text-base text-foreground">Este ponto não está no levantamento aberto.</Text>
      <Button className="min-h-12" onPress={() => router.back()}>Voltar</Button>
    </View>
  );
  return <VistoriaWizard key={point.row.id} initial={point.row} onClose={() => router.back()} onSaved={() => router.back()} />;
}
