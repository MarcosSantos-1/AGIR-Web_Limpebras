import { signInWithEmailAndPassword } from "firebase/auth";
import { Button, Input } from "heroui-native";
import { useEffect, useRef, useState, type ComponentRef, type JSX } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth";
import { getFirebaseAuth } from "@/lib/firebase";

function messageFor(code: string) {
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "E-mail ou senha não conferem com o AGIR.";
  if (code.includes("network")) return "Sem rede para entrar. Tente de novo quando a conexão voltar.";
  if (code.includes("too-many-requests")) return "Muitas tentativas. Espere um pouco e tente outra vez.";
  return "Não foi possível entrar. Confira os dados e tente de novo.";
}

export default function LoginScreen(): JSX.Element {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    });
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  async function submit() {
    setError("");
    if (!configured) { setError("O Firebase deste app ainda não foi configurado."); return; }
    setBusy(true);
    try { await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password); }
    catch (cause) {
      const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
      const known = messageFor(code);
      const detail = cause instanceof Error ? cause.message : "";
      setError(known !== "Não foi possível entrar. Confira os dados e tente de novo." || !detail ? known : detail);
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f4f4f5" }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ flexGrow: 1, justifyContent: keyboardHeight > 0 ? "flex-start" : "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: (Platform.OS === "android" ? keyboardHeight : 0) + 24 }}>
        <Text style={{ fontFamily: "Geist_600SemiBold", fontSize: 13, letterSpacing: 1.2, color: "#15803d" }}>AGIR CAMPO</Text>
        <Text style={{ marginTop: 8, fontFamily: "Geist_600SemiBold", fontSize: 32, color: "#18181b" }}>Diagnósticos</Text>
        <Text style={{ marginTop: 8, fontFamily: "Geist_400Regular", fontSize: 16, lineHeight: 24, color: "#52525b" }}>Entre com o mesmo usuário do AGIR para preencher o levantamento.</Text>
        {!configured ? <Text accessibilityRole="alert" style={{ marginTop: 24, borderRadius: 16, backgroundColor: "#fef3c7", padding: 16, fontFamily: "Geist_400Regular", fontSize: 14, color: "#18181b" }}>Preencha EXPO_PUBLIC_FIREBASE_* em mobile/.env com as mesmas chaves do site.</Text> : null}
        <View style={{ marginTop: 28, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: "Geist_500Medium", fontSize: 14, color: "#18181b" }}>E-mail</Text>
            <Input accessibilityLabel="E-mail" autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" value={email} onChangeText={setEmail} placeholder="nome@limpeza.com" />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: "Geist_500Medium", fontSize: 14, color: "#18181b" }}>Senha</Text>
            <Input accessibilityLabel="Senha" secureTextEntry autoComplete="password" textContentType="password" value={password} onChangeText={setPassword} placeholder="Sua senha" />
          </View>
          {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ borderRadius: 16, backgroundColor: "#fee2e2", paddingHorizontal: 16, paddingVertical: 12, fontFamily: "Geist_400Regular", fontSize: 14, lineHeight: 20, color: "#b91c1c" }}>{error}</Text> : null}
          <Button isDisabled={busy} accessibilityLabel="Entrar" onPress={() => void submit()}>{busy ? "Entrando…" : "Entrar"}</Button>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
