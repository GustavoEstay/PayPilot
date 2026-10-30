import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { createMockModel } from "./mock/mock-model";

export type ProviderId = "mock" | "gemini";

export interface ProviderInfo {
  id: ProviderId;
  modelId: string;
}

type Env = Record<string, string | undefined>;

/**
 * Provider selection. Mock is the default so the app works with zero setup; Gemini is only
 * used when a server-side key exists (and COPILOT_PROVIDER doesn't force mock).
 */
export function resolveProvider(env: Env = process.env): ProviderInfo {
  const forced = env.COPILOT_PROVIDER?.trim().toLowerCase();
  const hasKey = Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
  if (forced === "mock" || !hasKey) return { id: "mock", modelId: "paypilot-mock-1" };
  return { id: "gemini", modelId: env.GEMINI_MODEL?.trim() || "gemini-2.5-flash" };
}

export function getCopilotModel(env: Env = process.env): {
  model: LanguageModel;
  info: ProviderInfo;
} {
  const info = resolveProvider(env);
  if (info.id === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
    return { model: google(info.modelId), info };
  }
  const chunkDelayInMs = Number(env.MOCK_CHUNK_DELAY_MS ?? 18);
  return { model: createMockModel({ chunkDelayInMs }), info };
}
