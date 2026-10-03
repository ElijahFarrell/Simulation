import { loadIsland } from "@/lib/island/load";

export async function GET(): Promise<Response> {
  const island = await loadIsland();
  if (!island) return new Response("Map unavailable", { status: 503 });
  const image = await fetch(island.imageUrl, { next: { revalidate: 3600 } });
  if (!image.ok || !image.body) return new Response("Map unavailable", { status: 503 });
  return new Response(image.body, {
    headers: {
      "content-type": image.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=3600",
    },
  });
}
