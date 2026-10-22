import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-aipa text-sm">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Couldn't copy to clipboard");
        }
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {label}
    </Button>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Thinking({ label = "AIPA is thinking" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}…
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="fade-up mb-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="text-xs text-muted-foreground">
      AI-generated content may contain errors. Review emails before sending and verify important research
      claims. Your data is saved only in this browser — clearing browser data will remove it.
    </p>
  );
}

export function AipaMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`${className} inline-grid shrink-0 place-items-center rounded-lg bg-ink font-display text-lg leading-none text-accent`}
      aria-hidden
    >
      a
    </span>
  );
}

export function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
