import { describe, expect, it } from "vitest";
import { accessTokenFrom, epicProfileFrom } from "./profile";

function fakeJwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "RS256" })}.${encode(payload)}.sig`;
}

const accountId = "a".repeat(32);

describe("epicProfileFrom", () => {
  it("reads the account id and display name Epic puts on the token", () => {
    const accessToken = fakeJwt({ sub: accountId, dn: "SamplePlayer" });
    const profile = epicProfileFrom({ access_token: accessToken, account_id: accountId }, null);
    expect(profile).toEqual({ accountId, displayName: "SamplePlayer" });
    expect(accessTokenFrom({ access_token: accessToken })).toBe(accessToken);
  });

  it("prefers the userinfo name and language", () => {
    const accessToken = fakeJwt({ sub: accountId, dn: "OldName" });
    const profile = epicProfileFrom(
      { access_token: accessToken, account_id: accountId },
      { sub: accountId, preferred_username: "NewName", preferred_language: "en" },
    );
    expect(profile).toEqual({ accountId, displayName: "NewName", preferredLanguage: "en" });
  });

  it("rejects a userinfo subject that is not the authenticated account", () => {
    const accessToken = fakeJwt({ sub: accountId, dn: "SamplePlayer" });
    const profile = epicProfileFrom(
      { access_token: accessToken, account_id: accountId },
      { sub: "b".repeat(32), preferred_username: "Other" },
    );
    expect(profile).toBeNull();
  });

  it("rejects a missing display name", () => {
    expect(epicProfileFrom({ account_id: accountId }, { sub: accountId })).toBeNull();
  });
});
