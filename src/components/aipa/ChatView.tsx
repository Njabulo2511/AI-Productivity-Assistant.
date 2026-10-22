import { useEffect, useRef, useState } from "react";
import { ArrowUp, ListPlus, MessageSquarePlus, Bookmark, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { activeThreadStore, saveItem, threadsStore, useStore } from "@/lib/store";
import { newThread, sendChat, usePending } from "@/lib/chat";
import { extractTasks } from "@/lib/extract";
import { AipaMark, CopyButton, Markdown, Thinking } from "./bits";
import { TaskSuggestions, type Suggestion } from "./TaskSuggestions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Plan my week around three big priorities",
  "Draft a polite follow-up email to a client",
  "Explain the Eisenhower matrix in simple terms",
  "Help me break down launching a newsletter",
];

export function ChatView({ compact = false, autoFocus = true }: { compact?: boolean; autoFocus?: boolean }) {
  const threads = useStore(threadsStore);
  const activeId = useStore(activeThreadStore);
  const pending = usePending();
  const thread = threads.find((t) => t.id === activeId);
  const busy = !!thread && pending.includes(thread.id);
  const [input, setInput] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);

  const last = thread?.messages.at(-1)?.content;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [last, thread?.messages.length]);
  useEffect(() => {
    if (autoFocus && !busy) taRef.current?.focus();
  }, [busy, activeId, autoFocus]);

  const submit = (text = input) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    void sendChat(t);
  };

  const toTasks = async (id: string, content: string) => {
    setExtracting(id);
    const r = await extractTasks(content);
    setExtracting(null);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    setSugg(r.tasks!);
    setSuggOpen(true);
  };

  const messages = thread?.messages ?? [];
  const showThinking = busy && messages.at(-1)?.role === "user";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <AipaMark className="size-7" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">AIPA Assistant</p>
            <p className="truncate text-xs text-muted-foreground">{thread?.title ?? "New conversation"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Conversation history">
                <History className="size-4" />
                {!compact && "History"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Conversations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {threads.filter((t) => t.messages.length).length === 0 && (
                <p className="px-2 py-3 text-sm text-muted-foreground">No conversations yet.</p>
              )}
              {threads
                .filter((t) => t.messages.length)
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((t) => (
                  <div key={t.id} className="flex items-center">
                    <DropdownMenuItem
                      className={cn("flex-1 truncate", t.id === activeId && "font-semibold")}
                      onSelect={() => activeThreadStore.set(t.id)}
                    >
                      <span className="truncate">{t.title}</span>
                    </DropdownMenuItem>
                    <button
                      aria-label="Delete conversation"
                      className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        threadsStore.set((p) => p.filter((x) => x.id !== t.id));
                        if (t.id === activeId) activeThreadStore.set(null);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={() => newThread()} aria-label="New chat">
            <MessageSquarePlus className="size-4" />
            {!compact && "New chat"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="fade-up mx-auto flex h-full max-w-xl flex-col justify-center gap-4">
            <p className={cn("font-display text-foreground", compact ? "text-2xl" : "text-3xl")}>
              What can I help you get done?
            </p>
            <div className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-xl border bg-card p-3 text-left text-sm transition hover:border-primary/50 hover:shadow-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-ink-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="fade-up flex gap-3">
                  <AipaMark className="size-7" />
                  <div className="min-w-0 flex-1">
                    {m.error ? (
                      <p className="text-sm text-destructive">{m.content}</p>
                    ) : (
                      <Markdown>{m.content}</Markdown>
                    )}
                    {!m.error && !(busy && m.id === messages.at(-1)?.id) && (
                      <div className="mt-1 -ml-2 flex flex-wrap gap-0.5">
                        <CopyButton text={m.content} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            saveItem({ type: "chat", title: thread!.title, content: m.content });
                            toast.success("Saved to My Workspace");
                          }}
                        >
                          <Bookmark className="size-4" /> Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={extracting === m.id}
                          onClick={() => toTasks(m.id, m.content)}
                        >
                          <ListPlus className="size-4" /> {extracting === m.id ? "Finding tasks…" : "To tasks"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}
            {showThinking && (
              <div className="flex gap-3">
                <AipaMark className="size-7" />
                <Thinking />
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <form
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-soft focus-within:border-primary/60"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Ask AIPA anything…"
            className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || busy} aria-label="Send message">
            <ArrowUp className="size-4" />
          </Button>
        </form>
      </div>
      <TaskSuggestions open={suggOpen} onOpenChange={setSuggOpen} suggestions={sugg} />
    </div>
  );
}
