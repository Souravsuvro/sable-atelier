import {
  FLOORS,
  ITEM_TYPES,
  LIGHTS,
  WALLS,
  WALL_FINISHES,
  oneOf,
  type AgentCall,
  type FloorFinish,
  type ItemType,
  type LightingPreset,
  type WallFinish,
  type WallId,
} from "@/lib/studio/types";

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

const ITEM_ALIAS: Record<string, ItemType> = {
  couch: "sofa",
  sectional: "sofa",
  "lounge-chair": "armchair",
  chair: "armchair",
  coffeetable: "coffee-table",
  table: "coffee-table",
  lamp: "floor-lamp",
  tree: "plant",
  olive: "plant",
  bookcase: "bookshelf",
  shelf: "bookshelf",
  bookshelves: "bookshelf",
  credenza: "sideboard",
  cabinet: "sideboard",
  carpet: "rug",
  pouf: "ottoman",
  pouffe: "ottoman",
};

function itemType(value: unknown): ItemType | null {
  if (oneOf(ITEM_TYPES, value)) return value;
  if (typeof value !== "string") return null;
  const key = value.toLowerCase().trim().replace(/[\s_]+/g, "-");
  if (oneOf(ITEM_TYPES, key)) return key;
  return ITEM_ALIAS[key] ?? null;
}

function wallFinish(value: unknown): WallFinish | null {
  if (oneOf(WALL_FINISHES, value)) return value;
  if (typeof value !== "string") return null;
  const key = value.toLowerCase();
  if (key.includes("brick")) return "brick";
  if (key.includes("oak") || key.includes("timber") || key.includes("wood")) return "oak-panel";
  if (key.includes("sage") || key.includes("green")) return "sage";
  if (key.includes("lime")) return "limewash";
  if (key.includes("concrete") || key.includes("board")) return "concrete";
  if (key.includes("plaster") || key.includes("white")) return "plaster";
  return null;
}

function floorFinish(value: unknown): FloorFinish | null {
  if (oneOf(FLOORS, value)) return value;
  if (typeof value !== "string") return null;
  const key = value.toLowerCase();
  if (key.includes("marble") || key.includes("stone")) return "marble";
  if (key.includes("terrazzo") || key.includes("tile")) return "terrazzo";
  if (key.includes("concrete")) return "concrete";
  if (key.includes("walnut")) return "walnut";
  if (key.includes("oak") || key.includes("wood") || key.includes("timber")) return "oak";
  return null;
}

function lightPreset(value: unknown): LightingPreset | null {
  if (oneOf(LIGHTS, value)) return value;
  if (typeof value !== "string") return null;
  const key = value.toLowerCase();
  if (key.includes("gold") || key.includes("sunset") || key.includes("warm")) return "golden-hour";
  if (key.includes("even") || key.includes("night") || key.includes("lamp") || key.includes("moody")) return "evening";
  if (key.includes("galler") || key.includes("flat")) return "gallery";
  if (key.includes("north") || key.includes("day")) return "north-light";
  return null;
}

function wallTarget(value: unknown): WallId | "all" | null {
  if (value === "all" || value === "every" || value === "room") return "all";
  if (oneOf(WALLS, value)) return value;
  if (typeof value !== "string") return null;
  const key = value.toLowerCase();
  if (key.includes("north")) return "north";
  if (key.includes("south")) return "south";
  if (key.includes("east")) return "east";
  if (key.includes("west")) return "west";
  if (key.includes("all")) return "all";
  return null;
}

const TOOL_ALIAS: Record<string, AgentCall["tool"]> = {
  placefurnitureitem: "placeFurnitureItem",
  place: "placeFurnitureItem",
  modifywallmaterial: "modifyWallMaterial",
  setwall: "modifyWallMaterial",
  modifyfloormaterial: "modifyFloorMaterial",
  setfloor: "modifyFloorMaterial",
  setlighting: "setLighting",
  optimizelayoutforspace: "optimizeLayoutForSpace",
  optimize: "optimizeLayoutForSpace",
  removefurniture: "removeFurniture",
  clearfurniture: "clearFurniture",
  clear: "clearFurniture",
  setroomsize: "setRoomSize",
};

function parseCall(value: unknown): AgentCall | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  const rawTool = String(o.tool ?? o.name ?? "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();
  const tool = TOOL_ALIAS[rawTool];
  if (!tool) return null;

  if (tool === "placeFurnitureItem") {
    const item = itemType(o.itemType ?? o.type ?? o.item);
    const x = num(o.x);
    const z = num(o.z);
    const y = num(o.y) ?? 0;
    if (!item || x === null || z === null) return null;
    const rotationY = num(o.rotationY ?? o.rotation);
    const scale = num(o.scale);
    const color = typeof o.color === "string" ? o.color : "#d9d0c3";
    return {
      tool,
      itemType: item,
      x,
      y,
      z,
      color,
      ...(rotationY !== null ? { rotationY } : {}),
      ...(scale !== null ? { scale } : {}),
    };
  }
  if (tool === "modifyWallMaterial") {
    const textureType = wallFinish(o.textureType ?? o.material ?? o.finish);
    const targetWallId = wallTarget(o.targetWallId ?? o.targetWall ?? o.wall ?? "all");
    if (!textureType || !targetWallId) return null;
    return { tool, textureType, targetWallId };
  }
  if (tool === "modifyFloorMaterial") {
    const textureType = floorFinish(o.textureType ?? o.material ?? o.finish);
    if (!textureType) return null;
    return { tool, textureType };
  }
  if (tool === "setLighting") {
    const preset = lightPreset(o.preset ?? o.lighting);
    if (!preset) return null;
    return { tool, preset };
  }
  if (tool === "optimizeLayoutForSpace" || tool === "clearFurniture") return { tool };
  if (tool === "removeFurniture") {
    const item = itemType(o.itemType ?? o.type);
    const id = typeof o.id === "string" ? o.id : undefined;
    if (!item && !id) return null;
    return { tool, ...(item ? { itemType: item } : {}), ...(id ? { id } : {}) };
  }
  const width = num(o.width);
  const depth = num(o.depth);
  if (width === null || depth === null) return null;
  return { tool: "setRoomSize", width, depth };
}

export function parseCalls(raw: unknown): AgentCall[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentCall[] = [];
  for (const item of raw) {
    const call = parseCall(item);
    if (call) out.push(call);
    if (out.length >= 16) break;
  }
  return out;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced?.[1] ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The architect reply was not a plan.");
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}
