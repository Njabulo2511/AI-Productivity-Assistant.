import { createServerFn } from "@tanstack/react-start";

type Input = { system: string; prompt: string; json?: boolean };

/** One-shot AI generation. Returns text (JSON string when json=true) or an error message. */
export const aiGenerate = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (!d || typeof d.prompt !== "string" || !d.prompt.trim()) throw new Error("Prompt required");
    return { system: String(d.system ?? ""), prompt: d.prompt.slice(0, 40000), json: !!d.json };
  })
  .handler(async ({ data }): Promise<{ text?: string; error?: string }> => {
    const { generateResponse } = await import("@lovable.dev/ai-gateway");
    const { friendlyAiError } = await import("./ai-errors.server");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          data.system +
          "\nNever invent facts, sources, names, dates or details that are not provided. You cannot browse the web.",
        input: [{ role: "user", content: data.json ? `${data.prompt}\n\nReturn JSON.` : data.prompt }],
        ...(data.json ? { text: { format: { type: "json_object" as const } } } : {}),
      });
      const out = (res as unknown as { output?: { type: string; content?: { type: string; text?: string }[] }[] })
        .output;
      const text = (out ?? [])
        .filter((o) => o.type === "message")
        .flatMap((o) => o.content ?? [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text ?? "")
        .join("");
      if (!text) return { error: "The AI returned an empty response. Please try again." };
      return { text };
    } catch (err) {
      return { error: friendlyAiError(err) };
    }
  });
