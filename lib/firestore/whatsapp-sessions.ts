import * as admin from "firebase-admin";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import type { WhatsAppSession } from "@/lib/whatsapp/session-state";

/**
 * Estado das conversas do bot. O webhook corre em funções sem memória entre
 * pedidos, por isso o passo atual e o rascunho vivem no Firestore.
 *
 * Todo o acesso é via Admin SDK: o bot não tem utilizador autenticado e as
 * regras do Firestore negariam a escrita.
 */

export const SESSIONS_COLLECTION = "whatsappSessions";
export const CONTACTS_COLLECTION = "whatsappContacts";
export const PROCESSED_COLLECTION = "whatsappProcessedMessages";

export type WhatsAppContact = {
  nome: string;
  setor: string;
  /** Nome do perfil do WhatsApp, guardado só como referência. */
  profileName?: string;
  updatedAtMs: number;
};

function db(): admin.firestore.Firestore {
  return admin.firestore(getFirebaseAdminApp());
}

export async function readSession(
  phone: string,
): Promise<WhatsAppSession | null> {
  const snap = await db().collection(SESSIONS_COLLECTION).doc(phone).get();
  if (!snap.exists) return null;
  return snap.data() as WhatsAppSession;
}

export async function writeSession(
  phone: string,
  session: WhatsAppSession,
): Promise<void> {
  await db().collection(SESSIONS_COLLECTION).doc(phone).set(session);
}

export async function clearSession(phone: string): Promise<void> {
  await db().collection(SESSIONS_COLLECTION).doc(phone).delete();
}

export async function readContact(
  phone: string,
): Promise<WhatsAppContact | null> {
  const snap = await db().collection(CONTACTS_COLLECTION).doc(phone).get();
  if (!snap.exists) return null;
  return snap.data() as WhatsAppContact;
}

export async function writeContact(
  phone: string,
  contact: Omit<WhatsAppContact, "updatedAtMs">,
): Promise<void> {
  const payload: Record<string, unknown> = {
    nome: contact.nome,
    setor: contact.setor,
    updatedAtMs: Date.now(),
  };
  if (contact.profileName) payload.profileName = contact.profileName;
  await db()
    .collection(CONTACTS_COLLECTION)
    .doc(phone)
    .set(payload, { merge: true });
}

/**
 * A Meta reentrega webhooks quando não recebe 200 a tempo. Registar o `wamid`
 * com `create()` falha se o documento já existir, o que dá idempotência sem
 * precisar de uma leitura extra.
 */
export async function claimMessage(wamid: string): Promise<boolean> {
  try {
    await db()
      .collection(PROCESSED_COLLECTION)
      .doc(sanitizeDocId(wamid))
      .create({ processedAtMs: Date.now() });
    return true;
  } catch {
    return false;
  }
}

/** IDs do Firestore não podem conter "/" — os `wamid` da Meta são base64. */
function sanitizeDocId(wamid: string): string {
  return wamid.replace(/\//g, "_");
}
