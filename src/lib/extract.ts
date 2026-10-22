import { aiGenerate } from "./ai.functions";
import { parseJson } from "@/components/aipa/bits";
import { todayStr } from "./store";
import type { Suggestion } from "@/components/aipa/TaskSuggestions";

export async function extractTasks(source: string, mode: "extract" | "breakdown" = "extract") {
  const r = await aiGenerate({
    data: {
      json: true,
      system:
        mode === "breakdown"
          ? "You break goals into small, concrete, actionable tasks (3-10)."
          : "You extract only the actionable tasks explicitly present or clearly implied in the text. Do not invent tasks.",
      prompt: `Today is ${todayStr()}. Return {"tasks":[{"title":string,"priority":"low"|"medium"|"high","due":"YYYY-MM-DD" or null}]}. Only set "due" if a date is stated or clearly derivable.\n\nText:\n${source}`,
    },
  });
  if (r.error) return { error: r.error };
  const parsed = parseJson<{ tasks?: Suggestion[] }>(r.text!);
  if (!parsed?.tasks) return { error: "Couldn't read the AI's task list. Please try again." };
  return {
    tasks: parsed.tasks
      .filter((t) => t && typeof t.title === "string")
      .map((t) => ({ title: t.title, priority: t.priority, due: t.due ?? undefined })),
  };
}
