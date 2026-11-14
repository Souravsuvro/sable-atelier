import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Armchair,
  BedDouble,
  BookOpen,
  Camera,
  Flower2,
  LampFloor,
  Layers,
  MessageSquare,
  RectangleHorizontal,
  Sofa,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { askArchitect, readRoomPhoto, renderStill } from "@/lib/studio/agent";
import {
  CATALOG,
  FLOOR_LABEL,
  FLOOR_SWATCH,
  LIGHT_BLURB,
  LIGHT_LABEL,
  PAINTS,
  WALL_LABEL,
  WALL_SWATCH,
} from "@/lib/studio/catalog";
import { coverageRatio } from "@/lib/studio/layout";
import { interpretBrief } from "@/lib/studio/local-architect";
import { buildRenderPrompt } from "@/lib/studio/prompt";
import { useStudio } from "@/lib/studio/store";
import {
  FLOORS,
  LIGHTS,
  WALLS,
  WALL_FINISHES,
  makeId,
  type ItemType,
  type StudioScene,
  type WallFinish,
  type WallId,
} from "@/lib/studio/types";
import { cn } from "@/lib/cn";

const ICONS: Record<ItemType, LucideIcon> = {
  sofa: Sofa,
  armchair: Armchair,
  "coffee-table": Table2,
  "dining-table": Table2,
  "dining-chair": Armchair,
  "floor-lamp": LampFloor,
  plant: Flower2,
  bookshelf: BookOpen,
  sideboard: Archive,
  bed: BedDouble,
  rug: RectangleHorizontal,
  ottoman: RectangleHorizontal,
};

const CHIPS = ["Set this up as an office", "A quiet workspace", "A calm house", "Add a navy chair", "Marble floor", "Tidy what is already here"];

function sceneNow(): StudioScene {
  const s = useStudio.getState();
  return { room: s.room, floor: s.floor, walls: { ...s.walls }, lighting: s.lighting, nodes: s.nodes.map((n) => ({ ...n })) };
}

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 768;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL("image/jpeg", 0.72);
  if (url.length > 1_700_000) throw new Error("That photograph is still too large.");
  return url;
}

export function Inspector() {
  const node = useStudio((s) => (s.selectedId ? (s.nodes.find((n) => n.id === s.selectedId) ?? null) : null));
  const beginGesture = useStudio((s) => s.beginGesture);
  const endGesture = useStudio((s) => s.endGesture);
  const updateNode = useStudio((s) => s.updateNode);
  const applyCalls = useStudio((s) => s.applyCalls);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const hide = () => setHint(false);
    const timer = window.setTimeout(hide, 6500);
    window.addEventListener("pointerdown", hide, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", hide);
    };
  }, []);

  if (!node && !hint) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-line bg-ink/85 px-3 py-2 text-cream backdrop-blur-md">
        {node ? (
          <>
            <p className="px-1 text-sm">{CATALOG[node.type].label}</p>
            <p className="px-1 text-xs tabular-nums text-muted">
              {node.x.toFixed(2)} m · {node.z.toFixed(2)} m
            </p>
            <Button tone="ghost" className="min-h-11 px-3" onClick={() => updateNode(node.id, { rotationY: node.rotationY - Math.PI / 12 })}>
              Turn left
            </Button>
            <Button tone="ghost" className="min-h-11 px-3" onClick={() => updateNode(node.id, { rotationY: node.rotationY + Math.PI / 12 })}>
              Turn right
            </Button>
            <label className="flex min-h-11 items-center gap-2 text-xs text-muted">
              Scale
              <input
                className="w-28 accent-brass"
                type="range"
                min={0.75}
                max={1.35}
                step={0.01}
                value={node.scale}
                aria-label="Scale piece"
                onPointerDown={() => beginGesture()}
                onPointerUp={() => endGesture()}
                onChange={(e) => updateNode(node.id, { scale: Number(e.target.value) })}
              />
            </label>
            <div className="flex items-center gap-1">
              {PAINTS.map((paint) => (
                <button
                  key={paint}
                  type="button"
                  aria-label={`Paint ${paint}`}
                  className={cn("size-8 rounded-full border", node.color === paint ? "border-brass" : "border-line")}
                  style={{ background: paint }}
                  onClick={() => updateNode(node.id, { color: paint })}
                />
              ))}
              <label className="relative size-8 overflow-hidden rounded-full border border-line">
                <span className="sr-only">Custom color</span>
                <input
                  type="color"
                  className="absolute inset-0 size-16 cursor-pointer opacity-0"
                  value={/^#[0-9a-fA-F]{6}$/.test(node.color) ? node.color : "#d9d0c3"}
                  onChange={(e) => updateNode(node.id, { color: e.target.value })}
                />
                <span className="block size-full" style={{ background: node.color }} />
              </label>
            </div>
            <Button
              tone="ghost"
              onClick={() =>
                applyCalls([
                  {
                    tool: "placeFurnitureItem",
                    itemType: node.type,
                    x: node.x + 0.45,
                    y: 0,
                    z: node.z + 0.45,
                    color: node.color,
                    rotationY: node.rotationY,
                    scale: node.scale,
                  },
                ])
              }
            >
              Duplicate
            </Button>
            <Button tone="line" onClick={() => applyCalls([{ tool: "removeFurniture", id: node.id }])}>
              Remove
            </Button>
          </>
        ) : (
          <p className="px-1 text-sm text-cream">Drag a piece to move it, or drop one from the catalog.</p>
        )}
      </div>
    </div>
  );
}

