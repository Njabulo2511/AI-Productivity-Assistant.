import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, CalendarClock, AlertTriangle, ListChecks } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { addTasks, isDueToday, isOverdue, tasksStore, todayStr, updateTask, useStore, type Task } from "@/lib/store";
import { cn } from "@/lib/utils";

function Row({ t, tone }: { t: Task; tone?: "overdue" }) {
  return (
    <label className="flex items-start gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-muted">
      <Checkbox className="mt-0.5" checked={t.done} onCheckedChange={(v) => updateTask(t.id, { done: !!v })} />
      <span className={cn("flex-1", t.done && "text-muted-foreground line-through")}>{t.title}</span>
      {t.due && (
        <span className={cn("text-xs", tone === "overdue" ? "text-destructive" : "text-muted-foreground")}>
          {new Date(t.due + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
    </label>
  );
}

function Section({ icon: Icon, title, children, count }: { icon: typeof Plus; title: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="space-y-1">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" /> {title}
        {!!count && <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px]">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

export function QuickOverview() {
  const tasks = useStore(tasksStore);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayStr());
  const today = todayStr();
  const todays = tasks.filter((t) => isDueToday(t, today));
  const overdue = tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.due!.localeCompare(b.due!));
  const upcoming = tasks
    .filter((t) => !t.done && t.due && t.due > today)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 5);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="font-display text-2xl">Quick overview</p>
        <p className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <form
        className="flex flex-col gap-2 rounded-xl border bg-card p-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          addTasks([{ title: title.trim(), priority: "medium", due: due || undefined }]);
          setTitle("");
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quick add a task…" className="h-8" />
        <div className="flex gap-2">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-8 flex-1" />
          <Button size="sm" type="submit" disabled={!title.trim()}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </form>

      <Section icon={ListChecks} title="Progress">
        <div className="flex items-baseline justify-between text-sm">
          <span>
            {done} of {tasks.length} done
          </span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </Section>

      <Section icon={ListChecks} title="Today" count={todays.length}>
        {todays.length ? todays.map((t) => <Row key={t.id} t={t} />) : <Empty>Nothing due today. Enjoy the space.</Empty>}
      </Section>

      <Section icon={AlertTriangle} title="Overdue" count={overdue.length}>
        {overdue.length ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-1">
            {overdue.map((t) => <Row key={t.id} t={t} tone="overdue" />)}
          </div>
        ) : (
          <Empty>You're all caught up.</Empty>
        )}
      </Section>

      <Section icon={CalendarClock} title="Upcoming" count={upcoming.length}>
        {upcoming.length ? upcoming.map((t) => <Row key={t.id} t={t} />) : <Empty>No upcoming deadlines.</Empty>}
      </Section>

      <Link to="/tasks" className="block text-sm font-medium text-primary hover:underline">
        Open Task Planner →
      </Link>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="px-1 py-1.5 text-sm text-muted-foreground">{children}</p>
);
