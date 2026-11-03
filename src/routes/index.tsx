import { useEffect, useState, type ComponentType } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BootScreen } from "@/components/studio/boot";

const studioLoad = import("@/components/studio/studio-app");
void import("@/components/studio/viewport");

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [Studio, setStudio] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    studioLoad
      .then((mod) => {
        if (live) setStudio(() => mod.StudioApp);
      })
      .catch((err: unknown) => {
        if (live) setFailed(err instanceof Error ? err.message : "The studio failed to open.");
      });
    return () => {
      live = false;
    };
  }, []);

  if (failed) {
    return (
      <main className="grid h-dvh place-items-center bg-ink px-6 text-center text-cream">
        <div>
          <p className="font-display text-3xl">Sable Atelier</p>
          <p className="mt-3 max-w-sm text-sm text-muted">{failed}</p>
        </div>
      </main>
    );
  }

  if (!Studio) return <BootScreen />;
  return <Studio />;
}