function Catalog() {
  const placeItem = useStudio((s) => s.placeItem);
  const applyCalls = useStudio((s) => s.applyCalls);
  const nodes = useStudio((s) => s.nodes);
  const room = useStudio((s) => s.room);
  const lastLog = useStudio((s) => s.lastLog);
  const pct = Math.round(coverageRatio(nodes, room) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Pieces</h2>
          <p className="text-sm text-muted">Click or drag onto the floor. {pct}% of the floor is covered.</p>
        </div>
        <Button tone="line" onClick={() => applyCalls([{ tool: "optimizeLayoutForSpace" }])}>
          Rebalance
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(CATALOG) as ItemType[]).map((type) => {
          const spec = CATALOG[type];
          const Icon = ICONS[type];
          return (
            <button
              key={type}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", `sable:${type}`);
                event.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => placeItem(type)}
              className="flex min-h-16 cursor-grab items-center gap-3 rounded-xl border border-line bg-ink px-3 py-2 text-left hover:border-brass active:cursor-grabbing"
            >
              <Icon className="size-5 shrink-0 text-brass" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm">{spec.label}</span>
                <span className="block text-xs text-muted">
                  {spec.width.toFixed(2)} × {spec.depth.toFixed(2)} m
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {lastLog ? <p className="text-sm text-brass">{lastLog}</p> : null}
    </div>
  );
}

function Finish() {
  const floor = useStudio((s) => s.floor);
  const walls = useStudio((s) => s.walls);
  const lighting = useStudio((s) => s.lighting);
  const room = useStudio((s) => s.room);
  const applyCalls = useStudio((s) => s.applyCalls);
  const beginGesture = useStudio((s) => s.beginGesture);
  const endGesture = useStudio((s) => s.endGesture);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-xl">Floor</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {FLOORS.map((id) => (
            <Swatch key={id} label={FLOOR_LABEL[id]} background={FLOOR_SWATCH[id]} active={floor === id} onClick={() => applyCalls([{ tool: "modifyFloorMaterial", textureType: id }])} />
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl">Walls</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {WALLS.map((id) => (
            <WallRow key={id} id={id} finish={walls[id]} onChange={(textureType) => applyCalls([{ tool: "modifyWallMaterial", textureType, targetWallId: id }])} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {WALL_FINISHES.map((finish) => (
            <Swatch
              key={finish}
              label={`${WALL_LABEL[finish]} · all`}
              background={WALL_SWATCH[finish]}
              active={WALLS.every((id) => walls[id] === finish)}
              onClick={() => applyCalls([{ tool: "modifyWallMaterial", textureType: finish, targetWallId: "all" }])}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl">Light</h2>
        <div className="mt-3 space-y-2">
          {LIGHTS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyCalls([{ tool: "setLighting", preset: id }])}
              className={cn("w-full rounded-xl border px-3 py-3 text-left", lighting === id ? "border-brass bg-ink" : "border-line")}
            >
              <span className="block text-sm">{LIGHT_LABEL[id]}</span>
              <span className="block text-xs text-muted">{LIGHT_BLURB[id]}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2 className="font-display text-xl">Room</h2>
        <label className="mt-3 block text-sm">
          <span className="flex justify-between">
            Width <span className="tabular-nums text-muted">{room.width.toFixed(1)} m</span>
          </span>
          <input
            className="mt-2 h-11 w-full accent-brass"
            type="range"
            min={4}
            max={8}
            step={0.1}
            value={room.width}
            aria-label="Room width"
            onPointerDown={() => beginGesture()}
            onPointerUp={() => endGesture()}
            onChange={(e) => applyCalls([{ tool: "setRoomSize", width: Number(e.target.value), depth: useStudio.getState().room.depth }])}
          />
        </label>
        <label className="mt-2 block text-sm">
          <span className="flex justify-between">
            Depth <span className="tabular-nums text-muted">{room.depth.toFixed(1)} m</span>
          </span>
          <input
            className="mt-2 h-11 w-full accent-brass"
            type="range"
            min={3.6}
            max={7}
            step={0.1}
            value={room.depth}
            aria-label="Room depth"
            onPointerDown={() => beginGesture()}
            onPointerUp={() => endGesture()}
            onChange={(e) => applyCalls([{ tool: "setRoomSize", width: useStudio.getState().room.width, depth: Number(e.target.value) }])}
          />
        </label>
      </section>
    </div>
  );
}

function Swatch({ label, background, active, onClick }: { label: string; background: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left">
      <span className={cn("block h-12 rounded-lg border", active ? "border-brass" : "border-line")} style={{ background }} />
      <span className="mt-1 block text-xs text-muted">{label}</span>
    </button>
  );
}

function WallRow({ id, finish, onChange }: { id: WallId; finish: WallFinish; onChange: (finish: WallFinish) => void }) {
  return (
    <label className="block text-sm capitalize">
      {id}
      <select
        className="mt-1 h-11 w-full rounded-lg border border-line bg-ink px-2 text-cream"
        value={finish}
        onChange={(e) => onChange(e.target.value as WallFinish)}
      >
        {WALL_FINISHES.map((option) => (
          <option key={option} value={option}>
            {WALL_LABEL[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Architect() {
  const messages = useStudio((s) => s.messages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending]);

  async function send(text: string) {
    const brief = text.trim();
    if (!brief || pending) return;
    setPending(true);
    setDraft("");
    const userId = makeId();
    const pendingId = makeId();
    useStudio.getState().appendMessage({ id: userId, role: "user", text: brief });
    useStudio.getState().appendMessage({ id: pendingId, role: "architect", source: "studio", text: "Studying the plan…" });
    const history = useStudio
      .getState()
      .messages.filter((m) => m.id !== pendingId && m.id !== userId)
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));
    try {
      const result = await askArchitect({ data: { brief, scene: sceneNow(), history } });
      const logs = useStudio.getState().applyCalls(result.calls);
      useStudio.getState().replaceMessage(pendingId, {
        text: result.rationale,
        source: result.source,
        detail: logs.join(" · ") || undefined,
      });
    } catch {
      const local = interpretBrief(brief, sceneNow());
      const logs = useStudio.getState().applyCalls(local.calls);
      useStudio.getState().replaceMessage(pendingId, {
        text: local.rationale,
        source: "studio",
        detail: logs.join(" · ") || undefined,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "ml-8 rounded-2xl bg-ink px-3 py-2" : "mr-2"}>
            {message.role === "architect" ? (
              <p className="text-xs uppercase tracking-widest text-brass">{message.source === "grok" ? "Architect" : "House rules"}</p>
            ) : null}
            <p className="text-sm leading-relaxed">{message.text}</p>
            {message.detail ? <p className="mt-1 text-xs text-brass">{message.detail}</p> : null}
          </article>
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button key={chip} type="button" className="min-h-11 rounded-full border border-line px-3 text-xs text-cream hover:border-brass" onClick={() => void send(chip)} disabled={pending}>
            {chip}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <label className="sr-only" htmlFor="brief">
          Design brief
        </label>
        <textarea
          id="brief"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          placeholder="A north-lit room with a low sofa and one olive tree"
          className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-ink px-3 py-2 text-base text-cream outline-none focus:border-brass"
        />
        <Button tone="brass" type="submit" disabled={pending || draft.trim().length === 0}>
          Send
        </Button>
      </form>
    </div>
  );
}

function Stills({ busy, setBusy, openArchitect }: { busy: boolean; setBusy: (v: boolean) => void; openArchitect: () => void }) {
  const jobs = useStudio((s) => s.jobs);
  const referenceUrl = useStudio((s) => s.referenceUrl);
  const referenceName = useStudio((s) => s.referenceName);
  const setReference = useStudio((s) => s.setReference);
  const clearReference = useStudio((s) => s.clearReference);
  const [quality, setQuality] = useState(false);
  const [note, setNote] = useState("");
  const [over, setOver] = useState(false);

  async function takeFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNote("Use a photograph.");
      return;
    }
    if (file.size > 8_000_000) {
      setNote("Choose a photo under 8 MB.");
      return;
    }
    try {
      const url = await compressImage(file);
      setReference(url, file.name);
      setNote("");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not read that image.");
    }
  }

  async function compose(fine: boolean) {
    if (busy) return;
    setBusy(true);
    const id = makeId();
    const scene = sceneNow();
    useStudio.getState().addJob({
      id,
      status: "IN_QUEUE",
      progress: 12,
      prompt: buildRenderPrompt(scene),
      createdAt: Date.now(),
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const { captureStill } = await import("@/components/studio/webxr");
    const study = captureStill();
    useStudio.getState().patchJob(id, {
      status: "IN_PROGRESS",
      progress: 48,
      imageUrl: study ?? undefined,
      kind: study ? "study" : undefined,
    });
    try {
      const result = await renderStill({ data: { scene, quality: fine } });
      if (result.ok) {
        useStudio.getState().patchJob(id, { status: "COMPLETED", progress: 100, imageUrl: result.imageUrl, kind: "render", prompt: result.prompt, error: undefined });
      } else if (study) {
        useStudio.getState().patchJob(id, {
          status: "COMPLETED",
          progress: 100,
          imageUrl: study,
          kind: "study",
          prompt: result.prompt,
          error: result.error,
        });
      } else {
        useStudio.getState().patchJob(id, { status: "FAILED", progress: 100, error: result.error, prompt: result.prompt });
      }
    } catch {
      if (study) {
        useStudio.getState().patchJob(id, {
          status: "COMPLETED",
          progress: 100,
          imageUrl: study,
          kind: "study",
          error: "The renderer couldn't finish a still. This is the model study.",
        });
      } else {
        useStudio.getState().patchJob(id, { status: "FAILED", progress: 100, error: "The renderer couldn't finish this still." });
      }
    } finally {
      setBusy(false);
    }
  }

  async function interpret() {
    if (!referenceUrl || busy) return;
    setBusy(true);
    const id = makeId();
    useStudio.getState().appendMessage({ id, role: "architect", source: "studio", text: "Reading the photograph…" });
    openArchitect();
    try {
      const result = await readRoomPhoto({ data: { image: referenceUrl, scene: sceneNow() } });
      const logs = useStudio.getState().applyCalls(result.calls);
      useStudio.getState().replaceMessage(id, {
        text: result.rationale,
        source: result.source,
        detail: logs.join(" · ") || undefined,
      });
    } catch (err) {
      useStudio.getState().replaceMessage(id, {
        text: err instanceof Error ? err.message : "The photograph couldn't be read.",
        source: "studio",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl">Stills</h2>
        <p className="mt-1 text-sm text-muted">A model study is taken from the view you are looking at. A rendered still replaces it when the renderer answers.</p>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-brass" checked={quality} onChange={(e) => setQuality(e.target.checked)} />
        Finer still
        <span className="text-xs text-muted">Slower, more detail.</span>
      </label>
      <Button tone="brass" disabled={busy} onClick={() => void compose(quality)}>
        {busy ? "Working" : "Compose a still"}
      </Button>
      <ul className="space-y-4">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-muted">
              <span>{job.status.replaceAll("_", " ")}</span>
              <span className="tabular-nums">{job.progress}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink">
              {job.status === "IN_QUEUE" || job.status === "IN_PROGRESS" ? (
                <div className="sable-meter h-full w-1/3 bg-brass" />
              ) : (
                <div className={cn("h-full", job.status === "FAILED" ? "bg-line" : "bg-brass")} style={{ width: "100%" }} />
              )}
            </div>
            {job.error ? <p className={cn("mt-2 text-sm", job.imageUrl ? "text-muted" : "text-cream")}>{job.error}</p> : null}
            {job.imageUrl ? <img src={job.imageUrl} alt={job.kind === "render" ? "Rendered interior" : "Model study of the room"} className="mt-3 w-full rounded-lg" /> : null}
            {job.kind === "study" ? <p className="mt-2 text-xs text-brass">Model study from this view</p> : null}
            {job.kind === "render" ? <p className="mt-2 text-xs text-brass">Rendered still</p> : null}
            <p className="mt-2 text-xs leading-relaxed text-muted">{job.prompt}</p>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="font-display text-xl">Reference photo</h2>
        <label
          className={cn("mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center", over ? "border-brass" : "border-line")}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void takeFile(e.dataTransfer.files[0]);
          }}
        >
          <span className="text-sm">Drop a room photo, or choose a file.</span>
          <span className="mt-1 text-xs text-muted">It stays on this device.</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void takeFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {referenceUrl ? (
          <div className="mt-3">
            <img src={referenceUrl} alt={referenceName ?? "Reference room"} className="w-full rounded-lg" />
            <div className="mt-2 flex gap-2">
              <Button tone="brass" disabled={busy} onClick={() => void interpret()}>
                Read this photo
              </Button>
              <Button tone="ghost" onClick={() => clearReference()}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}
        {note ? <p className="mt-2 text-sm text-brass">{note}</p> : null}
      </section>
    </div>
  );
}

const TABS = [
  { id: "pieces", label: "Pieces", icon: Armchair },
  { id: "finish", label: "Finish", icon: Layers },
  { id: "architect", label: "Architect", icon: MessageSquare },
  { id: "stills", label: "Stills", icon: Camera },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Panel() {
  const [tab, setTab] = useState<TabId>("architect");
  const [busy, setBusy] = useState(false);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-raise text-cream">
      <div role="tablist" aria-label="Studio tools" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn("flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm", active ? "border-brass text-cream" : "border-transparent text-muted")}
              onClick={() => setTab(item.id)}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {tab === "architect" ? (
          <Architect />
        ) : (
          <div className="h-full overflow-y-auto pr-1">
            {tab === "pieces" ? <Catalog /> : null}
            {tab === "finish" ? <Finish /> : null}
            {tab === "stills" ? <Stills busy={busy} setBusy={setBusy} openArchitect={() => setTab("architect")} /> : null}
          </div>
        )}
      </div>
    </aside>
  );
}
