"use client";

import { UserButton } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StatsHome() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const matches = useQuery(api.matches.recent, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (isAuthenticated) void storeUser();
  }, [isAuthenticated, storeUser]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div className="grid gap-1">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Rotation Lab
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">My stats</h1>
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
          <Card>
            <CardHeader>
              <CardTitle>{me?.name ?? "Your account"}</CardTitle>
              <CardDescription>
                {me?.epicDisplayName
                  ? `Epic: ${me.epicDisplayName}`
                  : "Epic account not linked yet. Sign in with Epic is coming once the Epic app is approved."}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matches</CardTitle>
              <CardDescription>Upload replays from your PC to see placement, eliminations, and damage.</CardDescription>
            </CardHeader>
            <CardContent>
              {matches === undefined ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches yet. Replay upload is the next step.</p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {matches.map((match) => (
                    <li key={match._id} className="flex justify-between">
                      <span>{new Date(match.playedAt).toLocaleString()}</span>
                      <span>#{match.placement ?? "?"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
