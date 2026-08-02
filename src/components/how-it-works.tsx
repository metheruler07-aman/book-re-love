import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

/**
 * Small collapsible explainer shown above a major feature section.
 * Keeps the rules of each area one click away without crowding the page.
 */
export function HowItWorks({
  title = "How it works",
  summary,
  points,
  defaultOpen = false,
}: {
  title?: string;
  summary: string;
  points: string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-border bg-secondary/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/70"
      >
        <HelpCircle className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="space-y-1.5 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          {points.map((p, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
