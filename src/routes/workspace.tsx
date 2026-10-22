import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CopyButton, Disclaimer, Markdown, PageHeader } from "@/components/aipa/bits";
import { savedStore, useStore, type SavedItem, type SavedType } from "@/lib/store";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace")({
  head: () => meta("My Workspace — AIPA", "Revisit your saved emails, meeting summaries, research and AI responses."),
  component: WorkspacePage,
});

const LABELS: Record<SavedType | "all", string> = {
  all: "All", email: "Emails", meeting: "Meetings", research: "Research", chat: "Chat", plan: "Plans",
};

function WorkspacePage() {
  const items = useStore(savedStore);
  const [filter, setFilter] = useState<SavedType | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const open = items.find((i) => i.id === openId);
  const shown = items.filter((i) => filter === "all" || i.type === filter);
  const update = (patch: Partial<SavedItem>) => savedStore.set((p) => p.map((i) => (i.id === openId ? { ...i, ...patch } : i)));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader eyebrow="Library" title="My Workspace" desc="Everything you've saved, kept in this browser." />
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(LABELS) as (SavedType | "all")[]).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === k ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50")}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Nothing saved yet. Use "Save" in any tool or chat reply to keep it here.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((i) => (
            <div key={i.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">{LABELS[i.type]}</span>
                {new Date(i.createdAt).toLocaleDateString()}
              </div>
              <p className="mt-2 line-clamp-1 font-medium">{i.title}</p>
              <p className="mt-1 line-clamp-3 flex-1 whitespace-pre-line text-sm text-muted-foreground">{i.content}</p>
              <div className="mt-3 -ml-2 flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setOpenId(i.id); setEdit(false); }}>
                  <FolderOpen className="size-4" /> Open
                </Button>
                <CopyButton text={i.content} />
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => savedStore.set((p) => p.filter((x) => x.id !== i.id))}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-8"><Disclaimer /></div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.title}</DialogTitle>
            <DialogDescription>{open && `${LABELS[open.type]} · saved ${new Date(open.createdAt).toLocaleString()}`}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {open && (edit ? <Textarea rows={16} value={open.content} onChange={(e) => update({ content: e.target.value })} /> : <Markdown>{open.content}</Markdown>)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEdit((e) => !e)}>{edit ? "Done editing" : "Edit"}</Button>
            {open && <CopyButton text={open.content} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
