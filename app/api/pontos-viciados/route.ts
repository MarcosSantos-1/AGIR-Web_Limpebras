import { z } from "zod";
import { verifyIdToken } from "@/lib/firebase-admin";
import { firestoreFields, withPontoViciadoDocuments } from "@/lib/firestore/ponto-viciado-transaction";
import { MAPA_PONTOS_VICIO_FORM } from "@/lib/map-features";
import { loadSubregionais } from "@/lib/map/subregionais-server";
import { MSG_FORA_DO_LOTE, subregionalFromCoordinates } from "@/lib/map/subregionais";
import { FICHA_ANSWER_KEYS, fichaErrors } from "@/lib/ponto-ficha";
import { nextPontoViciadoCodigo, normalizePontoViciadoCodigo } from "@/lib/ponto-viciado-codigo";

const coordinates = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const details = coordinates.extend({
  address: z.string().trim().min(1),
  ficha: z.object(Object.fromEntries(FICHA_ANSWER_KEYS.map((key) => [key, z.string().trim()])) as Record<(typeof FICHA_ANSWER_KEYS)[number], z.ZodString>),
});

const codigoSchema = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);
const payloadSchema = z.discriminatedUnion("action", [
  coordinates.extend({ action: z.literal("preview") }),
  details.extend({ action: z.literal("create"), requestId: z.string().uuid(), expectedCode: codigoSchema.optional() }),
  details.extend({ action: z.literal("edit"), codigo: codigoSchema, subprefeitura: z.string().trim().min(1) }),
  z.object({ action: z.literal("delete"), codigo: codigoSchema }),
]);

const catalog = new Set(MAPA_PONTOS_VICIO_FORM.map(({ id }) => normalizePontoViciadoCodigo(id)));

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 });

  let uid: string;
  let projectId: string;
  try {
    ({ uid, aud: projectId } = await verifyIdToken(token));
  } catch {
    return Response.json({ error: "Não foi possível validar sua sessão do Firebase." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Revise os dados do ponto." }, { status: 400 });
  const input = parsed.data;

  try {
    const needsRegion = input.action === "create" || input.action === "preview";
    const sub = needsRegion
      ? subregionalFromCoordinates(await loadSubregionais(), input.lat, input.lng)
      : undefined;
    if (needsRegion && !sub) {
      return Response.json({ error: MSG_FORA_DO_LOTE }, { status: 422 });
    }
    if (input.action === "create" && Object.keys(fichaErrors(input.ficha)).length) {
      return Response.json({ error: "Revise a ficha do ponto." }, { status: 422 });
    }

    const result = await withPontoViciadoDocuments(projectId, token, input.action === "preview", (docs, writes, root) => {
      const active = new Set<string>();
      const deleted = new Set<string>();
      for (const doc of docs) {
        const data = doc.fields;
        const rawCode = data?.codigo?.stringValue;
        if (!rawCode) continue;
        const code = normalizePontoViciadoCodigo(rawCode);
        const hidden = data?.oculto?.booleanValue === true;
        if (input.action === "create" && !hidden && data?.requestId?.stringValue === input.requestId && data?.createdByUid?.stringValue === uid) {
          return { codigo: code };
        }
        (hidden ? deleted : active).add(code);
      }

      for (const code of catalog) {
        if (!deleted.has(code)) active.add(code);
      }
      // Um registro de exclusão também oculta eventuais documentos legados.
      for (const code of deleted) active.delete(code);

      const code = "codigo" in input
        ? normalizePontoViciadoCodigo(input.codigo)
        : sub && nextPontoViciadoCodigo(sub.abbrev, active, deleted);
      if (!code) return null;

      if (input.action === "preview") return { codigo: code, subregional: sub?.label };

      if (input.action === "create") {
        const expected = input.expectedCode && normalizePontoViciadoCodigo(input.expectedCode);
        if (expected && expected !== code) {
          return {
            error: active.has(expected)
              ? "ID '" + expected + "' já utilizado."
              : "O ID disponível mudou. Confira o novo ID.",
            nextCode: code,
          };
        }
      } else if (!active.has(code)) {
        return null;
      }

      const name = root + "/customPontosViciados/" + code;
      const matching = docs.filter((doc) => normalizePontoViciadoCodigo(doc.fields?.codigo?.stringValue ?? "") === code);
      const canonical = docs.find((doc) => doc.name === name);
      const previous = canonical ?? matching[0];
      const currentDocument = canonical ? { updateTime: canonical.updateTime } : { exists: false as const };
      for (const doc of matching) {
        if (doc.name !== name) writes.push({ delete: doc.name });
      }

      const now = Date.now();
      const ficha = root + "/appSettings/ponto-ficha-" + code;
      if (input.action === "delete") {
        writes.push(
          { update: { name, fields: firestoreFields({ codigo: code, oculto: true, updatedAtMs: now }) }, currentDocument },
          { delete: ficha },
        );
      } else {
        const fields = firestoreFields({
          codigo: code,
          subprefeitura: sub?.label ?? (input.action === "edit" ? input.subprefeitura : ""),
          address: input.address,
          lat: input.lat,
          lng: input.lng,
          updatedAtMs: now,
        });
        if (input.action === "edit") {
          const creation = firestoreFields({ createdAtMs: now, createdByUid: uid });
          Object.assign(fields, { ...creation, ...previous?.fields, ...fields });
        } else {
          Object.assign(fields, firestoreFields({ requestId: input.requestId, createdAtMs: now, createdByUid: uid }));
        }

        writes.push(
          { update: { name, fields }, currentDocument },
          { update: { name: ficha, fields: firestoreFields({ ...input.ficha, type: "ponto-ficha", codigo: code, updatedAtMs: now, updatedByUid: uid }) } },
        );
      }
      return { codigo: code };
    });

    if (!result) return Response.json({ error: "Este ponto já foi excluído. Atualize o mapa." }, { status: 409 });
    return Response.json(result, { status: result.error ? 409 : 200 });
  } catch (error) {
    console.error("[pontos-viciados]", error);
    return Response.json({ error: input.action === "preview" ? "Não foi possível consultar o ID." : "Não foi possível salvar a alteração no Firebase." }, { status: 500 });
  }
}
