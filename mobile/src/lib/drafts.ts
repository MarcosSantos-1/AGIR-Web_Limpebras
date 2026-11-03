import AsyncStorage from "@react-native-async-storage/async-storage";
import { copyAsync, deleteAsync, documentDirectory, getInfoAsync, makeDirectoryAsync } from "expo-file-system/legacy";
import type { Diagnostic } from "../../../lib/diagnosticos";

export type PendingPhoto = { id: string; uri: string; mime: string };

function draftKey(uid: string, recordId: string) {
  return `agir:campo:${uid}:${recordId}`;
}

function photoKey(uid: string, recordId: string) {
  return `agir:campo:photos:${uid}:${recordId}`;
}

function photoFolder() {
  if (!documentDirectory) throw new Error("Este aparelho não ofereceu uma pasta para o rascunho.");
  return `${documentDirectory}diagnostic-drafts/`;
}

async function ensureFolder() {
  const folder = photoFolder();
  const info = await getInfoAsync(folder);
  if (!info.exists) await makeDirectoryAsync(folder, { intermediates: true });
  return folder;
}

export async function readDraft(uid: string, recordId: string): Promise<Diagnostic | null> {
  const raw = await AsyncStorage.getItem(draftKey(uid, recordId));
  if (!raw) return null;
  return JSON.parse(raw) as Diagnostic;
}

export async function writeDraft(uid: string, record: Diagnostic) {
  await AsyncStorage.setItem(draftKey(uid, record.id), JSON.stringify(record));
}

export async function clearDraft(uid: string, recordId: string) {
  await AsyncStorage.removeItem(draftKey(uid, recordId));
  const photos = await readDraftPhotos(uid, recordId);
  await Promise.all(photos.map((photo) => deleteAsync(photo.uri, { idempotent: true })));
  await AsyncStorage.removeItem(photoKey(uid, recordId));
}

export async function readDraftPhotos(uid: string, recordId: string): Promise<PendingPhoto[]> {
  const raw = await AsyncStorage.getItem(photoKey(uid, recordId));
  if (!raw) return [];
  const photos = JSON.parse(raw) as PendingPhoto[];
  const existing = await Promise.all(photos.map(async (photo) => ({ photo, info: await getInfoAsync(photo.uri) })));
  return existing.filter((item) => item.info.exists).map((item) => item.photo);
}

export async function writeDraftPhotos(uid: string, recordId: string, photos: PendingPhoto[]) {
  await AsyncStorage.setItem(photoKey(uid, recordId), JSON.stringify(photos));
}

export async function persistPhotoFile(id: string, sourceUri: string) {
  const folder = await ensureFolder();
  const destination = `${folder}${id}.jpg`;
  await copyAsync({ from: sourceUri, to: destination });
  return destination;
}
