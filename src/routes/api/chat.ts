import { createFileRoute } from "@tanstack/react-router";
import { streamResponse } from "@lovable.dev/ai-gateway";
import { friendlyAiError } from "@/lib/ai-errors.server";

const BASE = `You are AIPA Assistant, the AI inside AIPA (AI Productivity Assistant). Tagline: "Work smarter. Get more done."
Help with general questions, writing emails, summarising meetings, research, and planning tasks. Be clear, warm and concise. Use markdown (headings, bullet lists) when it helps.
You cannot browse the internet, send emails, or access calendars. Never invent sources, citations, URLs or facts; say when you're unsure.
When a user discusses goals, you may suggest breaking them into tasks — the app lets them convert your reply into tasks after review.`;

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: Msg[]; system?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid request", { status: 400 });
        }
        const messages = (body.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-40);
        if (!messages.length) return new Response("No messages", { status: 400 });

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              const events = await streamResponse(
                {
                  model: "openai/gpt-6-astra",
                  instructions: body.system ? `${BASE}\n\n${body.system}` : BASE,
                  input: messages.map((m) => ({ role: m.role, content: m.content })),
                },
                { signal: request.signal },
              );
              for await (const ev of events) {
                if (ev.type === "response.output_text.delta") controller.enqueue(encoder.encode(ev.delta));
              }
            } catch (err) {
              controller.enqueue(encoder.encode(`\u0000ERROR:${friendlyAiError(err)}`));
            } finally {
              controller.close();
            }
          },
        });
        return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
