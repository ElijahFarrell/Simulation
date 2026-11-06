export const EPIC_AUTHORIZE_URL = "https://www.epicgames.com/id/authorize";
export const EPIC_TOKEN_URL = "https://api.epicgames.dev/epic/oauth/v2/token";
export const EPIC_USERINFO_URL = "https://api.epicgames.dev/epic/oauth/v2/userInfo";
export const EPIC_BASIC_PROFILE_SCOPE = "basic_profile";

export function epicAuthorizeUrl(args: { clientId: string; redirectUri: string; state: string }): string {
  const url = new URL(EPIC_AUTHORIZE_URL);
  url.searchParams.set("client_id", args.clientId);
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", EPIC_BASIC_PROFILE_SCOPE);
  url.searchParams.set("state", args.state);
  return url.toString();
}

export function epicCallbackUrl(requestUrl: string): string {
  return `${new URL(requestUrl).origin}/api/epic/callback`;
}
