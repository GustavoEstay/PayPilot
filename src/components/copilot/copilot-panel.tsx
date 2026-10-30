"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Badge, Button } from "@/components/ui";
import { SUGGESTIONS } from "@/lib/ai/suggestions";
import type { CopilotUIMessage } from "@/lib/ai/tools";
import { cn } from "@/lib/utils/cn";
import { CopilotMessage } from "./copilot-message";

const MAX_INPUT = 2_000;

interface ProviderInfo {
  id: "mock" | "gemini";
  modelId: string;
}

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, error, clearError, setMessages } =
    useChat<CopilotUIMessage>({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
    });

  const { data: provider } = useQuery({
    queryKey: ["copilot-provider"],
    queryFn: async () => (await (await fetch("/api/chat")).json()) as ProviderInfo,
    staleTime: Infinity,
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && window.matchMedia("(max-width: 1023px)").matches) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    clearError();
    void sendMessage({ text: trimmed.slice(0, MAX_INPUT) });
    setInput("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <aside
      id="copilot-panel"
      aria-label="AI copilot"
      hidden={!open}
      className={cn(
        "flex-col border-slate-200 bg-slate-50",
        open && "flex",
        // Mobile/tablet: slide-over. Desktop: docked column.
        "fixed inset-y-0 right-0 z-40 w-full max-w-md border-l shadow-xl",
        "lg:sticky lg:top-14 lg:bottom-auto lg:z-auto lg:h-[calc(100dvh-3.5rem)] lg:w-[400px] lg:max-w-none lg:shrink-0 lg:shadow-none",
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 lg:h-12">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Copilot</h2>
          {provider && (
            <Badge tone={provider.id === "mock" ? "neutral" : "brand"} title={provider.modelId}>
              {provider.id === "mock" ? "Mock provider" : `Gemini · ${provider.modelId}`}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={busy}>
              New chat
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close copilot">
            <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">
              Ask about your payments. I can explain drops, filter the table and prepare refunds
              that you approve.
            </p>
            <ul className="flex flex-col gap-2" aria-label="Suggested prompts">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    className="w-full rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:ring-brand-200 focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="flex flex-col gap-4"
          >
            {messages.map((m) => (
              <CopilotMessage key={m.id} message={m} />
            ))}
          </ol>
        )}
        {status === "submitted" && (
          <p className="mt-3 text-xs text-slate-500" role="status">
            Thinking…
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200"
          >
            {error.message.includes("429")
              ? "You're sending messages too fast. Wait a few seconds and try again."
              : "Something went wrong talking to the copilot."}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-slate-200 bg-white p-3">
        <label htmlFor="copilot-input" className="sr-only">
          Message the copilot
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="copilot-input"
            ref={inputRef}
            rows={2}
            maxLength={MAX_INPUT}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything about your payments…"
            className="min-h-10 flex-1 resize-none rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          />
          {busy ? (
            <Button variant="secondary" onClick={() => void stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-slate-400">
          Refunds always require your confirmation.
        </p>
      </form>
    </aside>
  );
}
