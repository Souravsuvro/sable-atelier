import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { PlanSvg } from "@/components/studio/plan";
import { currentRenderer, enterAR, probeAR } from "@/components/studio/webxr";
import { useStudio } from "@/lib/studio/store";
import { decodePlan, encodePlan } from "@/lib/studio/transfer";
import * as QRCode from "qrcode";

export function ArDialog() {
  const open = useStudio((s) => s.arOpen);
  const setOpen = useStudio((s) => s.setArOpen);
  const room = useStudio((s) => s.room);
  const floor = useStudio((s) => s.floor);
  const walls = useStudio((s) => s.walls);
  const lighting = useStudio((s) => s.lighting);
  const nodes = useStudio((s) => s.nodes);
  const scene = useMemo(
    () => ({ room, floor, walls, lighting, nodes }),
    [room, floor, walls, lighting, nodes],
  );
  const replaceScene = useStudio((s) => s.replaceScene);
  const code = useMemo(() => encodePlan(scene), [scene]);
  const [qr, setQr] = useState<string | null>(null);
  const [support, setSupport] = useState<"checking" | "ready" | "none">("checking");
  const [arNote, setArNote] = useState("");
  const [incoming, setIncoming] = useState("");
  const [importNote, setImportNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setSupport("checking");
    setArNote("");
    void probeAR().then((ok) => {
      if (live) setSupport(ok ? "ready" : "none");
    });
    return () => {
      live = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void QRCode.toDataURL(code, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "L",
      color: { dark: "#161411", light: "#f3eee6" },
    })
      .then((url) => {
        if (live) setQr(url);
      })
      .catch(() => {
        if (live) setQr(null);
      });
    return () => {
      live = false;
    };
  }, [open, code]);

  async function start() {
    const gl = currentRenderer();
    if (!gl) {
      setArNote("The model isn't ready yet.");
      return;
    }
    const result = await enterAR(gl);
    if (result === "unsupported") setArNote("This browser can't open an augmented session.");
    else if (result === "failed") setArNote("The session didn't start. You can still copy the plan.");
    else setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[min(740px,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-raise p-5 text-cream">
          <Dialog.Title className="font-display text-2xl">In your room</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">
            On a phone that supports WebXR, you stand inside this plan at true scale. Otherwise copy the plan code and import it on the other screen.
          </Dialog.Description>
          <div className="mt-4">
            {support === "ready" ? (
              <Button tone="brass" onClick={() => void start()}>
                Start augmented session
              </Button>
            ) : (
              <p className="text-sm text-cream">
                {support === "checking" ? "Checking this browser…" : "Augmented placement isn't available here. The plan drawing and the code still travel."}
              </p>
            )}
            {arNote ? <p className="mt-2 text-sm text-brass">{arNote}</p> : null}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-center">
            {qr ? <img src={qr} alt="QR code of the plan" className="w-full rounded-lg bg-cream" /> : <div className="grid h-40 place-items-center rounded-lg bg-plaster text-xs text-ink">Plan code</div>}
            <PlanSvg scene={scene} interactive />
          </div>
          <label className="mt-4 block text-sm" htmlFor="plan-code">
            Plan code
            <textarea id="plan-code" readOnly value={code} className="mt-1 h-24 w-full resize-none rounded-xl border border-line bg-ink p-3 text-xs text-cream" />
          </label>
          <div className="mt-2 flex gap-2">
            <Button
              tone="brass"
              onClick={() => {
                void navigator.clipboard.writeText(code).then(
                  () => setCopied(true),
                  () => setCopied(false),
                );
              }}
            >
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
          <label className="mt-5 block text-sm" htmlFor="import-code">
            Import a plan
            <textarea
              id="import-code"
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
              className="mt-1 h-24 w-full resize-none rounded-xl border border-line bg-ink p-3 text-xs text-cream"
              placeholder="Paste a Sable plan code"
            />
          </label>
          <div className="mt-2 flex items-center gap-3">
            <Button
              tone="line"
              onClick={() => {
                const next = decodePlan(incoming);
                if (!next) {
                  setImportNote("That code isn't a Sable plan.");
                  return;
                }
                replaceScene(next);
                setImportNote("Plan imported.");
                setIncoming("");
              }}
            >
              Apply plan
            </Button>
            {importNote ? <p className="text-sm text-brass">{importNote}</p> : null}
          </div>
          <div className="mt-5 flex justify-end">
            <Dialog.Close className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-cream hover:bg-ink">
              Close
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
