import { CATALOG, DEFAULT_ROOM, FLOOR_LABEL, LIGHT_LABEL, WALL_LABEL, presetCalls } from "@/lib/studio/catalog";
import {
  FLOORS,
  LIGHTS,
  WALLS,
  WALL_FINISHES,
  makeId,
  oneOf,
  type AgentCall,
  type FloorFinish,
  type FurnitureNode,
  type ItemType,
  type LightingPreset,
  type RoomSize,
  type StudioScene,
  type WallFinish,
  type WallId,
} from "@/lib/studio/types";

const SCALE_MIN = 0.7;
const SCALE_MAX = 1.4;
export const MAX_PIECES = 24;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function safeColor(color: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}

export function clampRoom(width: number, depth: number, height = DEFAULT_ROOM.height): RoomSize {
  return {
    width: clamp(Math.round(width * 10) / 10, 4, 8),
    depth: clamp(Math.round(depth * 10) / 10, 3.6, 7),
    height,
  };
}

export function halfExtents(node: FurnitureNode): { hx: number; hz: number } {
  const spec = CATALOG[node.type];
  const w = spec.width * node.scale;
  const d = spec.depth * node.scale;
  const c = Math.abs(Math.cos(node.rotationY));
  const s = Math.abs(Math.sin(node.rotationY));
  return { hx: (w * c + d * s) / 2, hz: (w * s + d * c) / 2 };
}

export function clampNode(node: FurnitureNode, room: RoomSize): FurnitureNode {
  const scale = clamp(node.scale, SCALE_MIN, SCALE_MAX);
  const next: FurnitureNode = { ...node, scale, y: CATALOG[node.type].y, color: safeColor(node.color, CATALOG[node.type].color) };
  const { hx, hz } = halfExtents(next);
  const limX = Math.max(0, room.width / 2 - hx - 0.02);
  const limZ = Math.max(0, room.depth / 2 - hz - 0.02);
  next.x = clamp(next.x, -limX, limX);
  next.z = clamp(next.z, -limZ, limZ);
  return next;
}

function aabb(node: FurnitureNode) {
  const { hx, hz } = halfExtents(node);
  return { minX: node.x - hx, maxX: node.x + hx, minZ: node.z - hz, maxZ: node.z + hz };
}

function blocks(a: FurnitureNode, b: FurnitureNode): boolean {
  if (a.type === "rug" || b.type === "rug") return false;
  const A = aabb(a);
  const B = aabb(b);
  const gap = 0.08;
  return A.minX - gap < B.maxX && A.maxX + gap > B.minX && A.minZ - gap < B.maxZ && A.maxZ + gap > B.minZ;
}

export function findOpenSpot(nodes: FurnitureNode[], type: ItemType, room: RoomSize): { x: number; z: number } {
  const spec = CATALOG[type];
  const draft = (x: number, z: number): FurnitureNode => ({
    id: "_",
    type,
    x,
    y: spec.y,
    z,
    rotationY: 0,
    scale: 1,
    color: spec.color,
  });
  const { hx, hz } = halfExtents(draft(0, 0));
  const minX = -room.width / 2 + hx + 0.08;
  const maxX = room.width / 2 - hx - 0.08;
  const minZ = -room.depth / 2 + hz + 0.08;
  const maxZ = room.depth / 2 - hz - 0.08;
  for (let z = minZ; z <= maxZ; z += 0.35) {
    for (let x = minX; x <= maxX; x += 0.35) {
      const candidate = draft(x, z);
      if (!nodes.some((n) => blocks(candidate, n))) return { x, z };
    }
  }
  return { x: 0, z: 0 };
}

export function coverageRatio(nodes: FurnitureNode[], room: RoomSize): number {
  let area = 0;
  for (const n of nodes) {
    if (n.type === "rug") continue;
    const spec = CATALOG[n.type];
    area += spec.width * spec.depth * n.scale * n.scale;
  }
  return Math.min(1, area / (room.width * room.depth));
}

