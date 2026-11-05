import { getFirebaseAuth } from "@/lib/firebase";
import type { PontoFichaDraft } from "@/lib/ponto-ficha";

type PointDetails = {
  address: string;
  lat: number;
  lng: number;
  ficha: PontoFichaDraft;
};

type PointMutation =
  | (PointDetails & { action: "create"; requestId: string; expectedCode?: string })
  | (PointDetails & { action: "edit"; codigo: string; subprefeitura: string })
  | { action: "delete"; codigo: string };

type PointPreview = { action: "preview"; lat: number; lng: number };

export class PontoViciadoIdConflict extends Error {
  constructor(message: string, readonly nextCode: string) {
    super(message);
  }
}

async function requestPontoViciado(input: PointMutation | PointPreview, signal?: AbortSignal) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para continuar.");
  const response = await fetch("/api/pontos-viciados", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 409 && result.nextCode) {
      throw new PontoViciadoIdConflict(result.error, result.nextCode);
    }
    throw new Error(result.error);
  }
  return result;
}

export async function mutatePontoViciado(input: PointMutation): Promise<string> {
  return (await requestPontoViciado(input)).codigo;
}

export function previewPontoViciado(lat: number, lng: number, signal: AbortSignal): Promise<{
  codigo: string;
  subregional: string;
}> {
  return requestPontoViciado({ action: "preview", lat, lng }, signal);
}
