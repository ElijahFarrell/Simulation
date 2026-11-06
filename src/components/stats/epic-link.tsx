"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { CheckIcon, Link2Icon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EpicMatch = { accountId: string; displayName: string };

const OAUTH_STATUS_COPY: Record<string, string> = {
  linked: "Epic account verified.",
  denied: "Epic login was cancelled.",
  failed: "Epic didn't return an account. Try linking again.",
  taken: "That Epic account is already verified by someone else.",
  "not-configured": "Epic login isn't configured on this server yet.",
};

export function EpicLink({
  epicAccountId,
  epicDisplayName,
  epicPreferredLanguage,
  epicVerified,
  oauthEnabled,
  status,
}: {
  epicAccountId?: string;
  epicDisplayName?: string;
  epicPreferredLanguage?: string;
  epicVerified?: boolean;
  oauthEnabled: boolean;
  status?: string;
}) {
  const linkEpic = useMutation(api.users.linkEpic);
  const unlinkEpic = useMutation(api.users.unlinkEpic);
  const notice = status ? OAUTH_STATUS_COPY[status] : undefined;
  const [name, setName] = useState("");
  const [choices, setChoices] = useState<EpicMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function persist(match: EpicMatch) {
    await linkEpic({ epicAccountId: match.accountId, epicDisplayName: match.displayName });
    setChoices([]);
    setName("");
    setEditing(false);
  }

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setChoices([]);
    try {
      const response = await fetch(`/api/fortnite/account?name=${encodeURIComponent(name.trim())}`);
      if (!response.ok) throw new Error(await response.text());
      const body = (await response.json()) as { matches: EpicMatch[] };
      const match = body.matches[0];
      if (!match) throw new Error("No Epic account with that name.");
      if (body.matches.length === 1) {
        await persist(match);
        return;
      }
      setChoices(body.matches);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't look up that name.");
    } finally {
      setBusy(false);
    }
  }

  if (epicDisplayName && !editing) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-you/15 text-lg font-semibold text-you">
          {epicDisplayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="eyebrow flex items-center gap-1.5">
            <CheckIcon className="size-3 text-success" aria-hidden />
            {epicVerified ? "Epic account verified" : "Epic account linked"}
          </p>
          <p className="truncate text-lg font-semibold">
            {epicDisplayName}
            {epicPreferredLanguage ? ` · ${epicPreferredLanguage}` : ""}
          </p>
          {epicAccountId ? (
            <p className="truncate font-mono text-[0.7rem] text-muted-foreground">{epicAccountId}</p>
          ) : null}
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void unlinkEpic().finally(() => setBusy(false));
          }}
        >
          Unlink
        </Button>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-brand/30 bg-card p-5">
      <div className="grid gap-1">
        <p className="eyebrow text-brand">{epicDisplayName ? "Change account" : "Step 1"}</p>
        <h2 className="text-lg font-semibold">Link your Epic name</h2>
        <p className="text-sm text-muted-foreground">
          Your row gets pinned and highlighted on every leaderboard, with your games and damage ratio.
        </p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => void lookup(event)}>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="epic-name">Epic display name</Label>
          <Input
            id="epic-name"
            value={name}
            autoComplete="off"
            maxLength={32}
            placeholder="Display name"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {epicDisplayName ? (
            <Button type="button" variant="ghost" size="lg" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" size="lg" disabled={busy || name.trim().length === 0}>
            <Link2Icon data-icon="inline-start" />
            {busy ? "Looking up…" : "Link account"}
          </Button>
        </div>
      </form>
      {choices.length > 1 ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">More than one match. Pick yours:</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((match) => (
              <Button
                key={match.accountId}
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError(null);
                  void persist(match)
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "Couldn't save that Epic account.");
                    })
                    .finally(() => setBusy(false));
                }}
              >
                {match.displayName}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {oauthEnabled ? (
        <Button asChild variant="outline" size="sm" className="justify-self-start">
          <a href="/api/epic/link">Verify with Epic login instead</a>
        </Button>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
