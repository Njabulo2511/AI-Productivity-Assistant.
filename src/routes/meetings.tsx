import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Bookmark, Wand2, Pencil, Check, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, Disclaimer, ErrorNote, PageHeader, Thinking, parseJson } from "@/components/aipa/bits";
import { TaskSuggestions, type Suggestion } from "@/components/aipa/TaskSuggestions";
import { aiGenerate } from "@/lib/ai.functions";
import { saveItem, todayStr } from "@/lib/store";
import { meta } from "@/lib/meta";
import { toast } from "sonner";

export const Route = createFileRoute("/meetings")({
  head: () => meta("Meeting Notes Summarizer — AIPA", "Turn raw meeting notes into a summary, key points, decisions and action items."),
  component: MeetingsPage,
});

type Result = { summary: string; keyPoints: string[]; decisions: string[]; actionItems: Suggestion[] };

const toText = (r: Result) =>
  `## Summary\n${r.summary}\n\n## Key points\n${r.keyPoints.map((k) => `- ${k}`).join("\n") || "- None"}\n\n## Decisions\n${r.decisions.map((k) => `- ${k}`).join("\n") || "- None recorded"}\n\n## Action items\n${r.actionItems.map((a) => `- ${a.title}${a.due ? ` (due ${a.due})` : ""}`).join("\n") || "- None recorded"}`;

function MeetingsPage() {
  const [notes, setNotes] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [edit, setEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const run = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    setError("");
    setEdit(false);
    const r = await aiGenerate({
      data: {
        json: true,
        system:
          "You summarise meeting notes faithfully. Only use information in the notes. If decisions or action items are not present, return empty arrays. Never invent owners, dates or details.",
        prompt: `Today is ${todayStr()}. Return {"summary": string, "keyPoints": string[], "decisions": string[], "actionItems": [{"title": string, "priority": "low"|"medium"|"high", "due": "YYYY-MM-DD" or null}]}.\n\nNotes:\n${notes}`,
      },
    });
    setLoading(false);
    if (r.error) return setError(r.error);
    const p = parseJson<Result>(r.text!);
    if (!p?.summary) return setError("Couldn't read the AI response. Please regenerate.");
    setRes({
      summary: p.summary,
      keyPoints: p.keyPoints ?? [],
      decisions: p.decisions ?? [],
      actionItems: (p.actionItems ?? []).map((a) => ({ ...a, due: a.due ?? undefined })),
    });
  };

  const listEdit = (key: "keyPoints" | "decisions") => (
    <Textarea
      rows={4}
      value={res![key].join("\n")}
      onChange={(e) => setRes({ ...res!, [key]: e.target.value.split("\n") })}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <PageHeader eyebrow="Tool 02" title="Meeting Notes Summarizer" desc="Paste your notes. AIPA pulls out what matters — without adding anything that isn't there." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={18} placeholder="Paste meeting notes or a transcript here…" />
          <Button onClick={run} disabled={!notes.trim() || loading} className="w-full">
            <Wand2 className="size-4" /> {loading ? "Summarising…" : "Summarise notes"}
          </Button>
        </div>
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          {loading && <Thinking label="Reading your notes" />}
          {error && <ErrorNote message={error} />}
          {!res && !loading && !error && (
            <div className="grid min-h-60 place-items-center text-sm text-muted-foreground">Summary, decisions and action items will appear here.</div>
          )}
          {res && (
            <>
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Summary</h3>
                {edit ? (
                  <Textarea rows={4} value={res.summary} onChange={(e) => setRes({ ...res, summary: e.target.value })} />
                ) : (
                  <p className="text-sm">{res.summary}</p>
                )}
              </section>
              {(["keyPoints", "decisions"] as const).map((k) => (
                <section key={k}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    {k === "keyPoints" ? "Key points" : "Decisions"}
                  </h3>
                  {edit ? listEdit(k) : res[k].filter(Boolean).length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">{res[k].filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}</ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">None recorded in the notes.</p>
                  )}
                </section>
              ))}
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">Action items</h3>
                {res.actionItems.length ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {res.actionItems.map((a, i) => (
                      <li key={i}>{a.title}{a.due && <span className="text-muted-foreground"> — due {a.due}</span>}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No action items found in the notes.</p>
                )}
              </section>
              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" onClick={() => setEdit((e) => !e)}>
                  {edit ? <Check className="size-4" /> : <Pencil className="size-4" />} {edit ? "Done" : "Edit"}
                </Button>
                <CopyButton text={toText(res)} />
                <Button variant="ghost" size="sm" onClick={run} disabled={loading}>
                  <RefreshCw className="size-4" /> Regenerate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    saveItem({ type: "meeting", title: res.summary.slice(0, 60), content: toText(res) });
                    toast.success("Saved to My Workspace");
                  }}
                >
                  <Bookmark className="size-4" /> Save
                </Button>
                <Button size="sm" disabled={!res.actionItems.length} onClick={() => setOpen(true)}>
                  <ListPlus className="size-4" /> Add action items to tasks
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-6"><Disclaimer /></div>
      <TaskSuggestions open={open} onOpenChange={setOpen} suggestions={res?.actionItems ?? []} title="Add action items to Task Planner" />
    </div>
  );
}
