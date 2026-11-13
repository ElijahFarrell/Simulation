import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkEnabled } from "@/lib/clerk-enabled";

const isAccountRoute = createRouteMatcher(["/stats(.*)", "/api/fortnite(.*)", "/api/epic(.*)"]);

const clerk = clerkMiddleware(async (auth, request) => {
  if (!isAccountRoute(request)) return;
  // Fetches show this text. Document navigations (the hub, Epic login) redirect to sign-in.
  if (request.nextUrl.pathname.startsWith("/api/fortnite")) {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Sign in required.", {
        status: 401,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return;
  }
  await auth.protect();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!clerkEnabled) return;
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
