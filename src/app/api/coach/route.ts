import { validateUIMessages, type UIMessage } from "ai";
import { z } from "zod";
import { checkPasscode } from "@/lib/coach/access";
import { MAX_QUESTION_CHARS, PASSCODE_HEADER } from "@/lib/coach/constants";
import { coachTools, streamCoachReply } from "@/lib/coach/reply";
import { coachContextSchema } from "@/lib/coach/schema";

export const maxDuration = 60;

const MAX_BODY_CHARS = 200_000;

const requestSchema = z.object({
  messages: z.array(z.unknown()).min(1).max(60),
  context: coachContextSchema,
});

export async function POST(request: Request): Promise<Response> {
  const access = checkPasscode(request.headers.get(PASSCODE_HEADER), process.env.COACH_PASSCODE);
  if (access === "not-configured") return text("The coach isn't set up yet. Add COACH_PASSCODE on Vercel.", 503);
  if (access === "denied") return text("Wrong passcode.", 401);

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return text("This chat is too long. Start a new game to reset it.", 413);

  const parsed = requestSchema.safeParse(safeJson(raw));
  if (!parsed.success) return text("Bad coach request.", 400);

  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({ messages: parsed.data.messages, tools: coachTools });
  } catch {
    return text("Bad coach request.", 400);
  }
  if (latestQuestionLength(messages) > MAX_QUESTION_CHARS) {
    return text(`Keep questions under ${MAX_QUESTION_CHARS} characters.`, 413);
  }

  return streamCoachReply(messages, parsed.data.context);
}

function latestQuestionLength(messages: UIMessage[]): number {
  const last = messages.findLast((message) => message.role === "user");
  if (!last) return 0;
  return last.parts.reduce((total, part) => total + (part.type === "text" ? part.text.length : 0), 0);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function text(message: string, status: number): Response {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}
