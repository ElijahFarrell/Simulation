import { describe, expect, it } from "vitest";
import { isFortniteMapImageUrl } from "./image-url";

describe("isFortniteMapImageUrl", () => {
  it("allows the map images fortnite-api.com serves", () => {
    expect(isFortniteMapImageUrl("https://fortnite-api.com/images/map_en.png")).toBe(true);
    expect(isFortniteMapImageUrl("https://fortnite-api.com/images/map.png?v=1")).toBe(true);
  });

  it("rejects other hosts, schemes, and paths", () => {
    expect(isFortniteMapImageUrl("http://fortnite-api.com/images/map_en.png")).toBe(false);
    expect(isFortniteMapImageUrl("https://evil.example/images/map_en.png")).toBe(false);
    expect(isFortniteMapImageUrl("https://fortnite-api.com/v1/map")).toBe(false);
    expect(isFortniteMapImageUrl("https://user:pass@fortnite-api.com/images/map.png")).toBe(false);
    expect(isFortniteMapImageUrl("https://fortnite-api.com/images/map.png#x")).toBe(false);
    expect(isFortniteMapImageUrl("not a url")).toBe(false);
  });
});
