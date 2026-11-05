import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SubregionaisGeoJson } from "@/lib/map/subregionais";

export async function loadSubregionais(): Promise<SubregionaisGeoJson> {
  return JSON.parse(await readFile(join(process.cwd(), "data", "subprefeituras-loteiii.geojson"), "utf8"));
}
