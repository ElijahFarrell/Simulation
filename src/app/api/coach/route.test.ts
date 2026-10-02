import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/engine/game";
import { MAX_QUESTION_CHARS, PASSCODE_HEADER } from "@/lib/coach/constants";
import { buildCoachContext } from "@/lib/coach/context";

const streamCoachReply = vi.hoisted(() => vi.fn(async () => new Response("streamed")));

vi.mock("@/lib/coach/reply", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/coach/reply")>()),
  streamCoachReply,
}));

const { POST } = await import("./route");

const PASSCODE = "rotate-early";
const context = buildCoachContext(createGame(3), null);

function ask(text: string, passcode: string | null = PASSCODE, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (passcode !== null) headers[PASSCODE_HEADER] = passcode;
  const payload = body ?? {
    id: "chat",
    trigger: "submit-message",
    messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
    context,
  };
  return POST(new Request("http://localhost/api/coach", { method: "POST", headers, body: JSON.stringify(payload) }));
}

describe("POST /api/coach", () => {
  beforeEach(() => vi.stubEnv("COACH_PASSCODE", PASSCODE));
  afterEach(() => {
    vi.unstubAllEnvs();
    streamCoachReply.mockClear();
  });

  it("refuses to run when no passcode is configured", async () => {
    vi.stubEnv("COACH_PASSCODE", "");
    const response = await ask("hi");
    expect(response.status).toBe(503);
    expect(streamCoachReply).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong passcode", async () => {
    expect((await ask("hi", null)).status).toBe(401);
    expect((await ask("hi", "nope")).status).toBe(401);
    expect(streamCoachReply).not.toHaveBeenCalled();
  });

  it("rejects requests without valid game context", async () => {
    const response = await ask("hi", PASSCODE, { messages: [{ id: "m1", role: "user", parts: [] }] });
    expect(response.status).toBe(400);
  });

  it("rejects questions over the length limit", async () => {
    const response = await ask("x".repeat(MAX_QUESTION_CHARS + 1));
    expect(response.status).toBe(413);
  });

  it("streams a reply for an authorized question", async () => {
    const response = await ask("Why did I lose that zone?");
    expect(response.status).toBe(200);
    expect(streamCoachReply).toHaveBeenCalledOnce();
    expect(streamCoachReply).toHaveBeenCalledWith(
      [expect.objectContaining({ role: "user" })],
      expect.objectContaining({ seed: context.seed }),
    );
  });
});
