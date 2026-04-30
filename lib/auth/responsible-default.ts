import type { User } from "firebase/auth";

/** Primeiro token do nome (perfil, displayName ou parte do e-mail). */
export function firstNameForResponsible(
  user: User | null | undefined,
  profileNome?: string | null,
): string {
  const firstToken = (raw: string) => {
    const t = raw.trim();
    if (!t) return "";
    return t.split(/\s+/)[0] ?? "";
  };

  const fromProfile = profileNome ? firstToken(profileNome) : "";
  if (fromProfile) return fromProfile;

  const dn = user?.displayName?.trim();
  if (dn) return firstToken(dn);

  const email = user?.email?.trim();
  if (email) {
    const local = email.split("@")[0]?.trim() ?? "";
    if (!local) return "";
    if (local.includes(".") || local.includes("_") || local.includes("-")) {
      return firstToken(local.replace(/[._-]+/g, " "));
    }
    return firstToken(local);
  }

  return "";
}
