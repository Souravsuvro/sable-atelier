import type { AgentCall, FloorFinish, ItemType, LightingPreset, PresetName, RoomSize, WallFinish, WallId } from "@/lib/studio/types";

export interface PieceSpec {
  label: string;
  width: number;
  height: number;
  depth: number;
  color: string;
  y: number;
  blurb: string;
}

export const CATALOG: Record<ItemType, PieceSpec> = {
  sofa: { label: "Sofa", width: 2.15, height: 0.82, depth: 0.92, color: "#d9d0c3", y: 0, blurb: "Low three-seat" },
  armchair: { label: "Lounge chair", width: 0.82, height: 0.78, depth: 0.84, color: "#3f5346", y: 0, blurb: "Deep seat" },
  "coffee-table": { label: "Coffee table", width: 1.15, height: 0.38, depth: 0.62, color: "#6e4e34", y: 0, blurb: "Timber top" },
  "dining-table": { label: "Dining table", width: 1.7, height: 0.75, depth: 0.9, color: "#6e4e34", y: 0, blurb: "Seats four" },
  "dining-chair": { label: "Dining chair", width: 0.46, height: 0.86, depth: 0.5, color: "#e6e0d4", y: 0, blurb: "Slim frame" },
  "floor-lamp": { label: "Floor lamp", width: 0.38, height: 1.62, depth: 0.38, color: "#221f1c", y: 0, blurb: "Paper shade" },
  plant: { label: "Olive tree", width: 0.55, height: 1.35, depth: 0.55, color: "#3f5344", y: 0, blurb: "In a clay pot" },
  bookshelf: { label: "Bookcase", width: 1.05, height: 1.9, depth: 0.38, color: "#5c4332", y: 0, blurb: "Five shelves" },
  sideboard: { label: "Sideboard", width: 1.5, height: 0.72, depth: 0.46, color: "#4a4038", y: 0, blurb: "Two doors" },
  bed: { label: "Bed", width: 1.7, height: 1.05, depth: 2.15, color: "#e4dccf", y: 0, blurb: "Queen, low frame" },
  rug: { label: "Rug", width: 2.6, height: 0.02, depth: 1.7, color: "#8f3d36", y: 0, blurb: "Bound edge" },
  ottoman: { label: "Ottoman", width: 0.7, height: 0.4, depth: 0.5, color: "#6e5844", y: 0, blurb: "Upholstered" },
};

export const DEFAULT_ROOM: RoomSize = { width: 6.2, depth: 4.8, height: 2.8 };

export const FLOOR_LABEL: Record<FloorFinish, string> = {
  oak: "White oak",
  walnut: "Walnut",
  concrete: "Honed concrete",
  marble: "Pale marble",
  terrazzo: "Warm terrazzo",
};

export const WALL_LABEL: Record<WallFinish, string> = {
  plaster: "Warm plaster",
  limewash: "Limewash",
  concrete: "Board-formed",
  brick: "Soft brick",
  "oak-panel": "Oak panel",
  sage: "Sage wash",
};

export const LIGHT_LABEL: Record<LightingPreset, string> = {
  "north-light": "North light",
  "golden-hour": "Golden hour",
  evening: "Evening",
  gallery: "Gallery",
};

export const LIGHT_BLURB: Record<LightingPreset, string> = {
  "north-light": "Even daylight, cool and truthful.",
  "golden-hour": "Low sun from the west, long shadows.",
  evening: "The lamps carry the room.",
  gallery: "Flat light. Nothing is flattered.",
};

export const FLOOR_SWATCH: Record<FloorFinish, string> = {
  oak: "repeating-linear-gradient(90deg, #c4a574 0 14px, #a97850 14px 16px, #b88960 16px 30px)",
  walnut: "repeating-linear-gradient(90deg, #6b4a32 0 14px, #4a3222 14px 16px, #5c3d2a 16px 30px)",
  concrete: "linear-gradient(180deg, #c8c4bc, #b7b2a8)",
  marble: "linear-gradient(135deg, #f3eee6 0%, #e4ddd2 42%, #cfc8be 43%, #f7f3ec 70%, #ddd4c8 100%)",
  terrazzo: "radial-gradient(circle at 20% 30%, #b8893d 0 6px, transparent 7px), radial-gradient(circle at 70% 60%, #3f5346 0 5px, transparent 6px), radial-gradient(circle at 40% 80%, #8f3d36 0 4px, transparent 5px), #e7e0d4",
};

