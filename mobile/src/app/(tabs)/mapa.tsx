import { Button, Spinner } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { memo, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useRouter } from "expo-router";
import { EmptyState, Notice, SubFilterBar } from "@/components/field-chrome";
import { RouteButtons } from "@/components/point-preview";
import { formatDate, formatDistance, inkOn, pointStatusLabel, statusColor, subColor, type FieldPoint } from "@/features/format";
import { useWorkspace } from "@/features/workspace";

const SAO_PAULO: Region = { latitude: -23.48, longitude: -46.63, latitudeDelta: 0.12, longitudeDelta: 0.12 };

export default function MapScreen(): JSX.Element {
  const router = useRouter();
  const focused = useIsFocused();
  const centeredOnUser = useRef(false);
  const mapRef = useRef<MapView>(null);
  const { ready, error, survey, points, location } = useWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [slowMap, setSlowMap] = useState(false);
  const visible = useMemo(() => points.filter((point) => point.position).slice(0, 300), [points]);
  const current = visible.find((point) => point.code === selected) ?? null;

  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);
  const fitKey = visible.map((point) => `${point.code}:${point.position?.join(",")}`).sort().join("|");

  useEffect(() => {
    if (mapLoaded) return;
    const timer = setTimeout(() => setSlowMap(true), 20_000);
    return () => clearTimeout(timer);
  }, [mapLoaded]);

  useEffect(() => {
    if (!focused) {
      centeredOnUser.current = false;
      return;
    }
    if (!mapReady || !location || centeredOnUser.current || !mapRef.current) return;
    centeredOnUser.current = true;
    mapRef.current.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003,
    }, 850);
  }, [focused, location, mapReady]);

  useEffect(() => {
    const pointsNow = visibleRef.current.filter((point) => point.position);
    if (!focused || !mapReady || location || !pointsNow.length) return;
    const coordinates = pointsNow.map((point) => ({ latitude: point.position![0], longitude: point.position![1] }));
    const frame = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, { edgePadding: { top: 72, right: 48, bottom: 88, left: 48 }, animated: true });
    }, 500);
    return () => clearTimeout(frame);
  }, [fitKey, focused, location, mapReady]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mapa</Text>
        <Text style={styles.subtitle}>{survey ? `${visible.length} pontos neste filtro · verde concluído, amarelo pendente, cinza inativo` : "Abra um levantamento no AGIR para ver os pontos"}</Text>
      </View>
      <SubFilterBar />
      {error ? <View style={{ marginTop: 12 }}><Notice tone="danger">{error}</Notice></View> : null}
      {slowMap && !mapLoaded ? <Notice tone="warning">O mapa está demorando para carregar. Confira a conexão; a lista de pontos continua disponível na aba Perto.</Notice> : null}
      <View style={styles.mapWrap} collapsable={false}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          onMapReady={() => setMapReady(true)}
          onMapLoaded={() => setMapLoaded(true)}
          initialRegion={SAO_PAULO}
          onPress={(event) => { if (event.nativeEvent.action !== "marker-press") setSelected(null); }}
          moveOnMarkerPress={false}
          showsUserLocation
          showsMyLocationButton
          toolbarEnabled={false}
          loadingEnabled
        >
          {visible.map((point) => point.position ? <PointMarker key={point.code} code={point.code} state={point.state} latitude={point.position[0]} longitude={point.position[1]} onSelect={setSelected} /> : null)}
        </MapView>
        {!ready || !mapReady ? <View pointerEvents="none" style={styles.loading}><Spinner /><Text style={styles.subtitle}>{!ready ? "Carregando os pontos…" : "Abrindo mapa…"}</Text></View> : null}
        {ready && !survey ? <View style={styles.loading}><EmptyState title="Nenhum levantamento aberto" body="O mapa mostra os pontos do levantamento que estiver em preenchimento." /></View> : null}
        {current ? <View style={[styles.card, { borderLeftWidth: 6, borderLeftColor: subColor(current.subId) }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={current.state === "concluido" ? "checkmark-circle" : "location-outline"} size={22} color={current.state === "concluido" ? "#16a34a" : statusColor(current.state)} />
            <Text style={styles.cardTitle}>{current.code}</Text>
            <View style={{ marginLeft: "auto", borderRadius: 999, backgroundColor: subColor(current.subId), paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 11, color: inkOn(subColor(current.subId)) }}>{current.subLabel}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes do ponto" hitSlop={10} onPress={() => setSelected(null)}>
              <Ionicons name="close" size={24} color="#52525b" />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{String(current.row.answers.endereco ?? "")}</Text>
          <Text style={styles.meta}>{pointStatusLabel(current)}{current.state === "concluido" ? ` · visto em ${formatDate(current.row.answers.dataChecagem)}` : ""} · {formatDistance(current.distance)}</Text>
          <RouteButtons point={current} />
          <Button className="min-h-12" accessibilityLabel={current.state === "concluido" ? `Ver resumo de ${current.code}` : `Preencher ${current.code}`} onPress={() => router.push(current.state === "concluido" ? `/resumo/${current.code}` : `/vistoria/${current.code}`)}>{current.state === "concluido" ? "Ver resumo" : "Preencher"}</Button>
        </View> : null}
      </View>
    </SafeAreaView>
  );
}

const PointMarker = memo(function PointMarker({ code, state, latitude, longitude, onSelect }: { code: string; state: FieldPoint["state"]; latitude: number; longitude: number; onSelect: (code: string) => void }) {
  return (
    <Marker
      coordinate={{ latitude, longitude }}
      pinColor={statusColor(state)}
      tracksViewChanges={false}
      stopPropagation
      onPress={() => onSelect(code)}
    />
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f4f5" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: "Geist_600SemiBold", fontSize: 28, color: "#18181b" },
  subtitle: { marginTop: 4, fontFamily: "Geist_400Regular", fontSize: 13, lineHeight: 18, color: "#52525b" },
  mapWrap: { flex: 1, marginTop: 12, minHeight: 320, position: "relative" },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,244,245,0.72)" },
  card: { position: "absolute", left: 16, right: 16, bottom: 16, gap: 8, borderRadius: 24, backgroundColor: "#ffffff", padding: 16 },
  cardTitle: { fontFamily: "Geist_600SemiBold", fontSize: 18, color: "#18181b" },
  meta: { fontFamily: "Geist_400Regular", fontSize: 12, color: "#71717a" },
});
