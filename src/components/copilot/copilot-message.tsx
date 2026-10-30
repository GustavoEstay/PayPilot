"use client";

import type { CopilotUIMessage } from "@/lib/ai/tools";
import { cn } from "@/lib/utils/cn";
import { FilterAppliedCard } from "./filter-applied-card";
import { MarkdownLite } from "./markdown-lite";
import { RefundConfirmCard } from "./refund-confirm-card";
import { SalesDropCard } from "./sales-drop-card";

const TOOL_LABELS = {
  "tool-analyzeSalesDrop": "Analyzing sales…",
  "tool-filterPayments": "Filtering payments…",
  "tool-proposeRefund": "Preparing refund proposal…",
} as const;

function ToolPending({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
      <span
        aria-hidden
        className="size-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
      />
      {label}
    </div>
  );
}

function ToolError({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800 ring-1 ring-rose-200"
    >
      {text}
    </div>
  );
}

export function CopilotMessage({ message }: { message: CopilotUIMessage }) {
  const isUser = message.role === "user";
  return (
    <li
      className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}
      data-testid={`message-${message.role}`}
    >
      <span className="sr-only">{isUser ? "You said:" : "Copilot said:"}</span>
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;
        switch (part.type) {
          case "text":
            return part.text ? (
              <div
                key={key}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  isUser
                    ? "max-w-[88%] rounded-br-sm bg-brand-600 text-white"
                    : "w-full rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200",
                )}
              >
                {isUser ? part.text : <MarkdownLite text={part.text} />}
              </div>
            ) : null;
          case "tool-analyzeSalesDrop":
          case "tool-filterPayments":
          case "tool-proposeRefund": {
            if (part.state === "output-error") return <ToolError key={key} text={part.errorText} />;
            if (part.state !== "output-available")
              return <ToolPending key={key} label={TOOL_LABELS[part.type]} />;
            return (
              <div key={key} className="w-full">
                {part.type === "tool-analyzeSalesDrop" && <SalesDropCard analysis={part.output} />}
                {part.type === "tool-filterPayments" && (
                  <FilterAppliedCard toolCallId={part.toolCallId} output={part.output} />
                )}
                {part.type === "tool-proposeRefund" && (
                  <RefundConfirmCard toolCallId={part.toolCallId} output={part.output} />
                )}
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </li>
  );
}
