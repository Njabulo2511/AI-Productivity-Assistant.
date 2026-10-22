import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Bookmark, Search, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, Disclaimer, ErrorNote, Markdown, PageHeader, Thinking } from "@/components/aipa/bits";
import { streamAI } from "@/lib/chat";
import { saveItem } from "@/lib/store";
import { meta } from "@/lib/meta";
import { toast } from "sonner";

export const Route = createFileRoute("/research")({
  head: () => meta("AI Research Assistant — AIPA", "Ask questions and get clear, structured answers to explore any topic."),
  component: ResearchPage,
});

const SYSTEM = `Research mode: answer with a structured markdown response — a short direct answer, then sections with headings and bullet points, then "Things to verify" listing claims worth checking. You do NOT search the internet: answer from general knowledge only, never fabricate sources, citations, statistics or URLs, and state uncertainty clearly.`;

function ResearchPage() {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(false);

  const run = async (question = q) => {
    if (!question.trim()) return;
    setAsked(question);
    setLoading(true);
    setError("");
    setEdit(false);
    setAnswer("");
    const r = await streamAI([{ role: "user", content: question }], setAnswer, SYSTEM);
    setLoading(false);
    if (r.error) setError(r.error);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <PageHeader eyebrow="Tool 04" title="AI Research Assistant" desc="Clear, structured answers from AI knowledge. No web search, no invented sources." />
      <form
        className="flex items-end gap-2 rounded-2xl border bg-card p-3 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <Textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} placeholder="e.g. What are the trade-offs between remote and hybrid work for small teams?" className="resize-none border-0 shadow-none focus-visible:ring-0" />
        <Button type="submit" disabled={!q.trim() || loading}>
          <Search className="size-4" /> Ask
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        {loading && !answer && <Thinking label="Researching" />}
        {error && <ErrorNote message={error} />}
        {answer && (
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{asked}</p>
            {edit ? <Textarea rows={18} value={answer} onChange={(e) => setAnswer(e.target.value)} /> : <Markdown>{answer}</Markdown>}
            {!loading && (
              <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" onClick={() => setEdit((e) => !e)}>
                  {edit ? <Check className="size-4" /> : <Pencil className="size-4" />} {edit ? "Done" : "Edit"}
                </Button>
                <CopyButton text={answer} />
                <Button variant="ghost" size="sm" onClick={() => run(asked)}>
                  <RefreshCw className="size-4" /> Regenerate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    saveItem({ type: "research", title: asked.slice(0, 80), content: answer });
                    toast.success("Saved to My Workspace");
                  }}
                >
                  <Bookmark className="size-4" /> Save
                </Button>
              </div>
            )}
          </div>
        )}
        {!answer && !loading && !error && (
          <p className="py-10 text-center text-sm text-muted-foreground">Ask a question to get started.</p>
        )}
      </div>
      <div className="mt-6"><Disclaimer /></div>
    </div>
  );
}
