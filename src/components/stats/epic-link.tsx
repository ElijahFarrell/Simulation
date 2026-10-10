"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EpicMatch = { accountId: string; displayName: string };

export function EpicLink({
  epicAccountId,
  epicDisplayName,
}: {
  epicAccountId?: string;
  epicDisplayName?: string;
}) {
  const linkEpic = useMutation(api.users.linkEpic);
  const [name, setName] = useState("");
  const [choices, setChoices] = useState<EpicMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist(match: EpicMatch) {
    await linkEpic({ epicAccountId: match.accountId, epicDisplayName: match.displayName });
    setChoices([]);
    setName("");
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

  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-sm font-medium">Epic account</h2>
          <p className="text-sm text-muted-foreground">
            {epicDisplayName
              ? `${epicDisplayName} is linked. Sessions highlight that account.`
              : "Look up your Epic name to pin your row on the leaderboard."}
          </p>
        </div>
        {epicAccountId ? (
          <p className="font-mono text-xs text-muted-foreground">{epicAccountId}</p>
        ) : null}
      </div>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => void lookup(event)}>
        <div className="grid flex-1 gap-2">
          <Label htmlFor="epic-name">Epic name</Label>
          <Input
            id="epic-name"
            value={name}
            autoComplete="off"
            maxLength={32}
            placeholder="Display name"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || name.trim().length === 0}>
          {busy ? "Looking up…" : "Link account"}
        </Button>
      </form>
      {choices.length > 1 ? (
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
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
