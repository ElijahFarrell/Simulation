import { auth } from "@clerk/nextjs/server";
import { clerkEnabled } from "@/lib/clerk-enabled";

/** Tournament routes proxy a public API. Keep them behind the same sign-in as the hub. */
export async function signedInOrResponse(): Promise<Response | null> {
  if (!clerkEnabled) return new Response("Accounts aren't set up yet.", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new Response("Sign in required.", { status: 401 });
  return null;
}
