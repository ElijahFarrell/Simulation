import { auth } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { FortniteDataError } from "@/lib/fortnite/osirion";

/** Tournament routes proxy a public API. Keep them behind the same sign-in as the hub. */
export function fortniteRoute(fallbackError: string, handler: (request: Request) => Promise<Response>) {
  return async function GET(request: Request): Promise<Response> {
    if (!clerkEnabled) return new Response("Accounts aren't set up yet.", { status: 503 });
    const { userId } = await auth();
    if (!userId) return new Response("Sign in required.", { status: 401 });
    try {
      return await handler(request);
    } catch (error) {
      return new Response(error instanceof FortniteDataError ? error.message : fallbackError, { status: 502 });
    }
  };
}
