import { Fragment, type ReactNode } from "react";

/** Tiny, safe renderer for the subset we use: paragraphs, "- " bullets and **bold**. No HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith("**") && chunk.endsWith("**") ? (
      <strong key={i} className="font-semibold text-slate-900">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{chunk}</Fragment>
    ),
  );
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const bullets = lines.filter((l) => l.startsWith("- "));
        const head = lines.filter((l) => !l.startsWith("- "));
        return (
          <Fragment key={i}>
            {head.length > 0 && <p>{inline(head.join(" "))}</p>}
            {bullets.length > 0 && (
              <ul className="ml-4 list-disc space-y-1">
                {bullets.map((b, j) => (
                  <li key={j}>{inline(b.slice(2))}</li>
                ))}
              </ul>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
