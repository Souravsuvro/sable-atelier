export function Wordmark() {
  return (
    <div className="leading-none">
      <p className="font-display text-xl tracking-tight text-cream">Sable</p>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted">Atelier</p>
    </div>
  );
}

export function BootScreen() {
  return (
    <div className="flex h-dvh flex-col bg-ink text-cream">
      <header className="flex items-center gap-4 border-b border-line px-4 py-3">
        <Wordmark />
        <p className="text-sm text-muted">Opening the model room</p>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center bg-plaster px-6 text-center text-ink">
        <div>
          <p className="font-display text-3xl">Sable Atelier</p>
          <p className="mt-2 text-sm">Architecture and interiors</p>
        </div>
      </div>
    </div>
  );
}
