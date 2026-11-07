"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { CheckIcon, CopyIcon, FileVideoIcon, LoaderCircleIcon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sites can't open a file picker at a path. Chrome's showOpenFilePicker can remember a folder,
 * but it refuses anything inside AppData, so players paste this into the normal picker instead.
 */
const REPLAY_FOLDER = "%LOCALAPPDATA%\\FortniteGame\\Saved\\Demos";

function ReplayFolder() {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");

  function copyPath() {
    navigator.clipboard.writeText(REPLAY_FOLDER).then(
      () => setCopy("copied"),
      () => setCopy("failed"),
    );
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="min-w-0 font-mono text-xs break-all select-all">{REPLAY_FOLDER}</code>
        <Button type="button" variant="outline" size="sm" onClick={copyPath}>
          {copy === "copied" ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
          {copy === "copied" ? "Copied" : "Copy folder path"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {copy === "failed"
          ? "Couldn't copy that. Select the path above and copy it yourself."
          : "On a Windows PC, this is where Fortnite saves replays. In the file window, paste it into the File name box and press Enter."}
      </p>
    </div>
  );
}

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
  const [dragging, setDragging] = useState(false);

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
      const result = await register({ storageId: body.storageId as Id<"_storage">, fileName: file.name });
      if (result.rejected) setError(result.rejected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-4" aria-labelledby="replays-heading">
      <div className="grid gap-1">
        <h2 id="replays-heading" className="text-xl font-semibold tracking-tight">
          Replays
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Drop a <span className="font-mono">.replay</span> from your PC and it stays on this account. Reading placement
          and damage out of the file is not in this build. Tournament damage comes from the session leaderboard.
        </p>
      </div>
      <ReplayFolder />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <label
          className={cn(
            "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm transition-colors hover:border-brand/40 hover:bg-card has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            dragging && "border-brand bg-brand/10",
            busy && "pointer-events-none opacity-70",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files[0]);
          }}
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
            {busy ? (
              <LoaderCircleIcon className="size-5 motion-safe:animate-spin" aria-hidden />
            ) : (
              <UploadIcon className="size-5" aria-hidden />
            )}
          </span>
          <span className="grid gap-1">
            <span className="font-medium">{busy ? "Uploading…" : dragging ? "Drop to upload" : "Drop a replay here"}</span>
            <span className="text-muted-foreground">or click to choose one</span>
          </span>
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
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <p className="eyebrow border-b border-border px-4 py-3">
            Stored {replays && replays.length > 0 ? `· ${replays.length}` : ""}
          </p>
          {replays === undefined ? (
            <div className="grid gap-2 p-4" aria-hidden>
              <div className="h-5 animate-pulse rounded bg-muted" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ) : replays.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No replays stored yet.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
              {replays.map((replay) => (
                <li key={replay._id} className="flex items-center gap-3 px-4 py-2.5">
                  <FileVideoIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{replay.fileName}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {formatBytes(replay.sizeBytes)} · {new Date(replay._creationTime).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
