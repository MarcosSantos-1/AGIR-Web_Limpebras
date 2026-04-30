import type { ActionCompletionPayload } from "@/components/acao-registro/action-completion-dialog";
import type { GaleriaSetDoc } from "@/data/gallery-sets";
import { replaceGaleriaSetDoc } from "@/lib/firestore/gallery";
import { replaceDataUrlsWithStorage } from "@/lib/storage/upload-helpers";

export async function persistGaleriaDialog(
  id: number,
  payload: ActionCompletionPayload,
  existing: GaleriaSetDoc,
): Promise<void> {
  const urls = await replaceDataUrlsWithStorage(
    payload.photoDataUrls,
    `galeria/${id}/extras`,
  );
  await replaceGaleriaSetDoc({
    ...existing,
    registroDescription: payload.description,
    registroObservations: payload.observations,
    registroPhotoUrls: urls ?? [],
  });
}
