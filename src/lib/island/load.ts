import { z } from "zod";
import { worldToSim, type Place } from "./project";

const MAP_URL = "https://fortnite-api.com/v1/map";

const mapSchema = z.object({
  data: z.object({
    images: z.object({
      pois: z.string().url(),
    }),
    pois: z
      .array(
        z.object({
          name: z.string().min(1).max(80),
          location: z.object({
            x: z.number(),
            y: z.number(),
          }),
        }),
      )
      .max(80),
  }),
});

export type IslandData = {
  imageUrl: string;
  places: Place[];
};

export async function loadIsland(): Promise<IslandData | null> {
  const response = await fetch(MAP_URL, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const parsed = mapSchema.safeParse(await response.json());
  if (!parsed.success) return null;
  return {
    imageUrl: parsed.data.data.images.pois,
    places: parsed.data.data.pois.map((poi) => ({
      name: poi.name,
      ...worldToSim(poi.location.x, poi.location.y),
    })),
  };
}
