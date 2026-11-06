import { NextResponse } from "next/server";
import { EPIC_NAME_MAX } from "@/lib/epic/profile";
import { fortniteRoute } from "@/lib/fortnite/access";
import { lookupAccount } from "@/lib/fortnite/osirion";

export const GET = fortniteRoute("Epic lookup didn't load.", async (request) => {
  const name = (new URL(request.url).searchParams.get("name") ?? "").trim();
  if (name.length < 1 || name.length > EPIC_NAME_MAX || /[\u0000-\u001f]/.test(name)) {
    return new Response(`Enter the Epic name, up to ${EPIC_NAME_MAX} characters.`, { status: 400 });
  }
  const matches = await lookupAccount(name);
  if (matches.length === 0) return new Response("No Epic account with that name.", { status: 404 });
  return NextResponse.json({ matches });
});
