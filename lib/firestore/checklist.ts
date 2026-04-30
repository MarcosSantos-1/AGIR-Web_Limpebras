import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { DailyChecklistTask } from "@/lib/checklist-types";
import { getFirebaseDb } from "@/lib/firebase";

export function subscribeDailyChecklist(
  uid: string,
  onNext: (tasks: DailyChecklistTask[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, `users/${uid}/dailyChecklistItems`);
  return onSnapshot(
    col,
    (snap) => {
      const tasks = snap.docs
        .map((d) => d.data() as DailyChecklistTask)
        .sort((a, b) => a.id - b.id);
      onNext(tasks);
    },
    (err) => onError?.(err as Error),
  );
}

export async function upsertChecklistTask(
  uid: string,
  task: DailyChecklistTask,
): Promise<void> {
  const db = getFirebaseDb();
  const r = doc(db, `users/${uid}/dailyChecklistItems`, String(task.id));
  await setDoc(r, task, { merge: true });
}

export async function deleteChecklistTask(
  uid: string,
  taskId: number,
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, `users/${uid}/dailyChecklistItems`, String(taskId)));
}
