import type { ReactNode } from "react";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { SiteHeader } from "@/components/site-header";
import { clerkEnabled } from "@/lib/clerk-enabled";

export default function AccountLayout({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return (
      <div className="page-glow min-h-dvh">
        <SiteHeader />
        <main className="mx-auto grid max-w-md gap-2 px-4 py-24 text-center">
          <h1 className="text-xl font-semibold">Accounts aren&apos;t set up yet</h1>
          <p className="text-sm text-muted-foreground">Add the Clerk keys to turn on the hub.</p>
        </main>
      </div>
    );
  }
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
