import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { addTasks, type Priority } from "@/lib/store";
import { toast } from "sonner";

export type Suggestion = { title: string; priority?: Priority; due?: string };

export function TaskSuggestions({
  open,
  onOpenChange,
  suggestions,
  title = "Review suggested tasks",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  suggestions: Suggestion[];
  title?: string;
}) {
  const [rows, setRows] = useState<(Suggestion & { keep: boolean })[]>([]);
  useEffect(() => {
    if (open) setRows(suggestions.map((s) => ({ ...s, priority: s.priority ?? "medium", keep: true })));
  }, [open, suggestions]);

  const add = () => {
    const chosen = rows.filter((r) => r.keep && r.title.trim());
    addTasks(
      chosen.map((r) => ({
        title: r.title.trim(),
        priority: (["low", "medium", "high"].includes(r.priority!) ? r.priority : "medium") as Priority,
        due: /^\d{4}-\d{2}-\d{2}$/.test(r.due ?? "") ? r.due : undefined,
      })),
    );
    toast.success(`Added ${chosen.length} task${chosen.length === 1 ? "" : "s"}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Edit, untick or set dates before adding them to your Task Planner.</DialogDescription>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks were found.</p>
        ) : (
          <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-card p-2">
                <Checkbox
                  checked={r.keep}
                  onCheckedChange={(v) => setRows((p) => p.map((x, j) => (j === i ? { ...x, keep: !!v } : x)))}
                />
                <Input
                  value={r.title}
                  onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                />
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={r.priority}
                  onChange={(e) =>
                    setRows((p) => p.map((x, j) => (j === i ? { ...x, priority: e.target.value as Priority } : x)))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <Input
                  type="date"
                  className="w-40"
                  value={r.due ?? ""}
                  onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, due: e.target.value } : x)))}
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={add} disabled={!rows.some((r) => r.keep)}>
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
