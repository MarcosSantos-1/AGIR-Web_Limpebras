import { PutObjectCommand } from "@aws-sdk/client-s3";
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
      console.error("[api/storage/upload] verifyIdToken:", msg || e, code);
    }
    return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }

  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();

  if (!bucket || !publicBase) {
    return NextResponse.json(
      { error: "Armazenamento não configurado no servidor (R2_BUCKET_NAME / R2_PUBLIC_BASE_URL)." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Pedido inválido ou corpo demasiado grande." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const keyRaw = form.get("key");

  if (!(file instanceof File) || typeof keyRaw !== "string") {
    return NextResponse.json(
      { error: "Campos 'file' e 'key' são obrigatórios (multipart/form-data)." },
      { status: 400 },
    );
  }

  const key = sanitizeStorageObjectKey(keyRaw);
  if (!key) {
    return NextResponse.json(
      { error: "Chave de ficheiro inválida ou não permitida." },
      { status: 400 },
    );
  }

  if (!assertFileSizeWithinLimit(file.size)) {
    return NextResponse.json(
      {
        error: `Ficheiro demasiado grande (máx. ${Math.round(STORAGE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB).`,
      },
      { status: 400 },
    );
  }

  const mime = (file.type || "application/octet-stream").toLowerCase();
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

  const body = Buffer.from(await file.arrayBuffer());

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: file.type?.trim() || mime || "application/octet-stream",
      }),
    );
  } catch (e) {
    console.error("[R2 upload]", e);
    return NextResponse.json(
      { error: "Falha ao guardar o ficheiro. Tente novamente." },
      { status: 502 },
    );
  }

  const url = publicUrlForStorageKey(publicBase, key);
  return NextResponse.json({ url });
}
