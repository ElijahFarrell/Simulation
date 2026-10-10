"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReplayDrop() {
  const replays = useQuery(api.replays.list, {});
  const generateUploadUrl = useMutation(api.replays.generateUploadUrl);
  const register = useMutation(api.replays.register);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.name.toLowerCase().endsWith(".replay")) {
      setError("Choose a .replay file.");
      return;
    }
    setBusy(true);
    try {
      const url = await generateUploadUrl();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error("Upload didn't finish.");
      const body: unknown = await response.json();
      if (typeof body !== "object" || body === null || !("storageId" in body) || typeof body.storageId !== "string") {
        throw new Error("Upload didn't finish.");
      }
      await register({ storageId: body.storageId as Id<"_storage">, fileName: file.name });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-1">
        <h2 className="text-sm font-medium">Replays</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Drop a <span className="font-mono">.replay</span> from your PC and it stays on this account. Reading
          placement and damage out of the file is not in this build. Tournament damage and the qual line come from
          the live session leaderboard.
        </p>
      </div>
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground hover:bg-muted/40"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload(event.dataTransfer.files[0]);
        }}
      >
        <span>{busy ? "Uploading…" : "Drop a replay, or click to choose one"}</span>
        <input
          type="file"
          accept=".replay"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void upload(file);
          }}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {replays === undefined ? (
        <p className="text-sm text-muted-foreground">Loading replays…</p>
      ) : replays.length === 0 ? (
        <p className="text-sm text-muted-foreground">No replays stored yet.</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {replays.map((replay) => (
            <li key={replay._id} className="flex items-center justify-between gap-3">
              <span className="truncate font-mono">{replay.fileName}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatBytes(replay.sizeBytes)} · {new Date(replay._creationTime).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
