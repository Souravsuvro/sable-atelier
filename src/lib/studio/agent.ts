import { createServerFn } from "@tanstack/react-start";
import { extractJsonObject, parseCalls } from "@/lib/studio/calls";
import { sanitizeScene } from "@/lib/studio/layout";
import { interpretBrief } from "@/lib/studio/local-architect";
import { architectSystem, buildRenderPrompt } from "@/lib/studio/prompt";
import type { AgentCall, StudioScene } from "@/lib/studio/types";

interface HistoryTurn {
  role: "user" | "architect";
  text: string;
}

export interface ArchitectResponse {
  ok: true;
  rationale: string;
  calls: AgentCall[];
  source: "grok" | "studio";
}

function readHistory(value: unknown): HistoryTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: HistoryTurn[] = [];
  for (const item of value.slice(-6)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if ((row.role !== "user" && row.role !== "architect") || typeof row.text !== "string") continue;
    turns.push({ role: row.role, text: row.text.slice(0, 500) });
  }
  return turns;
}

function readBrief(value: unknown): string {
  if (typeof value !== "string") throw new Error("Write a short brief.");
  const brief = value.trim();
  if (brief.length < 1 || brief.length > 800) throw new Error("Write a short brief.");
  return brief;
}

async function grokPlan(apiKey: string, scene: StudioScene, brief: string, history: HistoryTurn[]): Promise<ArchitectResponse | null> {
  const messages = [
    { role: "system", content: architectSystem(scene) },
    ...history.map((turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.text,
    })),
    { role: "user", content: brief },
  ];
  const body = {
    model: "grok-4.5",
    temperature: 0.4,
    max_tokens: 900,
    messages,
    response_format: { type: "json_object" },
  };
  let res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(22000),
  });
  if (res.status === 400) {
    const { response_format: _drop, ...rest } = body;
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(rest),
      signal: AbortSignal.timeout(22000),
    });
  }
  if (!res.ok) return null;
  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text) return null;
  const parsed = extractJsonObject(text) as { rationale?: unknown; calls?: unknown };
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale.trim().slice(0, 900) : "";
  if (!rationale) return null;
  return { ok: true, rationale, calls: parseCalls(parsed.calls), source: "grok" };
}

export const askArchitect = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    const body = input as { brief?: unknown; scene?: unknown; history?: unknown };
    const scene = sanitizeScene(body.scene);
    if (!scene) throw new Error("Invalid plan");
    return { brief: readBrief(body.brief), scene, history: readHistory(body.history) };
  })
  .handler(async ({ data }): Promise<ArchitectResponse> => {
    const local = interpretBrief(data.brief, data.scene);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: true, rationale: local.rationale, calls: local.calls, source: "studio" };
    try {
      const planned = await grokPlan(apiKey, data.scene, data.brief, data.history);
      if (planned) return planned;
    } catch (err) {
      console.error("[atelier] architect failed", err instanceof Error ? err.message : err);
    }
    return { ok: true, rationale: local.rationale, calls: local.calls, source: "studio" };
  });

export const readRoomPhoto = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    const body = input as { image?: unknown; scene?: unknown };
    if (typeof body.image !== "string" || !body.image.startsWith("data:image/") || body.image.length > 1_800_000) {
      throw new Error("Use a smaller photograph.");
    }
    const scene = sanitizeScene(body.scene);
    if (!scene) throw new Error("Invalid plan");
    return { image: body.image, scene };
  })
  .handler(async ({ data }): Promise<ArchitectResponse> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true,
        source: "studio",
        rationale: "Photo reading needs the architect online. The picture stays as a reference, and you can still compose by hand.",
        calls: [],
      };
    }
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(28000),
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.3,
          max_tokens: 900,
          messages: [
            { role: "system", content: architectSystem(data.scene) },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Read this room photograph. Approximate its palette and furniture with the studio tools. Clear the floor first if the photo is a different kind of room. Return JSON only.",
                },
                { type: "image_url", image_url: { url: data.image } },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        return {
          ok: true,
          source: "studio",
          rationale: "I couldn't read that photograph just now. Try another, or compose from the catalog.",
          calls: [],
        };
      }
      const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = payload.choices?.[0]?.message?.content ?? "";
      const parsed = extractJsonObject(text) as { rationale?: unknown; calls?: unknown };
      const rationale = typeof parsed.rationale === "string" ? parsed.rationale.trim().slice(0, 900) : "";
      if (!rationale) throw new Error("empty");
      return { ok: true, rationale, calls: parseCalls(parsed.calls), source: "grok" };
    } catch (err) {
      console.error("[atelier] photo read failed", err instanceof Error ? err.message : err);
      return {
        ok: true,
        source: "studio",
        rationale: "I couldn't read a layout from that photograph. The reference stays on the board.",
        calls: [],
      };
    }
  });

async function imagine(apiKey: string, prompt: string, quality: boolean): Promise<string> {
  const send = (model: string, withResolution: boolean) =>
    fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(55000),
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        response_format: "url",
        ...(withResolution ? { resolution: "1k" } : {}),
      }),
    });

  const model = quality ? "grok-imagine-image-quality" : "grok-imagine-image";
  let res = await send(model, true);
  if (res.status === 400) res = await send(model, false);
  if (res.status === 429) throw new Error("The renderer is at its limit for the moment. Try again shortly.");
  if (!res.ok) throw new Error("The renderer couldn't finish this still.");
  const payload = (await res.json()) as { data?: { url?: string; b64_json?: string }[] };
  const first = payload.data?.[0];
  if (first?.url) return first.url;
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  throw new Error("The renderer returned an empty still.");
}

export const renderStill = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid request");
    const body = input as { scene?: unknown; quality?: unknown };
    const scene = sanitizeScene(body.scene);
    if (!scene) throw new Error("Invalid plan");
    return { scene, quality: body.quality === true };
  })
  .handler(async ({ data }) => {
    const prompt = buildRenderPrompt(data.scene).slice(0, 1600);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "The renderer is offline in this environment.", prompt };
    }
    try {
      const imageUrl = await imagine(apiKey, prompt, data.quality);
      return { ok: true as const, imageUrl, prompt };
    } catch (err) {
      const message = err instanceof Error ? err.message : "The renderer couldn't finish this still.";
      return { ok: false as const, error: message, prompt };
    }
  });
