import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CATALOG } from "@/lib/studio/catalog";
import { clampNode, createDefaultScene, createSpaceScene, findOpenSpot, reduceCalls, sanitizeScene } from "@/lib/studio/layout";
import {
  type AgentCall,
  type ChatMessage,
  type Drawing,
  type FloorFinish,
  type FurnitureNode,
  type ItemType,
  type LightingPreset,
  type RenderJob,
  type RoomSize,
  type SavedSpace,
  type SpaceKind,
  type StudioScene,
  type WallFinish,
  type WallId,
  makeId,
} from "@/lib/studio/types";

interface Snap {
  room: RoomSize;
  floor: FloorFinish;
  walls: Record<WallId, WallFinish>;
  lighting: LightingPreset;
  nodes: FurnitureNode[];
}

interface StudioStore extends StudioScene {
  messages: ChatMessage[];
  selectedId: string | null;
  past: Snap[];
  future: Snap[];
  gesturing: boolean;
  lastLog: string;
  arOpen: boolean;
  view: "eye" | "plan";
  jobs: RenderJob[];
  referenceUrl: string | null;
  referenceName: string | null;
  canvasEpoch: number;
  spaceId: string;
  spaceName: string;
  spaceKind: SpaceKind;
  spaces: SavedSpace[];
  drawings: Drawing[];
  select: (id: string | null) => void;
  beginGesture: () => void;
  endGesture: () => void;
  moveNode: (id: string, x: number, z: number) => void;
  updateNode: (id: string, patch: Partial<FurnitureNode>) => void;
  placeItem: (type: ItemType) => void;
  applyCalls: (calls: AgentCall[]) => string[];
  openSpace: (name: string, kind: SpaceKind) => void;
  addDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  undo: () => void;
  redo: () => void;
  replaceScene: (scene: StudioScene) => void;
  appendMessage: (message: ChatMessage) => void;
  replaceMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setArOpen: (open: boolean) => void;
  setView: (view: "eye" | "plan") => void;
  addJob: (job: RenderJob) => void;
  patchJob: (id: string, patch: Partial<RenderJob>) => void;
  setReference: (url: string, name: string) => void;
  clearReference: () => void;
  bumpCanvas: () => void;
}

function snap(s: StudioStore): Snap {
  return {
    room: { ...s.room },
    floor: s.floor,
    walls: { ...s.walls },
    lighting: s.lighting,
    nodes: s.nodes.map((n) => ({ ...n })),
  };
}

const initial = createDefaultScene();
const FIRST_SPACE = "living";

function sceneOf(s: StudioScene): StudioScene {
  return { room: { ...s.room }, floor: s.floor, walls: { ...s.walls }, lighting: s.lighting, nodes: s.nodes.map((n) => ({ ...n })) };
}

function withActive(spaces: SavedSpace[], spaceId: string, scene: StudioScene): SavedSpace[] {
  return spaces.map((space) => (space.id === spaceId ? { ...space, scene } : space));
}

const HELLO: ChatMessage = {
  id: "hello",
  role: "architect",
  source: "studio",
  text: "The project is open. Ask for a room, the light, a stair, a roof, or the yards. I will change the model and tell you why.",
};

function planStorage() {
  const memory = new Map<string, string>();
  const fallback = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };
  if (typeof window === "undefined") return fallback;
  try {
    const probe = "__sable_probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return fallback;
  }
}