export const WALL_SWATCH: Record<WallFinish, string> = {
  plaster: "linear-gradient(180deg, #f3eee6, #e4dccf)",
  limewash: "linear-gradient(180deg, #efe6d4, #e0d3ba)",
  concrete: "linear-gradient(180deg, #d5d0c8, #bdb8ae)",
  brick: "repeating-linear-gradient(180deg, #8d5346 0 8px, #f3eee6 8px 11px), repeating-linear-gradient(90deg, transparent 0 18px, rgba(22,20,17,0.18) 18px 20px)",
  "oak-panel": "repeating-linear-gradient(90deg, #a97850 0 10px, #8a5a38 10px 12px)",
  sage: "linear-gradient(180deg, #d5ddd2, #c5cfc4)",
};

export const PRESET_LABEL: Record<PresetName, string> = {
  living: "House",
  dining: "Dining",
  bedroom: "Sleep",
  gallery: "Gallery",
  moody: "Moody",
  office: "Office",
  workspace: "Workspace",
};

export const PRESET_COPY: Record<PresetName, string> = {
  living:
    "A north-lit living room. Low seating sits off the north wall, timber in the middle, storage kept to the flanks so the center stays open.",
  dining: "The table is centered and the chairs are pulled in. A sideboard holds the edge so the meal has a back wall.",
  bedroom: "The bed takes the north wall. Warm light, a rug under the sleep zone, and one chair left for the morning.",
  gallery: "Almost empty on purpose. One sofa, one table, concrete underfoot, and light that does not flatter.",
  moody: "Evening, walnut, and a darker cloth. The lamps do the work and the walls stay quiet.",
  office:
    "A work table in the middle, two chairs for a conversation, and storage on the walls. The floor is walnut so the room reads as an office, not a dining room.",
  workspace:
    "One desk on the north wall, one chair, a lamp, and a case of books. Enough for a day of work, and a clear path behind the chair.",
};

export const PAINTS = ["#f3eee6", "#d9c7a6", "#3f5346", "#243044", "#8f3d36", "#1c1a17", "#b8893d", "#6b4a32"];

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function place(
  itemType: ItemType,
  x: number,
  z: number,
  rotationY = 0,
  color?: string,
): AgentCall {
  return {
    tool: "placeFurnitureItem",
    itemType,
    x: round(x),
    y: CATALOG[itemType].y,
    z: round(z),
    rotationY: round(rotationY),
    scale: 1,
    color: color ?? CATALOG[itemType].color,
  };
}

function shell(
  floor: FloorFinish,
  wall: WallFinish,
  light: LightingPreset,
  accent?: { wall: WallId; finish: WallFinish },
): AgentCall[] {
  const calls: AgentCall[] = [
    { tool: "modifyFloorMaterial", textureType: floor },
    { tool: "modifyWallMaterial", textureType: wall, targetWallId: "all" },
    { tool: "setLighting", preset: light },
    { tool: "clearFurniture" },
  ];
  if (accent) {
    calls.push({ tool: "modifyWallMaterial", textureType: accent.finish, targetWallId: accent.wall });
  }
  return calls;
}

