import type { LanguageModelV2Prompt } from "@ai-sdk/provider";
import { describe, expect, it } from "vitest";
import { detectIntent } from "@/lib/ai/mock/intent";
import { planNextStep } from "@/lib/ai/mock/mock-model";
import { resolveProvider } from "@/lib/ai/provider";
import { createRateLimiter } from "@/lib/ai/rate-limit";

const TOOLS = ["analyzeSalesDrop", "filterPayments", "proposeRefund"];

describe("mock intent detection", () => {
  it("routes sales-drop questions to analyzeSalesDrop", () => {
    expect(detectIntent("Why did sales drop in the last 7 days?")).toEqual({
      tool: "analyzeSalesDrop",
      input: { range: "7d" },
    });
    expect(detectIntent("why did revenue fall this month")).toMatchObject({
      input: { range: "30d" },
    });
  });

  it("routes table requests to filterPayments with parsed filters", () => {
    expect(detectIntent("Show rejected card payments from the last 7 days")).toEqual({
      tool: "filterPayments",
      input: {
        status: "rejected",
        method: "card",
        dateRange: { from: "2026-10-23", to: "2026-10-29" },
      },
    });
    expect(detectIntent("show declined wallet payments due to insufficient funds")).toMatchObject({
      tool: "filterPayments",
      input: { status: "rejected", method: "wallet", reason: "insufficient_funds" },
    });
  });

  it("routes refunds to proposeRefund with id, amount and reason", () => {
    expect(detectIntent("Refund $50 of PAY-0426 because the item arrived damaged")).toEqual({
      tool: "proposeRefund",
      input: { paymentId: "PAY-0426", amount: 50, reason: "the item arrived damaged" },
    });
  });

  it("falls back to no tool for small talk", () => {
    expect(detectIntent("hello!")).toEqual({ tool: null });
  });
});

describe("mock model planning", () => {
  const user = (text: string): LanguageModelV2Prompt => [
    { role: "user", content: [{ type: "text", text }] },
  ];

  it("emits a tool call for a user request", () => {
    expect(planNextStep(user("Why did sales drop?"), TOOLS)).toMatchObject({
      kind: "tool-call",
      toolName: "analyzeSalesDrop",
    });
  });

  it("does not call tools that are not available", () => {
    expect(planNextStep(user("Why did sales drop?"), [])).toMatchObject({ kind: "text" });
  });

  it("summarizes after a tool result (second step of the loop)", () => {
    const prompt: LanguageModelV2Prompt = [
      ...user("refund PAY-0426"),
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "1",
            toolName: "proposeRefund",
            output: {
              type: "json",
              value: {
                status: "awaiting_confirmation",
                paymentId: "PAY-0426",
                amount: 10,
                currency: "USD",
                refundable: 10,
                reason: "x",
                merchant: "Brooklyn Audio",
                createdAt: "2026-10-24T00:00:00.000Z",
                isPartial: false,
              },
            },
          },
        ],
      },
    ];
    const plan = planNextStep(prompt, TOOLS);
    expect(plan.kind).toBe("text");
    if (plan.kind === "text") expect(plan.text).toMatch(/Nothing has been refunded yet/);
  });
});

describe("provider selection", () => {
  it("defaults to mock without a key", () => {
    expect(resolveProvider({}).id).toBe("mock");
  });
  it("uses Gemini when a key exists, with a configurable model", () => {
    expect(
      resolveProvider({ GOOGLE_GENERATIVE_AI_API_KEY: "k", GEMINI_MODEL: "gemini-2.5-pro" }),
    ).toEqual({ id: "gemini", modelId: "gemini-2.5-pro" });
  });
  it("can be forced to mock even with a key", () => {
    expect(
      resolveProvider({ GOOGLE_GENERATIVE_AI_API_KEY: "k", COPILOT_PROVIDER: "mock" }).id,
    ).toBe("mock");
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and resets after the window", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("a", 1).ok).toBe(true);
    const blocked = check("a", 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(check("b", 2).ok).toBe(true);
    expect(check("a", 1001).ok).toBe(true);
  });
});
