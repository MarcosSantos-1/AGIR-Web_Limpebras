import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import {
  isAllowedAgainstAnyPublicBase,
} from "@/lib/storage/is-allowed-public-r2-url";
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
  publicBasesCsv: string,
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
      if (!isAllowedAgainstAnyPublicBase(next, publicBasesCsv)) {
        throw new Error("bad redirect");
      }
      current = next;
      continue;
    }

    return res;
  }

  throw new Error("too many redirects");
}

async function verifyBearer(request: Request): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!bearer) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sessão necessária para descarregar ficheiros." },
        { status: 401 },
      ),
    };
  }

  try {
    await verifyIdToken(bearer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Firebase Admin não configurado")) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error:
              "Servidor sem credencial Firebase Admin (FIREBASE_SERVICE_ACCOUNT_JSON ou GOOGLE_APPLICATION_CREDENTIALS).",
          },
          { status: 503 },
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sessão inválida ou expirada." },
        { status: 401 },
      ),
    };
  }

  return { ok: true };
}

async function proxyDownload(
  urlParamRaw: string,
  filenameParam: string | undefined,
): Promise<NextResponse> {
  const publicBasesCsv = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!publicBasesCsv) {
    return NextResponse.json(
      {
        error:
          "Armazenamento não configurado no servidor (R2_PUBLIC_BASE_URL).",
      },
      { status: 503 },
    );
  }

  const urlParam = urlParamRaw.trim();

  if (!urlParam) {
    return NextResponse.json(
      { error: "URL do ficheiro ausente ou inválida." },
      { status: 400 },
    );
  }

  let parsedForLog: URL;
  try {
    parsedForLog = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (!isAllowedAgainstAnyPublicBase(urlParam, publicBasesCsv)) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[api/media/download] reprovado pela allowlist; origin do ficheiro:",
        parsedForLog.origin,
        "| R2_PUBLIC_BASE_URL:",
        publicBasesCsv,
      );
    }
    return NextResponse.json({ error: "URL não permitida." }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetchR2WithinAllowlist(urlParam, publicBasesCsv);
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
    if (Number.isFinite(n) && n > 0 && n > STORAGE_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: "Ficheiro demasiado grande." },
        { status: 413 },
      );
    }
  }

  const contentType =
    upstream.headers.get("content-type")?.trim() || "application/octet-stream";

  let filename = filenameParam?.trim();
  if (!filename) {
    try {
      const last =
        new URL(urlParam).pathname.split("/").filter(Boolean).pop() ??
        "download";
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

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await verifyBearer(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url") ?? "";
  const filenameParam = searchParams.get("filename") ?? undefined;

  return proxyDownload(urlParam, filenameParam);
}

/** Preferido em produção: corpo JSON evita URLs longas em query (limites de proxy/CDN). */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await verifyBearer(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const urlRaw = (body as { url?: unknown }).url;
  const filenameRaw = (body as { filename?: unknown }).filename;

  const urlParam = typeof urlRaw === "string" ? urlRaw : "";
  const filenameParam =
    typeof filenameRaw === "string" ? filenameRaw : undefined;

  return proxyDownload(urlParam, filenameParam);
}
