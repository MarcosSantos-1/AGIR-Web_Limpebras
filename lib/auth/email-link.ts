/** Chave localStorage (padrão Firebase) para completar signInWithEmailLink. */
export const EMAIL_LINK_STORAGE_KEY = "agir_emailForSignIn";

export function getEmailLinkContinueUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/login/email-link`;
}
