import { loadSubregionais } from "@/lib/map/subregionais-server";

export const dynamic = "force-static";

export async function GET() {
  return Response.json(await loadSubregionais());
}
