export type PendingDiagnosticPhoto = { id: string; file: File; caption?: string };

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("agir-diagnostic-drafts", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("photos"); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readDraftPhotos(key: string): Promise<PendingDiagnosticPhoto[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction("photos").objectStore("photos").get(key);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
export async function writeDraftPhotos(key: string, photos: PendingDiagnosticPhoto[]) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    if (photos.length) tx.objectStore("photos").put(photos, key); else tx.objectStore("photos").delete(key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
