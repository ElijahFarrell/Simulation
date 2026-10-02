import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  gateway,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildInstructions } from "./instructions";
import type { CoachContext } from "./schema";

const COACH_MODEL = "openai/gpt-5.6-luna";
const FALLBACK_MODEL = "openai/gpt-oss-120b";
const MAX_HISTORY = 20;

export const coachTools = {
  web_search: gateway.tools.perplexitySearch({ maxResults: 5, maxTokens: 6000 }),
};

export async function streamCoachReply(messages: UIMessage[], context: CoachContext): Promise<Response> {
  const result = streamText({
    model: COACH_MODEL,
    instructions: buildInstructions(context),
    messages: await convertToModelMessages(messages.slice(-MAX_HISTORY)),
    tools: coachTools,
    stopWhen: isStepCount(4),
    maxOutputTokens: 1500,
    providerOptions: {
      gateway: {
        models: [FALLBACK_MODEL],
        tags: ["feature:coach"],
      },
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => "The coach hit an error. Try again in a moment.",
    }),
  });
}