export function optimizeLayout(scene: StudioScene): FurnitureNode[] {
  const room = scene.room;
  const hw = room.width / 2;
  const hd = room.depth / 2;
  const margin = 0.12;
  const nodes = scene.nodes.map((n) => ({ ...n }));
  const of = (type: ItemType) => nodes.filter((n) => n.type === type);

  const beds = of("bed");
  const sofas = of("sofa");
  const shelves = of("bookshelf");
  const boards = of("sideboard");
  const tables = of("dining-table");
  const chairs = of("dining-chair");
  const coffees = of("coffee-table");
  const arms = of("armchair");
  const ottomans = of("ottoman");
  const rugs = of("rug");
  const lamps = of("floor-lamp");
  const plants = of("plant");
  const hasBed = beds.length > 0;

  beds.forEach((n, i) => {
    const span = CATALOG.bed.width * n.scale + 0.35;
    n.rotationY = 0;
    n.x = (i - (beds.length - 1) / 2) * span;
    n.z = -hd + margin + (CATALOG.bed.depth * n.scale) / 2;
  });

  sofas.forEach((n, i) => {
    const span = CATALOG.sofa.width * n.scale + 0.28;
    n.x = (i - (sofas.length - 1) / 2) * span;
    if (hasBed) {
      n.rotationY = Math.PI;
      n.z = hd - margin - (CATALOG.sofa.depth * n.scale) / 2;
    } else {
      n.rotationY = 0;
      n.z = -hd + margin + (CATALOG.sofa.depth * n.scale) / 2;
    }
  });

  shelves.forEach((n, i) => {
    const span = CATALOG.bookshelf.width * n.scale + 0.22;
    n.rotationY = -Math.PI / 2;
    n.x = hw - margin - (CATALOG.bookshelf.depth * n.scale) / 2;
    n.z = (i - (shelves.length - 1) / 2) * span;
  });

  boards.forEach((n, i) => {
    const span = CATALOG.sideboard.width * n.scale + 0.22;
    n.rotationY = Math.PI / 2;
    n.x = -hw + margin + (CATALOG.sideboard.depth * n.scale) / 2;
    n.z = (i - (boards.length - 1) / 2) * span;
  });

  tables.forEach((n, i) => {
    n.rotationY = 0;
    n.x = (i - (tables.length - 1) / 2) * 2.1;
    n.z = hasBed ? hd * 0.28 : 0.15;
  });

  const anchorTable = tables[0];
  if (anchorTable) {
    const seats = [
      { x: -0.45, z: -0.78, r: 0 },
      { x: 0.45, z: -0.78, r: 0 },
      { x: -0.45, z: 0.78, r: Math.PI },
      { x: 0.45, z: 0.78, r: Math.PI },
      { x: -1.08, z: 0, r: Math.PI / 2 },
      { x: 1.08, z: 0, r: -Math.PI / 2 },
    ];
    chairs.forEach((n, i) => {
      const seat = seats[i % seats.length] ?? seats[0]!;
      const ring = Math.floor(i / seats.length);
      n.x = anchorTable.x + seat.x;
      n.z = anchorTable.z + seat.z + ring * 0.12;
      n.rotationY = seat.r;
    });
  } else {
    chairs.forEach((n, i) => {
      n.rotationY = Math.PI;
      n.x = (i - (chairs.length - 1) / 2) * 0.55;
      n.z = hd - margin - CATALOG["dining-chair"].depth / 2;
    });
  }

  const sofa = sofas[0];
  coffees.forEach((n, i) => {
    if (sofa) {
      const fx = Math.sin(sofa.rotationY);
      const fz = Math.cos(sofa.rotationY);
      const dist = (CATALOG.sofa.depth * sofa.scale) / 2 + (CATALOG["coffee-table"].depth * n.scale) / 2 + 0.34;
      n.x = sofa.x + fx * dist + (i - (coffees.length - 1) / 2) * 0.15;
      n.z = sofa.z + fz * dist;
      n.rotationY = sofa.rotationY;
    } else {
      n.x = (i - (coffees.length - 1) / 2) * 1.3;
      n.z = 0.2;
      n.rotationY = 0;
    }
  });

  const focus = coffees[0] ?? sofa ?? anchorTable;
  arms.forEach((n, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const step = Math.floor(i / 2);
    n.x = (focus?.x ?? 0) + side * (1.08 + step * 0.85);
    n.z = (focus?.z ?? 0) + 0.2;
    const tx = focus?.x ?? 0;
    const tz = focus?.z ?? 0;
    n.rotationY = Math.atan2(tx - n.x, tz - n.z);
  });

  ottomans.forEach((n, i) => {
    if (!sofa) {
      n.x = (i - (ottomans.length - 1) / 2) * 0.85;
      n.z = 0.8;
      return;
    }
    const fx = Math.sin(sofa.rotationY);
    const fz = Math.cos(sofa.rotationY);
    n.x = sofa.x + fx * 1.2 + (i - (ottomans.length - 1) / 2) * 0.85;
    n.z = sofa.z + fz * 1.2;
    n.rotationY = sofa.rotationY;
  });

  const rugAnchor = sofa ?? anchorTable ?? beds[0];
  rugs.forEach((n, i) => {
    if (!rugAnchor) return;
    n.x = rugAnchor.x + i * 0.25;
    n.z = rugAnchor.z + (sofa ? Math.cos(sofa.rotationY) * 0.4 : 0);
    n.rotationY = 0;
  });

  lamps.forEach((n, i) => {
    const east = i % 2 === 0;
    const north = i % 4 < 2;
    n.rotationY = 0;
    n.x = (east ? 1 : -1) * (hw - margin - 0.24);
    n.z = (north ? -1 : 1) * (hd - margin - 0.24);
  });

  plants.forEach((n, i) => {
    const east = i % 2 === 1;
    n.rotationY = 0;
    n.x = (east ? 1 : -1) * (hw - margin - 0.36);
    n.z = (i % 4 < 2 ? 1 : -1) * (hd - margin - 0.7);
  });

  return nodes.map((n) => clampNode(n, room));
}