export function presetCalls(name: PresetName, room: RoomSize): AgentCall[] {
  const hw = room.width / 2;
  const hd = room.depth / 2;
  const sofaZ = -hd + 0.1 + CATALOG.sofa.depth / 2;

  if (name === "living") {
    return [
      ...shell("oak", "plaster", "north-light"),
      place("rug", 0, sofaZ + 0.85, 0, "#8f3d36"),
      place("sofa", 0, sofaZ, 0, "#d9d0c3"),
      place("coffee-table", 0, sofaZ + 1.2, 0, "#6e4e34"),
      place("armchair", -1.7, sofaZ + 1.35, 0.65, "#3f5346"),
      place("armchair", 1.65, sofaZ + 1.15, -0.55, "#3f5346"),
      place("floor-lamp", hw - 0.42, -hd + 0.42, 0, "#221f1c"),
      place("plant", -hw + 0.48, hd - 0.48, 0, "#3f5344"),
      place("bookshelf", hw - 0.1 - CATALOG.bookshelf.depth / 2, 0.7, -Math.PI / 2, "#5c4332"),
      place("sideboard", -hw + 0.1 + CATALOG.sideboard.depth / 2, 0.15, Math.PI / 2, "#4a4038"),
    ];
  }

  if (name === "dining") {
    const tz = 0.1;
    return [
      ...shell("oak", "limewash", "north-light"),
      place("rug", 0, tz, 0, "#c4b5a0"),
      place("dining-table", 0, tz, 0, "#6e4e34"),
      place("dining-chair", -0.45, tz - 0.78, 0, "#e6e0d4"),
      place("dining-chair", 0.45, tz - 0.78, 0, "#e6e0d4"),
      place("dining-chair", -0.45, tz + 0.78, Math.PI, "#e6e0d4"),
      place("dining-chair", 0.45, tz + 0.78, Math.PI, "#e6e0d4"),
      place("sideboard", hw - 0.1 - CATALOG.sideboard.depth / 2, -0.85, -Math.PI / 2, "#4a4038"),
      place("floor-lamp", -hw + 0.42, -hd + 0.42, 0, "#221f1c"),
      place("plant", hw - 0.48, hd - 0.48, 0, "#3f5344"),
    ];
  }

  if (name === "bedroom") {
    const bedZ = -hd + 0.12 + CATALOG.bed.depth / 2;
    return [
      ...shell("oak", "plaster", "golden-hour", { wall: "north", finish: "sage" }),
      place("rug", 0, bedZ + 0.35, 0, "#3f5346"),
      place("bed", 0, bedZ, 0, "#e4dccf"),
      place("floor-lamp", -1.4, bedZ - 0.35, 0, "#221f1c"),
      place("plant", hw - 0.48, -hd + 0.5, 0, "#3f5344"),
      place("sideboard", 0, hd - 0.1 - CATALOG.sideboard.depth / 2, Math.PI, "#4a4038"),
      place("armchair", 1.85, 1.15, -2.2, "#6e5844"),
    ];
  }

  if (name === "gallery") {
    return [
      ...shell("concrete", "plaster", "gallery", { wall: "north", finish: "oak-panel" }),
      place("rug", 0, -0.2, 0, "#d9d0c3"),
      place("sofa", 0, sofaZ, 0, "#f3eee6"),
      place("coffee-table", 0, sofaZ + 1.2, 0, "#2a261f"),
      place("armchair", 1.7, sofaZ + 1.2, -0.4, "#1c1a17"),
      place("bookshelf", hw - 0.1 - CATALOG.bookshelf.depth / 2, 0.4, -Math.PI / 2, "#5c4332"),
      place("plant", -hw + 0.48, hd - 0.48, 0, "#3f5344"),
    ];
  }

  if (name === "office") {
    const tz = 0.15;
    return [
      ...shell("walnut", "limewash", "north-light", { wall: "north", finish: "oak-panel" }),
      place("rug", 0, tz, 0, "#243044"),
      place("dining-table", 0, tz, 0, "#4a3222"),
      place("dining-chair", -0.55, tz + 0.78, Math.PI, "#e6e0d4"),
      place("dining-chair", 0.55, tz + 0.78, Math.PI, "#1c1a17"),
      place("sideboard", 0, -hd + 0.12 + CATALOG.sideboard.depth / 2, 0, "#2a261f"),
      place("bookshelf", hw - 0.12 - CATALOG.bookshelf.depth / 2, 0.15, -Math.PI / 2, "#5c4332"),
      place("floor-lamp", -hw + 0.42, hd - 0.48, 0, "#221f1c"),
      place("plant", hw - 0.48, -hd + 0.5, 0, "#3f5344"),
    ];
  }

  if (name === "workspace") {
    const deskZ = -hd + 0.16 + CATALOG["dining-table"].depth / 2;
    return [
      ...shell("oak", "plaster", "north-light", { wall: "north", finish: "sage" }),
      place("dining-table", 0, deskZ, 0, "#6e4e34"),
      place("dining-chair", 0, deskZ + 0.78, Math.PI, "#3f5346"),
      place("bookshelf", -hw + 0.12 + CATALOG.bookshelf.depth / 2, 0.35, Math.PI / 2, "#5c4332"),
      place("floor-lamp", 1.2, deskZ + 0.05, 0, "#221f1c"),
      place("plant", hw - 0.48, hd - 0.48, 0, "#3f5344"),
      place("ottoman", 1.45, 0.85, 0, "#6e5844"),
    ];
  }

  return [
    ...shell("walnut", "concrete", "evening"),
    place("rug", 0, sofaZ + 0.8, 0, "#2c2422"),
    place("sofa", 0, sofaZ, 0, "#2a2e33"),
    place("coffee-table", 0, sofaZ + 1.2, 0, "#4a3222"),
    place("armchair", -1.65, sofaZ + 1.3, 0.7, "#3a332c"),
    place("floor-lamp", hw - 0.42, -hd + 0.42, 0, "#c8c2b8"),
    place("floor-lamp", -hw + 0.42, hd - 0.42, 0, "#c8c2b8"),
    place("plant", hw - 0.48, hd - 0.48, 0, "#3f5344"),
    place("ottoman", 0.85, sofaZ + 1.15, 0.2, "#3a332c"),
  ];
}
