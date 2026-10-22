import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Bookmark, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CopyButton, Disclaimer, ErrorNote, PageHeader, Thinking, parseJson } from "@/components/aipa/bits";
import { aiGenerate } from "@/lib/ai.functions";
import { saveItem } from "@/lib/store";
import { meta } from "@/lib/meta";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/email")({
  head: () => meta("Smart Email Generator — AIPA", "Generate editable emails in the tone you need, ready to review and send."),
  component: EmailPage,
});

const TONES = ["professional", "friendly", "formal", "concise", "persuasive", "apologetic"];

function EmailPage() {
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [context, setContext] = useState("");
  const [to, setTo] = useState("");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    const r = await aiGenerate({
      data: {
        json: true,
        system:
          "You write clear, well-structured emails. Use placeholders like [Name] for any details not provided rather than inventing them.",
        prompt: `Write an email.\nTopic: ${topic}\nTone: ${tone}\nInstructions: ${instructions || "none"}\nContext: ${context || "none"}\nReturn {"subject": string, "body": string} with the body as plain text including greeting and sign-off.`,
      },
    });
    setLoading(false);
    if (r.error) return setError(r.error);
    const p = parseJson<{ subject: string; body: string }>(r.text!);
    if (!p?.body) return setError("Couldn't read the AI response. Please regenerate.");
    setSubject(p.subject ?? "");
    setBody(p.body);
  };

  const full = `Subject: ${subject}\n\n${body}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlook = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <PageHeader eyebrow="Tool 01" title="Smart Email Generator" desc="Describe what you need — AIPA drafts it, you review and send it yourself." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic *</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Request to reschedule Friday's review" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ins">Instructions</Label>
            <Textarea id="ins" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Key points to include, length, call to action…" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctx">Context</Label>
            <Textarea id="ctx" value={context} onChange={(e) => setContext(e.target.value)} placeholder="Who it's for, background, previous messages…" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm capitalize transition",
                    tone === t ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={!topic.trim() || loading} className="w-full">
            <Wand2 className="size-4" /> {loading ? "Writing…" : "Generate email"}
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          {loading && <Thinking label="Drafting your email" />}
          {error && <ErrorNote message={error} />}
          {!body && !loading && !error && (
            <div className="grid h-full min-h-60 place-items-center text-center text-sm text-muted-foreground">
              Your draft will appear here, fully editable.
            </div>
          )}
          {body && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="subj">Subject</Label>
                <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={14} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">Recipient (optional, for compose links)</Label>
                <Input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" />
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={full} />
                <Button variant="ghost" size="sm" onClick={generate} disabled={loading}>
                  <RefreshCw className="size-4" /> Regenerate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    saveItem({ type: "email", title: subject || topic, content: full });
                    toast.success("Saved to My Workspace");
                  }}
                >
                  <Bookmark className="size-4" /> Save
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={gmail} target="_blank" rel="noreferrer">Open in Gmail</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={outlook} target="_blank" rel="noreferrer">Open in Outlook</a>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-6"><Disclaimer /></div>
    </div>
  );
}
