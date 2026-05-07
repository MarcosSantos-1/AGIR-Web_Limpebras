import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Viewport aproximado: estado de São Paulo (viés sem restringir o país). SW | NE */
const SP_STATE_BOUNDS =
  "-25.35,-53.25|-19.60,-44.00";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  address_components?: AddressComponent[];
};

type GoogleGeocodeJson = {
  status: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};

function scoreForSaoPauloBias(r: GoogleGeocodeResult): number {
  const comps = r.address_components ?? [];
  let score = 0;
  for (const c of comps) {
    if (c.types.includes("administrative_area_level_1")) {
      const sn = c.short_name?.toUpperCase() ?? "";
      const ln = c.long_name?.toLowerCase() ?? "";
      if (sn === "SP" || ln.includes("são paulo")) score += 3;
    }
    if (c.types.includes("locality") || c.types.includes("administrative_area_level_2")) {
      const ln = c.long_name?.toLowerCase() ?? "";
      if (ln.includes("são paulo") || ln === "sao paulo") score += 2;
    }
  }
  if (r.formatted_address.toLowerCase().includes("são paulo")) score += 1;
  return score;
}

export async function POST(request: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "Geocoding não configurado (GOOGLE_MAPS_API_KEY)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const address =
    typeof body === "object" &&
    body !== null &&
    "address" in body &&
    typeof (body as { address: unknown }).address === "string"
      ? (body as { address: string }).address.trim()
      : "";

  if (!address) {
    return NextResponse.json({ error: "Indique um endereço." }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("components", "country:BR");
  url.searchParams.set("region", "br");
  url.searchParams.set("bounds", SP_STATE_BOUNDS);
  url.searchParams.set("key", key);

  const res = await fetch(url.href, { cache: "no-store" });
  const data = (await res.json()) as GoogleGeocodeJson;

  if (data.status === "ZERO_RESULTS") {
    return NextResponse.json({ results: [] });
  }

  if (data.status !== "OK" || !data.results?.length) {
    const msg =
      data.error_message ||
      (data.status === "REQUEST_DENIED"
        ? "Pedido recusado — verifique a chave e a API Geocoding ativa no Google Cloud."
        : `Geocoding: ${data.status}`);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const ranked = [...data.results].sort(
    (a, b) => scoreForSaoPauloBias(b) - scoreForSaoPauloBias(a),
  );

  const results = ranked.slice(0, 5).map((r) => ({
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formatted_address: r.formatted_address,
  }));

  return NextResponse.json({ results });
}
