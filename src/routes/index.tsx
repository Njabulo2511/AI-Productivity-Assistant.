import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, NotebookPen, ListTodo, BookOpenText } from "lucide-react";
import { ChatView } from "@/components/aipa/ChatView";
import { QuickOverview } from "@/components/aipa/QuickOverview";
import { Disclaimer } from "@/components/aipa/bits";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/")({
  head: () =>
    meta(
      "AIPA — Your AI productivity workspace",
      "Chat with AIPA Assistant, plan tasks, write emails, summarise meetings and research — all in one AI workspace.",
    ),
  component: Index,
});

const TOOLS = [
  { to: "/email", label: "Write an email", icon: Mail },
  { to: "/meetings", label: "Summarise a meeting", icon: NotebookPen },
  { to: "/tasks", label: "Plan tasks", icon: ListTodo },
  { to: "/research", label: "Research a topic", icon: BookOpenText },
] as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Index() {
  return (
    <div className="flex">
      <div className="bg-hero flex min-w-0 flex-1 flex-col px-3 pb-4 pt-6 md:px-8">
        <div className="fade-up mx-auto w-full max-w-4xl">
          <h1 className="font-display text-4xl leading-tight md:text-6xl" suppressHydrationWarning>
            {greeting()}. <em className="text-primary">Let's get things done.</em>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Ask anything, draft content, or turn goals into a plan. AIPA keeps your work in one place.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1.5 text-sm transition hover:border-primary/50"
              >
                <t.icon className="size-4 text-primary" /> {t.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-5 flex h-[calc(100vh-17rem)] min-h-[440px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-soft">
          <ChatView />
        </div>
        <div className="mx-auto mt-3 w-full max-w-4xl">
          <Disclaimer />
        </div>
      </div>
      <aside className="hidden w-80 shrink-0 border-l bg-card/60 xl:block">
        <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <QuickOverview />
        </div>
      </aside>
    </div>
  );
}
