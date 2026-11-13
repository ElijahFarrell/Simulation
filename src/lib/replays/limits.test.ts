import { describe, expect, it } from "vitest";
import { MAX_REPLAY_BYTES, replayFileName, replayUploadIssue } from "./limits";

describe("replayUploadIssue", () => {
  it("accepts a normal replay name and size", () => {
    expect(replayUploadIssue("match.replay", 1024)).toBeNull();
    expect(replayFileName("C:\\Demos\\match.replay")).toBe("match.replay");
  });

  it("rejects other files, empty files, and files over 120 MB", () => {
    expect(replayUploadIssue("notes.txt", 10)).toBe("Choose a .replay file.");
    expect(replayUploadIssue("match.replay", 0)).toBe("Replay must be under 120 MB.");
    expect(replayUploadIssue("match.replay", MAX_REPLAY_BYTES + 1)).toBe("Replay must be under 120 MB.");
  });
});
