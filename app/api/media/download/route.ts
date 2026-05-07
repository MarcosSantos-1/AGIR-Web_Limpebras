import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { isAllowedPublicR2Url } from "@/lib/storage/is-allowed-public-r2-url";
import { STORAGE_UPLOAD_MAX_BYTES } from "@/lib/storage/storage-object-key";

export const runtime = "nodejs";

const MAX_REDIRECTS = 5;

function safeAttachmentFilename(name: string): string {
  const s = name.trim().replace(/[/\\]/g, "-").slice(0, 200);
  const cleaned = s.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return cleaned || "download.bin";
}

async function fetchR2WithinAllowlist(
  startUrl: string,
  publicBase: string,
): Promise<Response> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "*/*" },
      cache: "no-store",
    });

    const status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get("location");
      if (!loc || hop === MAX_REDIRECTS) {
        throw new Error("redirect");
      }
      const next = new URL(loc, current).href;
      if (!isAllowedPublicR2Url(next, publicBase)) {
        throw new Error("bad redirect");
      }
      current = next;
      continue;
    }

    return res;
  }

  throw new Error("too many redirects");
}

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!bearer) {
    return NextResponse.json(
      { error: "Sessão necessária para descarregar ficheiros." },
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
    return NextResponse.json(
      { error: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }

  const publicBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!publicBase) {
    return NextResponse.json(
      {
        error:
          "Armazenamento não configurado no servidor (R2_PUBLIC_BASE_URL).",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url")?.trim();
  const filenameParam = searchParams.get("filename")?.trim();

  if (!urlParam) {
    return NextResponse.json({ error: "Parâmetro url obrigatório." }, { status: 400 });
  }

  if (!isAllowedPublicR2Url(urlParam, publicBase)) {
    return NextResponse.json({ error: "URL não permitida." }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetchR2WithinAllowlist(urlParam, publicBase);
  } catch {
    return NextResponse.json(
      { error: "Não foi possível obter o ficheiro." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Origem devolveu erro ao obter o ficheiro." },
      { status: 502 },
    );
  }

  const len = upstream.headers.get("content-length");
  if (len) {
    const n = Number.parseInt(len, 10);
    if (
      Number.isFinite(n) &&
      n > 0 &&
      n > STORAGE_UPLOAD_MAX_BYTES
    ) {
      return NextResponse.json(
        { error: "Ficheiro demasiado grande." },
        { status: 413 },
      );
    }
  }

  const contentType =
    upstream.headers.get("content-type")?.trim() || "application/octet-stream";

  let filename = filenameParam;
  if (!filename) {
    try {
      const last =
        new URL(urlParam).pathname.split("/").filter(Boolean).pop() ?? "download";
      filename = decodeURIComponent(last);
    } catch {
      filename = "download.bin";
    }
  }
  filename = safeAttachmentFilename(filename);

  const disposition = `attachment; filename="${filename.replace(/\\/g, "_").replace(/"/g, "")}"`;

  const outHeaders = new Headers();
  outHeaders.set("Content-Type", contentType);
  outHeaders.set("Content-Disposition", disposition);
  if (len && Number.parseInt(len, 10) > 0) {
    outHeaders.set("Content-Length", len);
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: outHeaders,
  });
}
