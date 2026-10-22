import { useSyncExternalStore } from "react";

export function createStore<T>(key: string, initial: T) {
  let state = initial;
  let loaded = false;
  const subs = new Set<() => void>();
  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) state = JSON.parse(raw);
    } catch {
      /* ignore corrupt storage */
    }
  };
  return {
    get: () => {
      load();
      return state;
    },
    getServer: () => initial,
    set: (next: T | ((prev: T) => T)) => {
      load();
      state = typeof next === "function" ? (next as (p: T) => T)(state) : next;
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* storage full */
      }
      subs.forEach((s) => s());
    },
    subscribe: (cb: () => void) => {
      subs.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          loaded = false;
          load();
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        subs.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export function useStore<T>(store: ReturnType<typeof createStore<T>>) {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- Tasks ---------- */
export type Priority = "low" | "medium" | "high";
export type Task = {
  id: string;
  title: string;
  priority: Priority;
  due?: string; // YYYY-MM-DD
  done: boolean;
  createdAt: number;
};
export const tasksStore = createStore<Task[]>("aipa.tasks", []);

export function todayStr(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const isOverdue = (t: Task, today = todayStr()) => !t.done && !!t.due && t.due < today;
export const isDueToday = (t: Task, today = todayStr()) => !!t.due && t.due === today;

export function addTasks(items: Omit<Task, "id" | "createdAt" | "done">[]) {
  tasksStore.set((prev) => [
    ...items.map((i) => ({ ...i, id: uid(), done: false, createdAt: Date.now() })),
    ...prev,
  ]);
}
export const updateTask = (id: string, patch: Partial<Task>) =>
  tasksStore.set((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
export const deleteTask = (id: string) => tasksStore.set((prev) => prev.filter((t) => t.id !== id));

/* ---------- Saved workspace items ---------- */
export type SavedType = "email" | "meeting" | "research" | "chat" | "plan";
export type SavedItem = { id: string; type: SavedType; title: string; content: string; createdAt: number };
export const savedStore = createStore<SavedItem[]>("aipa.saved", []);
export function saveItem(item: Omit<SavedItem, "id" | "createdAt">) {
  savedStore.set((prev) => [{ ...item, id: uid(), createdAt: Date.now() }, ...prev]);
}

/* ---------- Chat threads ---------- */
export type ChatMsg = { id: string; role: "user" | "assistant"; content: string; error?: boolean };
export type Thread = { id: string; title: string; updatedAt: number; messages: ChatMsg[] };
export const threadsStore = createStore<Thread[]>("aipa.threads", []);
export const activeThreadStore = createStore<string | null>("aipa.activeThread", null);
