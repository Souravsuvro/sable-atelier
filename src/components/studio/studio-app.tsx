import { lazy, Suspense, useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen, Redo2, Smartphone, Undo2 } from "lucide-react";
import { Wordmark } from "@/components/studio/boot";
import { Inspector, Panel } from "@/components/studio/panel";
import { Button } from "@/components/ui/button";
import { PRESET_LABEL, presetCalls } from "@/lib/studio/catalog";
import { coverageRatio } from "@/lib/studio/layout";
import { useStudio } from "@/lib/studio/store";
import type { PresetName } from "@/lib/studio/types";

const HEADER_PRESETS: PresetName[] = ["living", "office", "workspace"];
const OFFER_KEY = "sable-offer-seen";

const Viewport = lazy(() => import("@/components/studio/viewport").then((mod) => ({ default: mod.Viewport })));
const ArDialog = lazy(() => import("@/components/studio/ar-dialog").then((mod) => ({ default: mod.ArDialog })));

function StageHold({ label }: { label: string }) {
  return (
    <div className="grid h-full min-h-0 place-items-center bg-plaster text-ink">
      <p className="text-sm">{label}</p>
    </div>
  );
}

const PROGRAMS: { name: PresetName; title: string; line: string }[] = [
  { name: "living", title: "House", line: "Living, dining, and sleep. North light, timber, and a clear center." },
  { name: "office", title: "Office", line: "A work table, two chairs, and storage on the walls." },
  { name: "workspace", title: "Workspace", line: "One desk, one chair, a lamp, and a case of books." },
];

