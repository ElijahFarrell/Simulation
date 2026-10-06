import type { ReactNode } from "react";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { clerkEnabled } from "@/lib/clerk-enabled";

export default function AccountLayout({ children }: { children: ReactNode }) {
  if (!clerkEnabled) {
    return <p className="p-8 text-sm text-muted-foreground">Accounts aren&apos;t set up yet. Add the Clerk keys.</p>;
  }
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
