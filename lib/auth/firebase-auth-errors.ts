import { FirebaseError } from "firebase/app";

function messageForAuthCode(code: string): string | null {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "E-mail ou senha incorretos. Confira os dados ou use Esqueci a senha.";
    case "auth/invalid-email":
      return "Informe um e-mail válido.";
    case "auth/user-disabled":
      return "Esta conta foi desativada. Procure o administrador.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    case "auth/network-request-failed":
      return "Sem conexão ou falha de rede. Verifique a internet.";
    case "auth/operation-not-allowed":
      return "Este método de login não está habilitado no Firebase (Console → Authentication).";
    case "auth/weak-password":
      return "Escolha uma senha mais forte (mínimo 6 caracteres).";
    case "auth/password-does-not-meet-requirements":
      return "A senha não cumpre os requisitos configurados no Firebase.";
    case "auth/expired-action-code":
      return "Este link expirou. Peça um novo convite por e-mail.";
    case "auth/invalid-action-code":
      return "Este link não é mais válido ou já foi usado. Peça um novo convite.";
    default:
      return null;
  }
}

function authCodeFromUnknown(err: unknown): string | null {
  if (err instanceof FirebaseError) {
    return err.code;
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  ) {
    return (err as { code: string }).code;
  }
  if (err instanceof Error) {
    const bracket = err.message.match(/\(auth\/[^)]+\)/);
    if (bracket) {
      return bracket[0].slice(1, -1);
    }
  }
  return null;
}

/** Mensagens em pt-BR para códigos comuns do Firebase Auth no cliente. */
export function mapFirebaseAuthError(err: unknown): string {
  const code = authCodeFromUnknown(err);
  if (code) {
    const mapped = messageForAuthCode(code);
    if (mapped) {
      return mapped;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Não foi possível concluir. Tente de novo.";
}
