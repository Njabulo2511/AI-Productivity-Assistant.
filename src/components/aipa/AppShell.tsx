import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Sparkle, X, LayoutDashboard, Mail, NotebookPen, ListTodo, BookOpenText, FolderHeart, PanelRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChatView } from "./ChatView";
import { AipaMark } from "./bits";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Email Generator", icon: Mail },
  { to: "/meetings", label: "Meeting Summarizer", icon: NotebookPen },
  { to: "/tasks", label: "Task Planner", icon: ListTodo },
  { to: "/research", label: "Research Assistant", icon: BookOpenText },
  { to: "/workspace", label: "My Workspace", icon: FolderHeart },
] as const;

const Ctx = createContext<{ openAssistant: () => void; openOverview: () => void; setOverviewNode: (n: ReactNode) => void }>({
  openAssistant: () => {},
  openOverview: () => {},
  setOverviewNode: () => {},
});
export const useShell = () => useContext(Ctx);

export function AppShell({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [overview, setOverview] = useState(false);
  const [overviewNode, setOverviewNode] = useState<ReactNode>(null);

  return (
    <Ctx.Provider value={{ openAssistant: () => setAssistant(true), openOverview: () => setOverview(true), setOverviewNode }}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon" onClick={() => setNav(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <AipaMark className="size-8" />
            <span className="font-display text-2xl leading-none">AIPA</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">Work smarter. Get more done.</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="xl:hidden" onClick={() => setOverview(true)}>
              <PanelRight className="size-4" /> Overview
            </Button>
            <Button size="sm" onClick={() => setAssistant((a) => !a)} aria-pressed={assistant}>
              <Sparkle className="size-4" /> Assistant
            </Button>
          </div>
        </header>

        <Sheet open={nav} onOpenChange={setNav}>
          <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Move between AIPA tools</SheetDescription>
            <div className="flex items-center gap-2 px-5 pb-4 pt-6">
              <AipaMark className="size-9" />
              <div>
                <p className="font-display text-2xl leading-none">AIPA</p>
                <p className="text-xs opacity-70">AI Productivity Assistant</p>
              </div>
            </div>
            <nav className="space-y-1 px-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setNav(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm opacity-85 transition hover:bg-sidebar-accent hover:opacity-100"
                  activeProps={{ className: "bg-sidebar-accent opacity-100 text-sidebar-primary font-medium" }}
                  activeOptions={{ exact: true }}
                >
                  <n.icon className="size-4" /> {n.label}
                </Link>
              ))}
            </nav>
            <p className="absolute bottom-5 left-5 right-5 text-xs opacity-60">
              Saved in this browser only. Clearing browser data removes your tasks and saved items.
            </p>
          </SheetContent>
        </Sheet>

        <Sheet open={overview} onOpenChange={setOverview}>
          <SheetContent side="right" className="w-80 overflow-y-auto p-0">
            <SheetTitle className="sr-only">Quick overview</SheetTitle>
            <SheetDescription className="sr-only">Today's tasks and deadlines</SheetDescription>
            {overviewNode}
          </SheetContent>
        </Sheet>

        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1">{children}</main>
          {/* Assistant panel: always mounted so chat and page inputs persist */}
          <aside
            aria-hidden={!assistant}
            className={cn(
              "fixed bottom-0 right-0 top-14 z-40 w-full border-l bg-background shadow-soft transition-transform duration-300 sm:w-[420px]",
              assistant ? "translate-x-0" : "pointer-events-none translate-x-full",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 z-10 sm:hidden"
              onClick={() => setAssistant(false)}
              aria-label="Close assistant"
            >
              <X className="size-4" />
            </Button>
            <div className="flex h-full flex-col">
              <div className="hidden items-center justify-end px-2 pt-1 sm:flex">
                <Button variant="ghost" size="sm" onClick={() => setAssistant(false)}>
                  <X className="size-4" /> Close
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <ChatView compact autoFocus={assistant} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Ctx.Provider>
  );
}
