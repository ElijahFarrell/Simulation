export const MAX_REPLAY_BYTES = 120 * 1024 * 1024;
export const MAX_REPLAY_NAME_LENGTH = 180;

export function replayFileName(fileName: string): string {
  return fileName.split(/[/\\]/).pop()?.trim() ?? "";
}

/** Shared by the browser and Convex so a huge file is refused before and after upload. */
export function replayUploadIssue(fileName: string, sizeBytes: number): string | null {
  const base = replayFileName(fileName);
  if (!base.toLowerCase().endsWith(".replay") || base.length > MAX_REPLAY_NAME_LENGTH) {
    return "Choose a .replay file.";
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_REPLAY_BYTES) {
    return "Replay must be under 120 MB.";
  }
  return null;
}
