import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { detectIntent } from "./intent";
import { HELP_TEXT, summarizeToolResult } from "./responses";

export interface MockModelOptions {
  /** Delay between streamed chunks, in ms. */
  chunkDelayInMs?: number;
}

type Plan =
  | { kind: "text"; text: string }
  | { kind: "tool-call"; toolName: string; input: Record<string, unknown> };

function lastUserText(prompt: LanguageModelV2Prompt): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const m = prompt[i]!;
    if (m.role === "user")
      return m.content
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join(" ");
  }
  return "";
}

/** Decides what the "model" does next, given the conversation so far. Pure and deterministic. */
export function planNextStep(
  prompt: LanguageModelV2Prompt,
  availableTools: readonly string[],
): Plan {
  const last = prompt[prompt.length - 1];

  // Second step of the tool loop: a tool just returned, so summarize its result.
  if (last?.role === "tool") {
    const texts = last.content.map((part) => {
      const out = part.output;
      if (out.type === "json") return summarizeToolResult(part.toolName, out.value);
      if (out.type === "error-text" || out.type === "error-json")
        return `The ${part.toolName} tool failed: ${typeof out.value === "string" ? out.value : JSON.stringify(out.value)}`;
      return summarizeToolResult(part.toolName, out.value);
    });
    return { kind: "text", text: texts.join("\n\n") };
  }

  const intent = detectIntent(lastUserText(prompt));
  if (intent.tool && availableTools.includes(intent.tool)) {
    return { kind: "tool-call", toolName: intent.tool, input: intent.input };
  }
  return { kind: "text", text: HELP_TEXT };
}

function chunkText(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [text];
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

let callCounter = 0;

/**
 * A deterministic LanguageModelV2. Because it implements the same interface as real providers,
 * `streamText` runs the exact same tool-calling loop with it as with Gemini.
 */
export function createMockModel(options: MockModelOptions = {}): LanguageModelV2 {
  const chunkDelayInMs = options.chunkDelayInMs ?? 18;

  const run = (callOptions: LanguageModelV2CallOptions) => {
    const tools = (callOptions.tools ?? []).map((t) => t.name);
    const plan = planNextStep(callOptions.prompt, tools);
    const inputTokens = estimateTokens(JSON.stringify(callOptions.prompt));
    return { plan, inputTokens };
  };

  return {
    specificationVersion: "v2",
    provider: "paypilot-mock",
    modelId: "paypilot-mock-1",
    supportedUrls: {},

    async doGenerate(callOptions) {
      const { plan, inputTokens } = run(callOptions);
      if (plan.kind === "tool-call") {
        return {
          content: [
            {
              type: "tool-call",
              toolCallId: `mock-call-${crypto.randomUUID().slice(0, 8)}-${++callCounter}`,
              toolName: plan.toolName,
              input: JSON.stringify(plan.input),
            },
          ],
          finishReason: "tool-calls",
          usage: { inputTokens, outputTokens: 20, totalTokens: inputTokens + 20 },
          warnings: [],
        };
      }
      const outputTokens = estimateTokens(plan.text);
      return {
        content: [{ type: "text", text: plan.text }],
        finishReason: "stop",
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        warnings: [],
      };
    },

    async doStream(callOptions) {
      const { plan, inputTokens } = run(callOptions);
      const chunks: LanguageModelV2StreamPart[] = [{ type: "stream-start", warnings: [] }];

      if (plan.kind === "tool-call") {
        chunks.push({
          type: "tool-call",
          toolCallId: `mock-call-${crypto.randomUUID().slice(0, 8)}-${++callCounter}`,
          toolName: plan.toolName,
          input: JSON.stringify(plan.input),
        });
        chunks.push({
          type: "finish",
          finishReason: "tool-calls",
          usage: { inputTokens, outputTokens: 20, totalTokens: inputTokens + 20 },
        });
      } else {
        // Honour maxOutputTokens roughly, like a real provider would.
        const max = callOptions.maxOutputTokens;
        let pieces = chunkText(plan.text);
        let finishReason: "stop" | "length" = "stop";
        if (max && estimateTokens(plan.text) > max) {
          pieces = pieces.slice(0, Math.max(1, Math.floor(max * 0.75)));
          finishReason = "length";
        }
        const id = `mock-text-${crypto.randomUUID().slice(0, 8)}-${++callCounter}`;
        chunks.push({ type: "text-start", id });
        for (const delta of pieces) chunks.push({ type: "text-delta", id, delta });
        chunks.push({ type: "text-end", id });
        const outputTokens = estimateTokens(pieces.join(""));
        chunks.push({
          type: "finish",
          finishReason,
          usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        });
      }

      return {
        stream: simulateReadableStream({
          chunks,
          initialDelayInMs: chunkDelayInMs * 4,
          chunkDelayInMs,
        }),
      };
    },
  };
}
