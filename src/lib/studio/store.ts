import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CATALOG } from "@/lib/studio/catalog";
import { clampNode, createDefaultScene, findOpenSpot, reduceCalls, sanitizeScene } from "@/lib/studio/layout";
import {
  type AgentCall,
  type ChatMessage,
  type FloorFinish,
  type FurnitureNode,
  type ItemType,
  type LightingPreset,
  type RenderJob,
  type RoomSize,
  type StudioScene,
  type WallFinish,
  type WallId,
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
  select: (id: string | null) => void;
  beginGesture: () => void;
  endGesture: () => void;
  moveNode: (id: string, x: number, z: number) => void;
  updateNode: (id: string, patch: Partial<FurnitureNode>) => void;
  placeItem: (type: ItemType) => void;
  applyCalls: (calls: AgentCall[]) => string[];
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

const HELLO: ChatMessage = {
  id: "hello",
  role: "architect",
  source: "studio",
  text: "The model room is open. Ask for a mood, a piece, or a correction and I will place it and tell you why.",
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
        const s = get();
        const past = s.gesturing ? s.past : [...s.past, snap(s)].slice(-40);
        const future = s.gesturing ? s.future : [];
        const result = reduceCalls(snap(s), calls, s.selectedId);
        set({
          ...result.scene,
          selectedId: result.selectedId,
          past,
          future,
          lastLog: result.logs.join(" · "),
          gesturing: s.gesturing,
        });
        return result.logs;
      },
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
      version: 1,
      storage: createJSONStorage(planStorage),
      partialize: (s) => ({
        room: s.room,
        floor: s.floor,
        walls: s.walls,
        lighting: s.lighting,
        nodes: s.nodes,
        messages: s.messages.slice(-30).map((m) => ({
          ...m,
          text: m.text.slice(0, 800),
          detail: m.detail?.slice(0, 300),
        })),
      }),
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<StudioScene & { messages?: ChatMessage[] }>;
        const clean = sanitizeScene(raw);
        const messages = Array.isArray(raw.messages)
          ? raw.messages
              .filter((m) => m && (m.role === "user" || m.role === "architect") && typeof m.text === "string")
              .slice(-30)
          : current.messages;
        return {
          ...current,
          ...(clean ?? {}),
          messages: messages.length > 0 ? messages : current.messages,
        };
      },
    },
  ),
);
