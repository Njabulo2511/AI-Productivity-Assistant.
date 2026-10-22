import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Pencil, Check, Wand2, CalendarRange, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton, Disclaimer, ErrorNote, Markdown, PageHeader, Thinking } from "@/components/aipa/bits";
import { TaskSuggestions, type Suggestion } from "@/components/aipa/TaskSuggestions";
import { addTasks, deleteTask, isOverdue, saveItem, tasksStore, todayStr, updateTask, useStore, type Priority, type Task } from "@/lib/store";
import { extractTasks } from "@/lib/extract";
import { aiGenerate } from "@/lib/ai.functions";
import { meta } from "@/lib/meta";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => meta("AI Task Planner — AIPA", "Manage tasks with priorities and due dates, and let AI break goals into plans."),
  component: TasksPage,
});

type View = "pending" | "completed" | "overdue" | "all";
const PRI_STYLE: Record<Priority, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-accent text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

function TaskRow({ t }: { t: Task }) {
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState(t);
  const overdue = isOverdue(t);
  if (editing)
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <Input className="min-w-48 flex-1" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as Priority })}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <Input type="date" className="w-40" value={d.due ?? ""} onChange={(e) => setD({ ...d, due: e.target.value || undefined })} />
        <Button size="sm" onClick={() => { if (d.title.trim()) { updateTask(t.id, { title: d.title.trim(), priority: d.priority, due: d.due }); setEditing(false); } }}>
          <Check className="size-4" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setD(t); setEditing(false); }}>Cancel</Button>
      </div>
    );
  return (
    <div className={cn("group flex items-center gap-3 rounded-xl border bg-card p-3", overdue && "border-destructive/40")}>
      <Checkbox checked={t.done} onCheckedChange={(v) => updateTask(t.id, { done: !!v })} aria-label="Complete task" />
      <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs capitalize", PRI_STYLE[t.priority])}>{t.priority}</span>
      {t.due && <span className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>{overdue ? "Overdue · " : ""}{t.due}</span>}
      <Button variant="ghost" size="icon" className="size-8" onClick={() => { setD(t); setEditing(true); }} aria-label="Edit task"><Pencil className="size-4" /></Button>
      <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => deleteTask(t.id)} aria-label="Delete task"><Trash2 className="size-4" /></Button>
    </div>
  );
}

function TasksPage() {
  const tasks = useStore(tasksStore);
  const [view, setView] = useState<View>("pending");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState<"" | "breakdown" | "daily" | "weekly">("");
  const [err, setErr] = useState("");
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState("");

  const today = todayStr();
  const counts = {
    pending: tasks.filter((t) => !t.done).length,
    completed: tasks.filter((t) => t.done).length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
    all: tasks.length,
  };
  const order = { high: 0, medium: 1, low: 2 };
  const shown = tasks
    .filter((t) => (view === "all" ? true : view === "completed" ? t.done : view === "overdue" ? isOverdue(t, today) : !t.done))
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || order[a.priority] - order[b.priority]);

  const breakdown = async () => {
    if (!goal.trim()) return;
    setBusy("breakdown"); setErr("");
    const r = await extractTasks(goal, "breakdown");
    setBusy("");
    if (r.error) return setErr(r.error);
    setSugg(r.tasks!); setOpen(true);
  };

  const suggestPlan = async (kind: "daily" | "weekly") => {
    const pending = tasks.filter((t) => !t.done);
    if (!pending.length) return setErr("Add some pending tasks first so AIPA has something to plan.");
    setBusy(kind); setErr(""); setPlan("");
    const r = await aiGenerate({
      data: {
        system: "You are a pragmatic productivity coach. Build realistic plans using only the tasks provided.",
        prompt: `Today is ${today}. Create a ${kind === "daily" ? "plan for today with time blocks" : "plan for the next 7 days, grouped by day"} in markdown. Prioritise overdue and high-priority items. Keep it concise.\n\nTasks:\n${pending.map((t) => `- ${t.title} [${t.priority}]${t.due ? ` due ${t.due}` : ""}`).join("\n")}`,
      },
    });
    setBusy("");
    if (r.error) return setErr(r.error);
    setPlan(r.text!);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <PageHeader eyebrow="Tool 03" title="AI Task Planner" desc="Your tasks, priorities and deadlines — with AI to break down goals and plan your time." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <form
            className="flex flex-wrap gap-2 rounded-2xl border bg-card p-3 shadow-soft"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addTasks([{ title: title.trim(), priority, due: due || undefined }]);
              setTitle(""); setDue("");
            }}
          >
            <Input className="min-w-48 flex-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" />
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <Input type="date" className="w-40" value={due} onChange={(e) => setDue(e.target.value)} />
            <Button type="submit" disabled={!title.trim()}><Plus className="size-4" /> Add</Button>
          </form>

          <div className="flex flex-wrap gap-2">
            {(["pending", "overdue", "completed", "all"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={cn("rounded-full border px-3 py-1 text-sm capitalize", view === v ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50")}>
                {v} <span className="opacity-70">{counts[v]}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {shown.length ? shown.map((t) => <TaskRow key={t.id + t.title + t.due + t.priority} t={t} />) : (
              <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                {view === "overdue" ? "Nothing overdue. Nice." : view === "completed" ? "No completed tasks yet." : "No tasks here yet. Add one above or let AI break down a goal."}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border bg-ink p-5 text-ink-foreground shadow-soft">
            <p className="font-display text-2xl">Break down a goal</p>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="e.g. Launch a company newsletter by end of month" className="bg-background text-foreground" />
            <Button variant="secondary" className="w-full" onClick={breakdown} disabled={!goal.trim() || !!busy}>
              <Wand2 className="size-4" /> {busy === "breakdown" ? "Breaking it down…" : "Suggest tasks"}
            </Button>
          </div>
          <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
            <p className="font-display text-2xl">Plan my time</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => suggestPlan("daily")} disabled={!!busy}><CalendarRange className="size-4" /> Today</Button>
              <Button variant="outline" className="flex-1" onClick={() => suggestPlan("weekly")} disabled={!!busy}><CalendarRange className="size-4" /> This week</Button>
            </div>
            {(busy === "daily" || busy === "weekly") && <Thinking label="Planning" />}
            {err && <ErrorNote message={err} />}
            {plan && (
              <div className="border-t pt-3">
                <Markdown>{plan}</Markdown>
                <div className="mt-2 -ml-2 flex gap-1">
                  <CopyButton text={plan} />
                  <Button variant="ghost" size="sm" onClick={() => { saveItem({ type: "plan", title: `Plan · ${today}`, content: plan }); toast.success("Saved to My Workspace"); }}>
                    <Bookmark className="size-4" /> Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6"><Disclaimer /></div>
      <TaskSuggestions open={open} onOpenChange={setOpen} suggestions={sugg} />
    </div>
  );
}
