export type EventDisplay = {
  name: string;
  description: string | null;
  poster: string | null;
  banner: string | null;
  color: string | null;
  regions: string[];
  tags: string[];
  zeroBuild: boolean;
  ranked: boolean;
};

const IMAGE_HOST = "https://cdn2.unrealengine.com/";

function image(value: unknown): string | null {
  return typeof value === "string" && value.startsWith(IMAGE_HOST) ? value : null;
}

function hexColor(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{6}$/i.test(value) ? `#${value}` : null;
}

function teamSize(playlists: string[]): string | null {
  const joined = playlists.join(" ");
  if (/squad/i.test(joined)) return "Squads";
  if (/trio/i.test(joined)) return "Trios";
  if (/duo/i.test(joined)) return "Duos";
  if (/solo/i.test(joined)) return "Solo";
  return null;
}

/** Epic prefixes some titles with the region ("[NAC] ..."). The card shows region separately. */
export function stripRegionPrefix(title: string): string {
  return title.replace(/^\s*\[[A-Z]{2,6}\]\s*/, "");
}

export function eventDisplay(input: {
  eventId: string;
  title: string;
  display: Record<string, unknown> | null;
  regions: unknown;
  playlists: string[];
}): EventDisplay {
  const { eventId, title, display, playlists } = input;
  const subtitle = typeof display?.titleLine2 === "string" ? display.titleLine2 : "";
  const haystack = `${eventId} ${title} ${subtitle}`;
  const zeroBuild = playlists.some((id) => /nobuild/i.test(id)) || /_ZB(_|$)|zero build/i.test(haystack);
  const reload = /reload/i.test(haystack) || playlists.some((id) => /_RE_/.test(id));
  const mobile = /mobile/i.test(haystack);
  const ranked = /rankedcup|ranked cup/i.test(haystack);
  const size = teamSize(playlists);
  const tags = [size, zeroBuild ? "Zero Build" : "Build", reload ? "Reload" : null, mobile ? "Mobile" : null].filter(
    (tag): tag is string => tag !== null,
  );
  const description = typeof display?.detailsDescription === "string" ? display.detailsDescription.trim() : "";
  return {
    name: stripRegionPrefix(title),
    description: description || null,
    poster: image(display?.squarePosterImage) ?? image(display?.playlistTileImage),
    banner: image(display?.tournamentViewBackgroundImage) ?? image(display?.playlistTileImage),
    color: hexColor(display?.primaryColor),
    regions: Array.isArray(input.regions) ? input.regions.filter((item): item is string => typeof item === "string") : [],
    tags,
    zeroBuild,
    ranked,
  };
}
