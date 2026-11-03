import { Platform, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export function PointMiniMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <View style={{ height: 148, overflow: "hidden", borderRadius: 18 }} accessibilityLabel="Mapa da localização do ponto">
      <MapView
        style={{ flex: 1 }}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        liteMode={Platform.OS === "android"}
        initialRegion={{ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
      >
        <Marker coordinate={{ latitude, longitude }} pinColor="#16a34a" />
      </MapView>
    </View>
  );
}