function Offer({ onOpen }: { onOpen: (name: PresetName | null) => void }) {
  return (
    <div className="fixed inset-0 z-30 flex overflow-y-auto bg-ink text-cream">
      <div className="mx-auto flex w-full max-w-3xl flex-col justify-between gap-10 px-6 py-8 sm:px-10 sm:py-12">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Sable Atelier</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-tight sm:text-5xl">Design the room by writing it.</h1>
          <p className="mt-4 max-w-lg text-base text-muted">
            A house, an office, or a workspace. Say what should change and the model moves. Plans stay on this device.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {PROGRAMS.map((program) => (
              <button
                key={program.name}
                type="button"
                className="rounded-2xl border border-line px-4 py-4 text-left transition-[border-color,background-color] duration-150 hover:border-brass hover:bg-line/40"
                onClick={() => onOpen(program.name)}
              >
                <span className="block font-display text-2xl">{program.title}</span>
                <span className="mt-2 block text-sm text-muted">{program.line}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-md text-sm text-muted">
            Membership is £29 a month. It is how this practice is paid for. The model opens either way.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-11 items-center rounded-full bg-brass px-4 text-sm font-medium text-ink"
              href="https://whop.com/checkout/plan_HsFW7j49G6JqA"
              target="_blank"
              rel="noreferrer"
            >
              Subscribe
            </a>
            <button
              type="button"
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-cream"
              onClick={() => onOpen(null)}
            >
              Open the model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function usePlanReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (useStudio.persist.hasHydrated()) setReady(true);
    const unsub = useStudio.persist.onFinishHydration(() => setReady(true));
    const timer = window.setTimeout(() => setReady(true), 600);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);
  return ready;
}

export function StudioApp() {
  const ready = usePlanReady();
  const room = useStudio((s) => s.room);
  const coverage = useStudio((s) => Math.round(coverageRatio(s.nodes, s.room) * 100));
  const lastLog = useStudio((s) => s.lastLog);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const applyCalls = useStudio((s) => s.applyCalls);
  const setArOpen = useStudio((s) => s.setArOpen);
  const view = useStudio((s) => s.view);
  const setView = useStudio((s) => s.setView);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const [board, setBoard] = useState(true);
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    try {
      setOffer(window.sessionStorage.getItem(OFFER_KEY) !== "1");
    } catch {
      setOffer(true);
    }
  }, []);

  function openFromOffer(name: PresetName | null) {
    try {
      window.sessionStorage.setItem(OFFER_KEY, "1");
    } catch {
      /* storage can be blocked in an embedded frame */
    }
    if (name) applyCalls(presetCalls(name, useStudio.getState().room));
    setOffer(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const state = useStudio.getState();
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (!state.selectedId) {
        if (event.key === "Escape") state.select(null);
        return;
      }
      const node = state.nodes.find((n) => n.id === state.selectedId);
      if (!node) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        state.applyCalls([{ tool: "removeFurniture", id: node.id }]);
        return;
      }
      if (event.key === "Escape") {
        state.select(null);
        return;
      }
      if (event.key === "[") {
        state.beginGesture();
        state.updateNode(node.id, { rotationY: node.rotationY - Math.PI / 12 });
        state.endGesture();
        return;
      }
      if (event.key === "]") {
        state.beginGesture();
        state.updateNode(node.id, { rotationY: node.rotationY + Math.PI / 12 });
        state.endGesture();
        return;
      }
      const step = event.shiftKey ? 0.2 : 0.08;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dz = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      if (dx === 0 && dz === 0) return;
      event.preventDefault();
      if (!event.repeat) state.beginGesture();
      const latest = useStudio.getState().nodes.find((n) => n.id === node.id) ?? node;
      state.moveNode(node.id, latest.x + dx, latest.z + dz);
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) useStudio.getState().endGesture();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink text-cream select-none">
      <header className="shrink-0 border-b border-line">
        <div className="flex items-center gap-3 px-4 py-3">
          <Wordmark />
          <p className="hidden min-w-0 truncate text-sm text-muted sm:block" aria-live="polite">
            {ready ? lastLog || "Saved on this device" : "Restoring the plan"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <p className="hidden text-sm tabular-nums text-muted md:block">{ready ? `${coverage}% floor` : ""}</p>
            <Button tone="ghost" className="px-3" onClick={() => undo()} disabled={!ready || past === 0} aria-label="Undo">
              <Undo2 className="size-4" />
            </Button>
            <Button tone="ghost" className="px-3" onClick={() => redo()} disabled={!ready || future === 0} aria-label="Redo">
              <Redo2 className="size-4" />
            </Button>
            <Button tone="ghost" className="px-3" onClick={() => setBoard((open) => !open)} aria-label={board ? "Hide board" : "Show board"}>
              {board ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            </Button>
            <Button tone="brass" onClick={() => setArOpen(true)} disabled={!ready}>
              <Smartphone className="size-4" aria-hidden="true" />
              In your room
            </Button>
          </div>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto px-4 pb-3">
          <div className="flex shrink-0 rounded-full border border-line p-0.5">
            <button
              type="button"
              className={view === "eye" ? "min-h-11 rounded-full bg-brass px-3 text-sm text-ink" : "min-h-11 rounded-full px-3 text-sm text-muted"}
              onClick={() => setView("eye")}
              disabled={!ready}
            >
              Model
            </button>
            <button
              type="button"
              className={view === "plan" ? "min-h-11 rounded-full bg-brass px-3 text-sm text-ink" : "min-h-11 rounded-full px-3 text-sm text-muted"}
              onClick={() => setView("plan")}
              disabled={!ready}
            >
              Plan
            </button>
          </div>
          {HEADER_PRESETS.map((name) => (
            <Button key={name} tone="line" className="shrink-0" disabled={!ready} onClick={() => applyCalls(presetCalls(name, useStudio.getState().room))}>
              {PRESET_LABEL[name]}
            </Button>
          ))}
          <p className="flex shrink-0 items-center px-2 text-xs tabular-nums text-muted">
            {room.width.toFixed(1)} × {room.depth.toFixed(1)} m
          </p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-0 flex-[1.15]">
          {ready ? (
            <Suspense fallback={<StageHold label="Opening the model" />}>
              <Viewport />
            </Suspense>
          ) : (
            <StageHold label="Restoring the plan" />
          )}
          {ready ? <Inspector /> : null}
        </div>
        <div className={board ? "min-h-0 flex-1 border-t border-line lg:w-96 lg:flex-none lg:border-t-0 lg:border-l" : "hidden"}>
          <Panel />
        </div>
      </div>
      <Suspense fallback={null}>
        <ArDialog />
      </Suspense>
      {offer ? <Offer onOpen={openFromOffer} /> : null}
    </main>
  );
}