function readRoom(value: unknown): RoomSize | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.width !== "number" || typeof r.depth !== "number") return null;
  return clampRoom(r.width, r.depth, DEFAULT_ROOM.height);
}

function readWalls(value: unknown): Record<WallId, WallFinish> | null {
  if (!value || typeof value !== "object") return null;
  const w = value as Record<string, unknown>;
  if (!WALLS.every((id) => oneOf(WALL_FINISHES, w[id]))) return null;
  return {
    north: w.north as WallFinish,
    south: w.south as WallFinish,
    east: w.east as WallFinish,
    west: w.west as WallFinish,
  };
}

export function sanitizeNode(value: unknown): FurnitureNode | null {
  if (!value || typeof value !== "object") return null;
  const n = value as Record<string, unknown>;
  if (!oneOf(["sofa", "armchair", "coffee-table", "dining-table", "dining-chair", "floor-lamp", "plant", "bookshelf", "sideboard", "bed", "rug", "ottoman"] as const, n.type)) {
    return null;
  }
  if (typeof n.x !== "number" || typeof n.z !== "number") return null;
  const id = typeof n.id === "string" && n.id.length > 0 ? n.id.slice(0, 40) : makeId();
  return {
    id,
    type: n.type,
    x: n.x,
    y: CATALOG[n.type].y,
    z: n.z,
    rotationY: typeof n.rotationY === "number" && Number.isFinite(n.rotationY) ? n.rotationY : 0,
    scale: typeof n.scale === "number" && Number.isFinite(n.scale) ? n.scale : 1,
    color: typeof n.color === "string" ? n.color : CATALOG[n.type].color,
  };
}

export function sanitizeScene(input: unknown): StudioScene | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  if (!oneOf(FLOORS, raw.floor) || !oneOf(LIGHTS, raw.lighting)) return null;
  const walls = readWalls(raw.walls);
  const room = readRoom(raw.room);
  if (!walls || !room) return null;
  const nodes = Array.isArray(raw.nodes)
    ? raw.nodes
        .slice(0, MAX_PIECES)
        .map(sanitizeNode)
        .filter((n): n is FurnitureNode => n !== null)
        .map((n) => clampNode(n, room))
    : [];
  return { floor: raw.floor, lighting: raw.lighting as LightingPreset, walls, room, nodes };
}

