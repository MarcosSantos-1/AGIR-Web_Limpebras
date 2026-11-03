import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, Text } from "react-native";

export function PhotoLightbox({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar foto" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Ionicons name="close" size={28} color="#ffffff" style={{ position: "absolute", top: 56, right: 20 }} />
        {uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: "100%", height: "78%" }} accessibilityLabel="Foto ampliada do ponto" /> : null}
        <Text style={{ marginTop: 16, color: "#e4e4e7", fontFamily: "Geist_400Regular" }}>Toque para fechar</Text>
      </Pressable>
    </Modal>
  );
}
