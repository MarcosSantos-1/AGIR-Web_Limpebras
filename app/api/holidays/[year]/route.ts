import { mergeBrasilApiWithSp } from "@/lib/holidays/sao-paulo";
import { NextResponse } from "next/server";

export const revalidate = 86400;

export async function GET(
  _request: Request,
  segmentData: { params: Promise<{ year: string }> },
) {
  const params = await segmentData.params;
  const year = Number(params.year);
  if (!Number.isFinite(year) || year < 1900 || year > 2199) {
    return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
  }

  let national: { date: string; name: string; type?: string }[] = [];
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      next: { revalidate },
    });
    if (res.ok) {
      national = await res.json();
    }
  } catch {
    national = [];
  }

  const merged = mergeBrasilApiWithSp(year, national);
  return NextResponse.json(merged);
}