export function createDefaultScene(): StudioScene {
  const room = { ...DEFAULT_ROOM };
  const blank: StudioScene = {
    room,
    floor: "oak",
    walls: { north: "plaster", south: "plaster", east: "plaster", west: "plaster" },
    lighting: "north-light",
    nodes: [],
  };
  return reduceCalls(blank, presetCalls("living", room), null).scene;
}

export function reduceCalls(
  input: StudioScene,
  calls: AgentCall[],
  selectedId: string | null,
): { scene: StudioScene; logs: string[]; selectedId: string | null } {
  let scene: StudioScene = {
    room: { ...input.room },
    floor: input.floor,
    walls: { ...input.walls },
    lighting: input.lighting,
    nodes: input.nodes.map((n) => ({ ...n })),
  };
  let selected = selectedId;
  const logs: string[] = [];

  for (const call of calls) {
    switch (call.tool) {
      case "placeFurnitureItem": {
        if (scene.nodes.length >= MAX_PIECES) {
          logs.push("The room is at its 24 piece limit");
          break;
        }
        const spec = CATALOG[call.itemType];
        const node = clampNode(
          {
            id: makeId(),
            type: call.itemType,
            x: call.x,
            y: spec.y,
            z: call.z,
            rotationY: call.rotationY ?? 0,
            scale: call.scale ?? 1,
            color: safeColor(call.color, spec.color),
          },
          scene.room,
        );
        scene = { ...scene, nodes: [...scene.nodes, node] };
        selected = node.id;
        logs.push(`Placed ${spec.label.toLowerCase()}`);
        break;
      }
      case "modifyWallMaterial": {
        if (call.targetWallId === "all") {
          const textureType = call.textureType;
          scene = {
            ...scene,
            walls: { north: textureType, south: textureType, east: textureType, west: textureType },
          };
          logs.push(`Walls set to ${WALL_LABEL[call.textureType].toLowerCase()}`);
        } else {
          scene = { ...scene, walls: { ...scene.walls, [call.targetWallId]: call.textureType } };
          logs.push(`${call.targetWallId} wall set to ${WALL_LABEL[call.textureType].toLowerCase()}`);
        }
        break;
      }
      case "modifyFloorMaterial": {
        scene = { ...scene, floor: call.textureType };
        logs.push(`Floor set to ${FLOOR_LABEL[call.textureType].toLowerCase()}`);
        break;
      }
      case "setLighting": {
        scene = { ...scene, lighting: call.preset };
        logs.push(`Light set to ${LIGHT_LABEL[call.preset].toLowerCase()}`);
        break;
      }
      case "optimizeLayoutForSpace": {
        const nodes = optimizeLayout(scene);
        scene = { ...scene, nodes };
        const pct = Math.round(coverageRatio(nodes, scene.room) * 100);
        logs.push(`Plan rebalanced · ${pct}% floor coverage`);
        break;
      }
      case "removeFurniture": {
        const before = scene.nodes.length;
        const nodes = scene.nodes.filter((n) => {
          if (call.id) return n.id !== call.id;
          if (call.itemType) return n.type !== call.itemType;
          return true;
        });
        if (selected && !nodes.some((n) => n.id === selected)) selected = null;
        scene = { ...scene, nodes };
        logs.push(nodes.length === before ? "Nothing matched to remove" : "Removed pieces");
        break;
      }
      case "clearFurniture": {
        scene = { ...scene, nodes: [] };
        selected = null;
        logs.push("Cleared the floor");
        break;
      }
      case "setRoomSize": {
        const room = clampRoom(call.width, call.depth, scene.room.height);
        scene = { ...scene, room, nodes: scene.nodes.map((n) => clampNode(n, room)) };
        logs.push(`Room set to ${room.width.toFixed(1)} × ${room.depth.toFixed(1)} m`);
        break;
      }
      default:
        break;
    }
  }

  return { scene, logs, selectedId: selected };
}
