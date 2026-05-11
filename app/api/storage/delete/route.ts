import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { getR2S3Client } from "@/lib/storage/r2-s3";
import { storageKeyFromConfiguredPublicUrl } from "@/lib/storage/storage-url-to-key";

export const runtime = "nodejs";

const MAX_URLS = 500;

export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!bearer) {
    return NextResponse.json(
      { error: "Sessão necessária para apagar ficheiros." },
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
      console.error("[api/storage/delete] verifyIdToken:", msg || e, code);
    }
    return NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }

  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();

  if (!bucket || !publicBase) {
    return NextResponse.json(
      {
        error:
          "Armazenamento não configurado no servidor (R2_BUCKET_NAME / R2_PUBLIC_BASE_URL).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const rawUrls =
    typeof body === "object" &&
    body !== null &&
    "urls" in body &&
    Array.isArray((body as { urls?: unknown }).urls)
      ? (body as { urls: unknown[] }).urls
      : null;

  if (!rawUrls) {
    return NextResponse.json({ error: "Campo 'urls' deve ser uma lista." }, { status: 400 });
  }

  const urlStrings = rawUrls
    .filter((u): u is string => typeof u === "string")
    .slice(0, MAX_URLS);

  const keySet = new Set<string>();
  for (const u of urlStrings) {
    const key = storageKeyFromConfiguredPublicUrl(u, publicBase);
    if (key) keySet.add(key);
  }

  const keys = [...keySet];
  if (keys.length === 0) {
    return NextResponse.json({ ok: true, deletedKeys: 0 });
  }

  let s3;
  try {
    s3 = getR2S3Client();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro R2.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  try {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  } catch (e) {
    console.error("[R2 delete]", e);
    return NextResponse.json(
      { error: "Falha ao apagar ficheiros no armazenamento." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, deletedKeys: keys.length });
}
