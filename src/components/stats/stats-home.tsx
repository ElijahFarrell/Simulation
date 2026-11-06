"use client";

import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { EpicLink } from "@/components/stats/epic-link";
import { ReplayDrop } from "@/components/stats/replay-drop";
import { SessionBoard } from "@/components/stats/session-board";

export function StatsHome({ epicLinkingEnabled, epicStatus }: { epicLinkingEnabled: boolean; epicStatus?: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated) void storeUser();
  }, [isAuthenticated, storeUser]);

  return (
    <div className="page-glow min-h-dvh">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-10 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
          <div className="grid gap-3">
            <p className="eyebrow text-brand">Hub</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Your tournaments</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Where you stand against the qual line, how the cutoff has moved, and your damage game by game.
            </p>
          </div>
          {isAuthenticated && me !== undefined ? (
            <EpicLink
              epicAccountId={me?.epicAccountId}
              epicDisplayName={me?.epicDisplayName}
              epicPreferredLanguage={me?.epicPreferredLanguage}
              epicVerified={me?.epicVerified}
              oauthEnabled={epicLinkingEnabled}
              status={epicStatus}
            />
          ) : null}
        </section>

        {isLoading ? (
          <div className="grid gap-4" aria-busy>
            <div className="h-32 animate-pulse rounded-2xl bg-card" />
            <div className="h-80 animate-pulse rounded-2xl bg-card" />
          </div>
        ) : !isAuthenticated ? (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Signed in, but the stats database didn&apos;t accept the login. Check the Clerk issuer on Convex.
          </p>
        ) : (
          <>
            <SessionBoard accountId={me?.epicAccountId ?? null} />
            <ReplayDrop />
          </>
        )}
      </main>
    </div>
  );
}
