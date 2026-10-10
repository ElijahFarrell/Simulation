"use client";

import { UserButton } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import { EpicLink } from "@/components/stats/epic-link";
import { ReplayDrop } from "@/components/stats/replay-drop";
import { SessionBoard } from "@/components/stats/session-board";

export function StatsHome() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated) void storeUser();
  }, [isAuthenticated, storeUser]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Practice
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Hub</h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Tournament line, damage, and your Epic account. Rotation practice stays on the map.
          </p>
        </div>
        <UserButton />
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Signing in…</p>
      ) : !isAuthenticated ? (
        <p className="text-sm text-muted-foreground">
          Signed in, but the stats database didn&apos;t accept the login. Check the Clerk issuer on Convex.
        </p>
      ) : (
        <>
          <EpicLink epicAccountId={me?.epicAccountId} epicDisplayName={me?.epicDisplayName} />
          <SessionBoard accountId={me?.epicAccountId ?? null} />
          <ReplayDrop />
        </>
      )}
    </div>
  );
}
