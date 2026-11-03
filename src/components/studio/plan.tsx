import { CATALOG } from "@/lib/studio/catalog";
import { useStudio } from "@/lib/studio/store";
import type { StudioScene } from "@/lib/studio/types";

export function PlanSvg({ scene, interactive = false }: { scene: StudioScene; interactive?: boolean }) {
  const select = useStudio((s) => s.select);
  const selectedId = useStudio((s) => s.selectedId);
  const { width, depth } = scene.room;
  const vbW = 100;
  const vbH = 78;
  const pad = 8;
  const s = Math.min((vbW - pad * 2) / width, (vbH - pad * 2) / depth);
  const ox = vbW / 2;
  const oy = vbH / 2 + 1;
  const xOf = (x: number) => ox + x * s;
  const yOf = (z: number) => oy + z * s;

  return (
    <svg viewBox={`0 0 ${vbW} ${vbH}`} className="h-auto w-full rounded-xl bg-plaster" role="img" aria-label="Floor plan, north at the top">
      <rect x={xOf(-width / 2)} y={yOf(-depth / 2)} width={width * s} height={depth * s} fill="#f3eee6" stroke="#161411" strokeWidth={0.6} />
      <text x={ox} y={yOf(-depth / 2) - 1.6} textAnchor="middle" fontSize={3.2} fill="#161411">
        North
      </text>
      {scene.nodes.map((n) => {
        const spec = CATALOG[n.type];
        const w = spec.width * n.scale * s;
        const d = spec.depth * n.scale * s;
        const active = n.id === selectedId;
        return (
          <rect
            key={n.id}
            x={-w / 2}
            y={-d / 2}
            width={w}
            height={d}
            fill={n.color}
            stroke={active ? "#b8893d" : "#161411"}
            strokeWidth={active ? 0.7 : 0.25}
            transform={`translate(${xOf(n.x)} ${yOf(n.z)}) rotate(${(-n.rotationY * 180) / Math.PI})`}
            className={interactive ? "cursor-pointer" : undefined}
            onClick={
              interactive
                ? () => {
                    select(n.id);
                  }
                : undefined
            }
          >
            <title>{spec.label}</title>
          </rect>
        );
      })}
    </svg>
  );
}
