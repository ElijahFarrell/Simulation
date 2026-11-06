import { describe, expect, it } from "vitest";
import { EPIC_BASIC_PROFILE_SCOPE, epicAuthorizeUrl, epicCallbackUrl } from "./authorize";
import { createOauthState, oauthStatesMatch } from "./state";

describe("epicAuthorizeUrl", () => {
  it("asks Epic only for basic profile", () => {
    const state = createOauthState();
    const url = new URL(
      epicAuthorizeUrl({
        clientId: "client",
        redirectUri: "https://lab.example/api/epic/callback",
        state,
      }),
    );
    expect(url.origin + url.pathname).toBe("https://www.epicgames.com/id/authorize");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe(EPIC_BASIC_PROFILE_SCOPE);
    expect(url.searchParams.get("scope")).not.toMatch(/friends_list|presence|email/);
    expect(url.searchParams.get("redirect_uri")).toBe("https://lab.example/api/epic/callback");
    expect(url.searchParams.get("state")).toBe(state);
  });

  it("builds the callback from the request origin", () => {
    expect(epicCallbackUrl("https://lab.example/api/epic/link?x=1")).toBe("https://lab.example/api/epic/callback");
  });
});

describe("oauthStatesMatch", () => {
  it("accepts the cookie state and rejects a different length", () => {
    const state = createOauthState();
    expect(oauthStatesMatch(state, state)).toBe(true);
    expect(oauthStatesMatch(state, `${state}x`)).toBe(false);
    expect(oauthStatesMatch(undefined, state)).toBe(false);
  });
});