export const useStudio = create<StudioStore>()(
  persist(
    (set, get) => ({
      ...initial,
      messages: [HELLO],
      selectedId: null,
      past: [],
      future: [],
      gesturing: false,
      lastLog: "",
      arOpen: false,
      view: "eye",
      jobs: [],
      referenceUrl: null,
      referenceName: null,
      canvasEpoch: 0,
      spaceId: FIRST_SPACE,
      spaceName: "Living",
      spaceKind: "interior",
      spaces: [{ id: FIRST_SPACE, name: "Living", kind: "interior", scene: sceneOf(initial) }],
      drawings: [],
      select: (id) => set({ selectedId: id }),
      beginGesture: () => {
        const s = get();
        if (s.gesturing) return;
        set({ gesturing: true, past: [...s.past, snap(s)].slice(-40), future: [] });
      },
      endGesture: () => set({ gesturing: false }),
      moveNode: (id, x, z) => {
        const s = get();
        set({
          nodes: s.nodes.map((n) => (n.id === id ? clampNode({ ...n, x, z }, s.room) : n)),
        });
      },
      updateNode: (id, patch) => {
        const s = get();
        const past = s.gesturing ? s.past : [...s.past, snap(s)].slice(-40);
        const future = s.gesturing ? s.future : [];
        set({
          past,
          future,
          nodes: s.nodes.map((n) => (n.id === id ? clampNode({ ...n, ...patch }, s.room) : n)),
        });
      },
      placeItem: (type) => {
        const s = get();
        const spot = findOpenSpot(s.nodes, type, s.room);
        get().applyCalls([
          {
            tool: "placeFurnitureItem",
            itemType: type,
            x: spot.x,
            y: CATALOG[type].y,
            z: spot.z,
            color: CATALOG[type].color,
            rotationY: 0,
            scale: 1,
          },
        ]);
      },
      applyCalls: (calls) => {
        if (calls.length === 0) return [];
        const opens = calls.filter((call): call is Extract<AgentCall, { tool: "openSpace" }> => call.tool === "openSpace");
        if (opens.length > 0) {
          const last = opens[opens.length - 1];
          if (last) get().openSpace(last.name, last.kind);
        }
        const rest = calls.filter((call) => call.tool !== "openSpace");
        if (rest.length === 0) return [get().lastLog].filter(Boolean);
        const s = get();
        const past = s.gesturing ? s.past : [...s.past, snap(s)].slice(-40);
        const future = s.gesturing ? s.future : [];
        const result = reduceCalls(snap(s), rest, s.selectedId);
        const scene = result.scene;
        set({
          ...scene,
          spaces: withActive(s.spaces, s.spaceId, scene),
          selectedId: result.selectedId,
          past,
          future,
          lastLog: result.logs.join(" · "),
          gesturing: s.gesturing,
        });
        return result.logs;
      },
      openSpace: (name, kind) => {
        const s = get();
        const current = sceneOf(s);
        const saved = withActive(s.spaces, s.spaceId, current);
        const found = saved.find((space) => space.kind === kind && space.name.toLowerCase() === name.toLowerCase());
        if (found && found.id !== s.spaceId) {
          set({
            spaces: saved,
            spaceId: found.id,
            spaceName: found.name,
            spaceKind: found.kind,
            ...found.scene,
            selectedId: null,
            past: [],
            future: [],
            lastLog: `Opened ${found.name}`,
          });
          return;
        }
        if (found) return;
        const scene = createSpaceScene(kind);
        const id = makeId();
        set({
          spaces: [...saved, { id, name, kind, scene }],
          spaceId: id,
          spaceName: name,
          spaceKind: kind,
          ...scene,
          selectedId: null,
          past: [],
          future: [],
          lastLog: `Opened ${name}`,
        });
      },
      addDrawing: (drawing) => set((s) => ({ drawings: [drawing, ...s.drawings].slice(0, 8) })),
      removeDrawing: (id) => set((s) => ({ drawings: s.drawings.filter((drawing) => drawing.id !== id) })),
      undo: () => {
        const s = get();
        const prev = s.past[s.past.length - 1];
        if (!prev) return;
        const selected = s.selectedId && prev.nodes.some((n) => n.id === s.selectedId) ? s.selectedId : null;
        set({
          ...prev,
          past: s.past.slice(0, -1),
          future: [snap(s), ...s.future].slice(0, 40),
          selectedId: selected,
          gesturing: false,
          lastLog: "Undid the last change",
        });
      },
      redo: () => {
        const s = get();
        const next = s.future[0];
        if (!next) return;
        set({
          ...next,
          past: [...s.past, snap(s)].slice(-40),
          future: s.future.slice(1),
          selectedId: null,
          gesturing: false,
          lastLog: "Restored the change",
        });
      },
      replaceScene: (scene) => {
        const s = get();
        const clean = sanitizeScene(scene);
        if (!clean) return;
        set({
          ...clean,
          past: [...s.past, snap(s)].slice(-40),
          future: [],
          selectedId: null,
          lastLog: "Imported a plan",
        });
      },
      appendMessage: (message) => set((s) => ({ messages: [...s.messages, message].slice(-40) })),
      replaceMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      setArOpen: (arOpen) => set({ arOpen }),
      setView: (view) => set({ view }),
      addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs].slice(0, 4) })),
      patchJob: (id, patch) =>
        set((s) => ({
          jobs: s.jobs.map((job) => (job.id === id ? { ...job, ...patch } : job)),
        })),
      setReference: (referenceUrl, referenceName) => set({ referenceUrl, referenceName }),
      clearReference: () => set({ referenceUrl: null, referenceName: null }),
      bumpCanvas: () => set((s) => ({ canvasEpoch: s.canvasEpoch + 1 })),
    }),
    {
      name: "sable-atelier-v1",
      version: 2,
      storage: createJSONStorage(planStorage),
      partialize: (s) => ({
        room: s.room,
        floor: s.floor,
        walls: s.walls,
        lighting: s.lighting,
        nodes: s.nodes,
        spaceId: s.spaceId,
        spaceName: s.spaceName,
        spaceKind: s.spaceKind,
        spaces: s.spaces,
        drawings: s.drawings.map((drawing) => ({
          ...drawing,
          dataUrl: drawing.dataUrl && drawing.dataUrl.length < 350_000 ? drawing.dataUrl : null,
        })),
        messages: s.messages.slice(-30).map((m) => ({
          ...m,
          text: m.text.slice(0, 800),
          detail: m.detail?.slice(0, 300),
        })),
      }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<
          StudioScene & {
            messages?: ChatMessage[];
            spaces?: SavedSpace[];
            spaceId?: string;
            spaceName?: string;
            spaceKind?: SpaceKind;
            drawings?: Drawing[];
          }
        >;
        const clean = sanitizeScene(raw);
        const messages = Array.isArray(raw.messages)
          ? raw.messages
              .filter((m) => m && (m.role === "user" || m.role === "architect") && typeof m.text === "string")
              .slice(-30)
          : current.messages;
        const scene = clean ?? sceneOf(current);
        const spaces =
          Array.isArray(raw.spaces) && raw.spaces.length > 0
            ? raw.spaces
                .filter((space) => space && typeof space.id === "string" && typeof space.name === "string")
                .map((space) => {
                  const saved = sanitizeScene(space.scene);
                  return saved ? { ...space, scene: saved } : null;
                })
                .filter((space): space is SavedSpace => space !== null)
            : [{ id: FIRST_SPACE, name: "Living", kind: "interior" as const, scene }];
        const spaceId = spaces.some((space) => space.id === raw.spaceId) ? raw.spaceId! : spaces[0]?.id ?? FIRST_SPACE;
        const active = spaces.find((space) => space.id === spaceId) ?? spaces[0];
        return {
          ...current,
          ...(active?.scene ?? scene),
          messages: messages.length > 0 ? messages : current.messages,
          spaces: spaces.length > 0 ? spaces : current.spaces,
          spaceId: active?.id ?? current.spaceId,
          spaceName: active?.name ?? current.spaceName,
          spaceKind: active?.kind ?? current.spaceKind,
          drawings: Array.isArray(raw.drawings) ? raw.drawings.filter((drawing) => drawing && typeof drawing.name === "string").slice(0, 8) : [],
        };
      },
    },
  ),
);
