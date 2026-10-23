import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import historical from "@/data/diagnosticos/historical.json";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Entre na sua conta para consultar os levantamentos." }, { status: 401 });
  try {
    await verifyIdToken(token);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code.startsWith("auth/") && !["auth/internal-error", "auth/invalid-credential"].includes(code)) {
      return NextResponse.json({ error: "Sua sessão expirou ou é de outro projeto Firebase. Entre novamente para continuar." }, { status: 401 });
    }
    console.error("[diagnosticos/historico] Falha na validação do token:", code || "configuração/rede");
    return NextResponse.json({ error: "O servidor não conseguiu validar a sessão. Verifique NEXT_PUBLIC_FIREBASE_PROJECT_ID e a conexão com o Firebase Authentication." }, { status: 503 });
  }
  const source = new URL(request.url).searchParams.get("source");
  if (source && !historical.sources.some((s) => s.id === source)) return NextResponse.json({ error: "Fonte desconhecida." }, { status: 400 });
  const sources = historical.sources.map((item) => {
    const rows = historical.records.filter((record) => record.sourceId === item.id);
    const dates = rows.map((record) => String(record.answers.dataChecagem)).sort();
    return { ...item, newCount: rows.filter((record) => String(record.answers.antiguidade ?? "").toLowerCase().includes("novo")).length, checkedFrom: dates[0], checkedTo: dates.at(-1) };
  });
  return NextResponse.json({ sources, records: source ? historical.records.filter((r) => r.sourceId === source) : [] }, { headers: { "Cache-Control": "private, no-store" } });
}
