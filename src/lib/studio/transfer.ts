import { DEFAULT_ROOM } from "@/lib/studio/catalog";
import { clampNode, clampRoom } from "@/lib/studio/layout";
import {
  FLOORS,
  LIGHTS,
  WALL_FINISHES,
  makeId,
  oneOf,
  type FloorFinish,
  type FurnitureNode,
  type ItemType,
  type LightingPreset,
  type StudioScene,
  type WallFinish,
} from "@/lib/studio/types";

interface CompactPlan {
  v: number;
  w: number;
  d: number;
  f: FloorFinish;
  wa: WallFinish[];
  l: LightingPreset;
  n: [ItemType, number, number, number, number, string][];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function encodePlan(scene: StudioScene): string {
  const compact: CompactPlan = {
    v: 1,
    w: scene.room.width,
    d: scene.room.depth,
    f: scene.floor,
    wa: [scene.walls.north, scene.walls.south, scene.walls.east, scene.walls.west],
    l: scene.lighting,
    n: scene.nodes.map((node) => [node.type, round(node.x), round(node.z), round(node.rotationY), round(node.scale), node.color]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return `sable:${btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")}`;
}

export function decodePlan(code: string): StudioScene | null {
  try {
    const raw = code.trim().replace(/^sable:/i, "");
    const b64 = raw.replaceAll("-", "+").replaceAll("_", "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CompactPlan>;
    if (!oneOf(FLOORS, parsed.f) || !oneOf(LIGHTS, parsed.l) || !Array.isArray(parsed.wa) || parsed.wa.length !== 4) {
      return null;
    }
    if (!parsed.wa.every((w) => oneOf(WALL_FINISHES, w))) return null;
    const room = clampRoom(typeof parsed.w === "number" ? parsed.w : DEFAULT_ROOM.width, typeof parsed.d === "number" ? parsed.d : DEFAULT_ROOM.depth);
    const nodes: FurnitureNode[] = [];
    if (Array.isArray(parsed.n)) {
      for (const row of parsed.n.slice(0, 24)) {
        if (!Array.isArray(row) || row.length < 6) continue;
        const [type, x, z, rotationY, scale, color] = row;
        if (!oneOf(["sofa", "armchair", "coffee-table", "dining-table", "dining-chair", "floor-lamp", "plant", "bookshelf", "sideboard", "bed", "rug", "ottoman"] as const, type)) {
          continue;
        }
        if (typeof x !== "number" || typeof z !== "number") continue;
        nodes.push(
          clampNode(
            {
              id: makeId(),
              type,
              x,
              y: 0,
              z,
              rotationY: typeof rotationY === "number" ? rotationY : 0,
              scale: typeof scale === "number" ? scale : 1,
              color: typeof color === "string" ? color : "#d9d0c3",
            },
            room,
          ),
        );
      }
    }
    return {
      room,
      floor: parsed.f,
      walls: { north: parsed.wa[0], south: parsed.wa[1], east: parsed.wa[2], west: parsed.wa[3] },
      lighting: parsed.l,
      nodes,
    };
  } catch {
    return null;
  }
}
