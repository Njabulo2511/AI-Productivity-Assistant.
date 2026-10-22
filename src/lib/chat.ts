import { useSyncExternalStore } from "react";
import { activeThreadStore, threadsStore, uid, type ChatMsg, type Thread } from "./store";

/* in-memory set of threads currently waiting on the AI */
let pending: string[] = [];
const pSubs = new Set<() => void>();
const setPending = (next: string[]) => {
  pending = next;
  pSubs.forEach((s) => s());
};
export const usePending = () =>
  useSyncExternalStore(
    (cb) => {
      pSubs.add(cb);
      return () => pSubs.delete(cb);
    },
    () => pending,
    () => pending,
  );

export function newThread(): string {
  const t: Thread = { id: uid(), title: "New conversation", updatedAt: Date.now(), messages: [] };
  threadsStore.set((prev) => [t, ...prev.filter((x) => x.messages.length > 0)]);
  activeThreadStore.set(t.id);
  return t.id;
}

const patchThread = (id: string, fn: (t: Thread) => Thread) =>
  threadsStore.set((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));

/** Streams text from the server AI route. Calls onDelta with accumulated text. */
export async function streamAI(
  messages: { role: "user" | "assistant"; content: string }[],
  onDelta: (full: string) => void,
  system?: string,
): Promise<{ text: string; error?: string }> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages, system }),
    });
  } catch {
    return { text: "", error: "Couldn't reach the server. Check your connection and try again." };
  }
  if (!res.ok || !res.body) return { text: "", error: `The AI request failed (${res.status}).` };
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    const errIdx = full.indexOf("\u0000ERROR:");
    if (errIdx >= 0) return { text: full.slice(0, errIdx), error: full.slice(errIdx + 7) };
    onDelta(full);
  }
  return { text: full };
}

export async function sendChat(text: string) {
  let id = activeThreadStore.get();
  if (!id || !threadsStore.get().some((t) => t.id === id)) id = newThread();
  const threadId = id;
  const userMsg: ChatMsg = { id: uid(), role: "user", content: text };
  patchThread(threadId, (t) => ({
    ...t,
    title: t.messages.length ? t.title : text.slice(0, 48),
    updatedAt: Date.now(),
    messages: [...t.messages.filter((m) => !m.error), userMsg],
  }));
  setPending([...pending, threadId]);
  const history = threadsStore.get().find((t) => t.id === threadId)!.messages;
  const aId = uid();
  let started = false;
  const write = (content: string, error?: boolean) =>
    patchThread(threadId, (t) => ({
      ...t,
      updatedAt: Date.now(),
      messages: started
        ? t.messages.map((m) => (m.id === aId ? { ...m, content, error } : m))
        : [...t.messages, { id: aId, role: "assistant", content, error }],
    }));
  const result = await streamAI(
    history.map((m) => ({ role: m.role, content: m.content })),
    (full) => {
      write(full);
      started = true;
    },
  );
  if (result.error) {
    write(result.error, true);
    started = true;
  } else if (!result.text) write("The AI returned an empty response. Please try again.", true);
  setPending(pending.filter((p) => p !== threadId));
}
