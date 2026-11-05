type FirestoreValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean };
type Fields = Record<string, FirestoreValue>;

type PointDocument = {
  name: string;
  fields?: Fields;
  updateTime: string;
};

type Write =
  | { delete: string }
  | { update: { name: string; fields: Fields }; currentDocument?: { exists: false } | { updateTime: string } };

export function firestoreFields(data: Record<string, string | number | boolean>): Fields {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    if (typeof value === "string") return [key, { stringValue: value }];
    if (typeof value === "boolean") return [key, { booleanValue: value }];
    if (Number.isSafeInteger(value)) return [key, { integerValue: String(value) }];
    return [key, { doubleValue: value }];
  }));
}

class FirestoreRequestError extends Error {
  constructor(readonly status: string, message: string) {
    super(message);
  }
}

export async function withPontoViciadoDocuments<T>(
  projectId: string,
  token: string,
  readOnly: boolean,
  apply: (docs: PointDocument[], writes: Write[], root: string) => T,
): Promise<T> {
  const root = `projects/${projectId}/databases/(default)/documents`;
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const base = host ? `http://${host}` : "https://firestore.googleapis.com";

  async function request<R>(method: string, body: object): Promise<R> {
    const response = await fetch(`${base}/v1/${root}:${method}`, {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new FirestoreRequestError(data.error?.status, data.error?.message ?? `Firestore HTTP ${response.status}`);
    }
    return data;
  }

  for (let attempt = 0; ; attempt++) {
    const writes: Write[] = [];
    let transaction: string | undefined;
    try {
      if (!readOnly) {
        ({ transaction } = await request<{ transaction: string }>("beginTransaction", { options: { readWrite: {} } }));
      }
      const rows = await request<{ document?: PointDocument }[]>("runQuery", {
        structuredQuery: { from: [{ collectionId: "customPontosViciados" }] },
        transaction,
      });
      const result = apply(rows.flatMap(({ document }) => document ? [document] : []), writes, root);
      if (transaction && writes.length) {
        await request("commit", { transaction, writes });
        transaction = undefined;
      }
      return result;
    } catch (error) {
      if (
        readOnly || attempt >= 4 || !(error instanceof FirestoreRequestError) ||
        !["ABORTED", "ALREADY_EXISTS", "FAILED_PRECONDITION"].includes(error.status)
      ) throw error;
    } finally {
      if (transaction) await request("rollback", { transaction }).catch(() => {});
    }
    await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt + Math.random() * 25));
  }
}
