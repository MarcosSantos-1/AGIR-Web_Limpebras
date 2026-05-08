/**
 * Gera URL assinada para PUT direto ao R2 (evita limite de body do Next/host).
 *
 * CORS no bucket R2: permitir origem da app (prod + localhost), método PUT,
 * cabeçalhos Content-Type, e expor ETag se necessário. Sem isso o browser bloqueia
 * o segundo pedido (PUT) após receber a URL assinada.
 */
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getR2S3Client } from "@/lib/storage/r2-s3";
import {
  assertFileSizeWithinLimit,
  isAllowedObjectMime,
  publicUrlForStorageKey,
  sanitizeStorageObjectKey,
  STORAGE_UPLOAD_MAX_BYTES,
} from "@/lib/storage/storage-object-key";

export const runtime = "nodejs";

const PRESIGN_EXPIRES_SEC = 3600;

type PresignBody = {
  key?: string;
  contentType?: string;
  contentLength?: number;
};

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!bearer) {
    return NextResponse.json(
      { error: "Sessão necessária para enviar ficheiros." },
      { status: 401 },
    );
  }

  try {
    await verifyIdToken(bearer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Firebase Admin não configurado")) {
      return NextResponse.json(
        {
          error:
            "Servidor sem credencial Firebase Admin (FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS).",
        },
        { status: 503 },
      );
    }
    if (process.env.NODE_ENV === "development") {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code?: string }).code)
          : "";
      console.error("[api/storage/presign] verifyIdToken:", msg || e, code);
    }
    return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!bucket || !publicBase) {
    return NextResponse.json(
      {
        error:
          "Armazenamento não configurado no servidor (R2_BUCKET_NAME / R2_PUBLIC_BASE_URL).",
      },
      { status: 503 },
    );
  }

  let bodyJson: PresignBody;
  try {
    bodyJson = (await request.json()) as PresignBody;
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const keyRaw = bodyJson.key;
  const contentTypeRaw = bodyJson.contentType;
  const contentLength = bodyJson.contentLength;

  if (typeof keyRaw !== "string" || typeof contentTypeRaw !== "string") {
    return NextResponse.json(
      { error: "Campos 'key' e 'contentType' são obrigatórios." },
      { status: 400 },
    );
  }

  if (typeof contentLength !== "number" || !Number.isFinite(contentLength)) {
    return NextResponse.json({ error: "contentLength numérico é obrigatório." }, { status: 400 });
  }

  const key = sanitizeStorageObjectKey(keyRaw);
  if (!key) {
    return NextResponse.json(
      { error: "Chave de ficheiro inválida ou não permitida." },
      { status: 400 },
    );
  }

  if (!assertFileSizeWithinLimit(contentLength)) {
    return NextResponse.json(
      {
        error: `Ficheiro demasiado grande (máx. ${Math.round(STORAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB).`,
      },
      { status: 400 },
    );
  }

  const mime = contentTypeRaw.toLowerCase().trim();
  if (!isAllowedObjectMime(mime)) {
    return NextResponse.json({ error: "Tipo de ficheiro não permitido." }, { status: 400 });
  }

  let s3;
  try {
    s3 = getR2S3Client();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro R2.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mime || "application/octet-stream",
    ContentLength: contentLength,
  });

  let putUrl: string;
  try {
    putUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES_SEC });
  } catch (e) {
    console.error("[R2 presign]", e);
    return NextResponse.json(
      { error: "Não foi possível preparar o envio. Tente novamente." },
      { status: 502 },
    );
  }

  const publicUrl = publicUrlForStorageKey(publicBase, key);
  return NextResponse.json({ putUrl, publicUrl });
}
