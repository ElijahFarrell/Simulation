import { loadIsland } from "@/lib/island/load";

export async function GET(): Promise<Response> {
  const island = await loadIsland();
  if (!island) return Response.json({ imageUrl: null, places: [] });
  return Response.json({
    imageUrl: "/api/island/image",
    places: island.places,
  });
}
