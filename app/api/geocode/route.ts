import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Viewport aproximado: estado de São Paulo (viés sem restringir o país). SW | NE */
const SP_STATE_BOUNDS = "-25.35,-53.25|-19.60,-44.00";

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
    /** ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE */
    location_type?: string;
  };
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
    if (
      c.types.includes("locality") ||
      c.types.includes("administrative_area_level_2")
    ) {
      const ln = c.long_name?.toLowerCase() ?? "";
      if (ln.includes("são paulo") || ln === "sao paulo") score += 2;
    }
  }
  if (r.formatted_address.toLowerCase().includes("são paulo")) score += 1;
  return score;
}

function countryIsBr(result: GoogleGeocodeResult): boolean {
  const comps = result.address_components ?? [];
  for (const c of comps) {
    if (
      c.types.includes("country") &&
      (c.short_name?.toUpperCase() === "BR" ||
        c.long_name?.toLowerCase()?.includes("brazil"))
    ) {
      return true;
    }
  }
  return false;
}

function componentLong(
  components: AddressComponent[],
  ...typePriority: string[]
): string | null {
  for (const t of typePriority) {
    const c = components.find((x) => x.types.includes(t));
    if (c?.long_name?.trim()) return c.long_name.trim();
  }
  return null;
}

/**
 * Prioriza logradouro + número + bairro em vez do formatted_address genérico
 * («São Paulo - SP», etc.).
 */
function composeStreetNeighborhoodBr(components: AddressComponent[]): string | null {
  const route = componentLong(components, "route");
  const number = componentLong(components, "street_number");
  const bairro = componentLong(
    components,
    "sublocality_level_1",
    "neighborhood",
    "sublocality",
    "administrative_area_level_4",
  );

  /* Sem via nem bairro granular: não forçar string curta tipo só cidade */
  if (!route && !number && !bairro) return null;

  let line = "";
  if (route && number) line = `${route}, ${number}`;
  else if (route) line = route;
  else if (number) line = `Nº ${number}`;
  else line = "";

  if (bairro) {
    line = line ? `${line} — ${bairro}` : bairro;
  }

  return line.trim() || null;
}

function locationTypeRank(r: GoogleGeocodeResult): number {
  const lt = r.geometry.location_type ?? "";
  if (lt === "ROOFTOP") return 50;
  if (lt === "RANGE_INTERPOLATED") return 40;
  if (lt === "GEOMETRIC_CENTER") return 20;
  if (lt === "APPROXIMATE") return 10;
  return 15;
}

function granularityRank(r: GoogleGeocodeResult): number {
  const comps = r.address_components ?? [];
  let s = locationTypeRank(r);

  const hasRoute = comps.some((c) => c.types.includes("route"));
  const hasNumber = comps.some((c) => c.types.includes("street_number"));
  const hasNeighborhood =
    !!componentLong(
      comps,
      "sublocality_level_1",
      "neighborhood",
      "sublocality",
    );

  if (hasRoute && hasNumber) s += 25;
  else if (hasRoute) s += 12;
  else if (hasNumber) s += 6;

  if (hasNeighborhood) s += 8;

  return s;
}

function pickBestReverseResult(results: GoogleGeocodeResult[]): GoogleGeocodeResult {
  const brFirst = [...results].filter(countryIsBr);
  const pool = brFirst.length > 0 ? brFirst : [...results];

  return [...pool].sort((a, b) => {
    const g = granularityRank(b) - granularityRank(a);
    if (g !== 0) return g;
    return scoreForSaoPauloBias(b) - scoreForSaoPauloBias(a);
  })[0]!;
}

function parseBody(body: unknown): {
  address: string;
  lat: number | null;
  lng: number | null;
} {
  if (typeof body !== "object" || body === null) {
    return { address: "", lat: null, lng: null };
  }
  const o = body as Record<string, unknown>;
  const address = typeof o.address === "string" ? o.address.trim() : "";

  let lat: number | null =
    typeof o.lat === "number" && Number.isFinite(o.lat) ? o.lat : null;
  let lng: number | null =
    typeof o.lng === "number" && Number.isFinite(o.lng) ? o.lng : null;

  if (lat === null && typeof o.lat === "string") {
    const n = Number.parseFloat(o.lat);
    lat = Number.isFinite(n) ? n : null;
  }
  if (lng === null && typeof o.lng === "string") {
    const n = Number.parseFloat(o.lng);
    lng = Number.isFinite(n) ? n : null;
  }

  return { address, lat, lng };
}

function resultToFormattedAddress(best: GoogleGeocodeResult): string {
  const comps = best.address_components ?? [];
  const streetLine = composeStreetNeighborhoodBr(comps);
  if (streetLine) return streetLine;
  return best.formatted_address;
}

/** Chave no servidor: preferir variável sem NEXT_PUBLIC; fallback para a pública (alguns projectos só definem uma). */
function mapsApiKeyFromEnv(): string {
  const a = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (a) return a;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

/** Geocoding direto ou reverso ({ address } OU { lat, lng } sem endereço). */
export async function POST(request: Request) {
  const key = mapsApiKeyFromEnv();
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Geocoding não configurado. Defina GOOGLE_MAPS_API_KEY (recomendado) ou NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no .env e reinicie o servidor.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { address, lat, lng } = parseBody(body);

  const useReverse = !address.trim() && lat !== null && lng !== null;

  if (!useReverse && !address) {
    return NextResponse.json(
      { error: "Indique um endereço ou coordenadas (lat/lng)." },
      { status: 400 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");

  if (useReverse && lat !== null && lng !== null) {
    url.searchParams.set("latlng", `${lat},${lng}`);
    url.searchParams.set("region", "br");
    url.searchParams.set("language", "pt-BR");
  } else {
    url.searchParams.set("address", address);
    url.searchParams.set("components", "country:BR");
    url.searchParams.set("region", "br");
    url.searchParams.set("bounds", SP_STATE_BOUNDS);
  }
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
        ? "Pedido recusado — active a Geocoding API neste projeto, inclua-a nas restrições da chave e evite «referenciadores HTTP» em chaves usadas só no servidor (o Next chama a API sem referer)."
        : `Geocoding: ${data.status}`);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (useReverse) {
    const pick = pickBestReverseResult(data.results);
    return NextResponse.json({
      results: [
        {
          lat: pick.geometry.location.lat,
          lng: pick.geometry.location.lng,
          formatted_address: resultToFormattedAddress(pick),
        },
      ],
    });
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
