import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { clerkEnabled } from "@/lib/clerk-enabled";

const clerk = clerkMiddleware();

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
