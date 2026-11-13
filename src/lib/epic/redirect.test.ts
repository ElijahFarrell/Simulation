import { describe, expect, it } from "vitest";
import { isEpicCallbackUri } from "./redirect";

describe("isEpicCallbackUri", () => {
  it("allows the production callback and local dev", () => {
    expect(isEpicCallbackUri("https://lab.example/api/epic/callback")).toBe(true);
    expect(isEpicCallbackUri("http://localhost:4317/api/epic/callback")).toBe(true);
    expect(isEpicCallbackUri("http://127.0.0.1:4317/api/epic/callback")).toBe(true);
  });

  it("rejects other paths, cleartext public hosts, and extra URL parts", () => {
    expect(isEpicCallbackUri("https://lab.example/api/epic/link")).toBe(false);
    expect(isEpicCallbackUri("http://lab.example/api/epic/callback")).toBe(false);
    expect(isEpicCallbackUri("https://lab.example/api/epic/callback?next=/")).toBe(false);
    expect(isEpicCallbackUri("https://user:pass@lab.example/api/epic/callback")).toBe(false);
    expect(isEpicCallbackUri("not a url")).toBe(false);
  });
});
