import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { getCopilotModel, resolveProvider } from "@/lib/ai/provider";
import { clientKey, createRateLimiter } from "@/lib/ai/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { copilotTools, type CopilotUIMessage } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OUTPUT_TOKENS = 800;
const MAX_MESSAGES = 30;
const MAX_CHARS_PER_MESSAGE = 2_000;

const limiter = createRateLimiter({
  limit: Number(process.env.COPILOT_RATE_LIMIT_PER_MINUTE ?? 20),
  windowMs: 60_000,
});

const bodySchema = z.object({
  messages: z.array(z.object({ id: z.string(), role: z.string(), parts: z.array(z.unknown()) })),
});

function textLength(message: CopilotUIMessage): number {
  return message.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0);
}

/** Exposes which provider is active (no secrets) so the UI can show a badge. */
export function GET() {
  return Response.json(resolveProvider());
}

export async function POST(req: Request) {
  const limit = limiter(clientKey(req.headers));
  if (!limit.ok) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request body." }, { status: 400 });

  const messages = (parsed.data.messages as CopilotUIMessage[]).slice(-MAX_MESSAGES);
  if (messages.some((m) => textLength(m) > MAX_CHARS_PER_MESSAGE)) {
    return Response.json({ error: "Message too long." }, { status: 413 });
  }

  const { model } = getCopilotModel();

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools: copilotTools,
    stopWhen: stepCountIs(4),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.2,
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[copilot]", error);
      return "The copilot ran into a problem. Please try again.";
    },
  });
}
