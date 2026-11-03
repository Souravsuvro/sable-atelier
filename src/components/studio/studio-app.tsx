import { lazy, Suspense, useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen, Redo2, Smartphone, Undo2 } from "lucide-react";
import { Wordmark } from "@/components/studio/boot";
import { Inspector, Panel } from "@/components/studio/panel";
import { Button } from "@/components/ui/button";
import { PRESET_LABEL, presetCalls } from "@/lib/studio/catalog";
import { coverageRatio } from "@/lib/studio/layout";
import { useStudio } from "@/lib/studio/store";
import type { PresetName } from "@/lib/studio/types";

const HEADER_PRESETS: PresetName[] = ["living", "dining", "bedroom", "gallery"];

const Viewport = lazy(() => import("@/components/studio/viewport").then((mod) => ({ default: mod.Viewport })));
const ArDialog = lazy(() => import("@/components/studio/ar-dialog").then((mod) => ({ default: mod.ArDialog })));

function StageHold({ label }: { label: string }) {
  return (
    <div className="grid h-full min-h-0 place-items-center bg-plaster text-ink">
      <p className="text-sm">{label}</p>
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
    </main>
  );
}
