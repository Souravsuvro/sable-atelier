export const ITEM_TYPES = [
  "sofa",
  "armchair",
  "coffee-table",
  "dining-table",
  "dining-chair",
  "floor-lamp",
  "pendant",
  "sconce",
  "desk-lamp",
  "plant",
  "bookshelf",
  "sideboard",
  "bed",
  "rug",
  "ottoman",
  "stair",
  "roof",
  "pool",
  "parking",
  "playground",
  "garden-bed",
  "tree",
  "bench",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const FLOORS = ["oak", "walnut", "concrete", "marble", "terrazzo", "grass", "gravel"] as const;
export type FloorFinish = (typeof FLOORS)[number];

export const WALL_FINISHES = ["plaster", "limewash", "concrete", "brick", "oak-panel", "sage", "hedge"] as const;
export type WallFinish = (typeof WALL_FINISHES)[number];

export const WALLS = ["north", "south", "east", "west"] as const;
export type WallId = (typeof WALLS)[number];

export const LIGHTS = ["north-light", "golden-hour", "evening", "gallery"] as const;
export type LightingPreset = (typeof LIGHTS)[number];

export const PRESETS = ["living", "dining", "bedroom", "gallery", "moody", "office", "workspace", "front-yard", "backyard", "shell"] as const;
export type PresetName = (typeof PRESETS)[number];

export const RENDER_STATUSES = ["IN_QUEUE", "IN_PROGRESS", "COMPLETED", "FAILED"] as const;
export type RenderStatus = (typeof RENDER_STATUSES)[number];

export interface RoomSize {
  width: number;
  depth: number;
  height: number;
}

export interface FurnitureNode {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  color: string;
}

export interface StudioScene {
  room: RoomSize;
  floor: FloorFinish;
  walls: Record<WallId, WallFinish>;
  lighting: LightingPreset;
  nodes: FurnitureNode[];
}

export type SpaceKind = "interior" | "front" | "back" | "shell";

export interface SavedSpace {
  id: string;
  name: string;
  kind: SpaceKind;
  scene: StudioScene;
}

export interface Drawing {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl: string | null;
}

export type AgentCall =
  | {
      tool: "placeFurnitureItem";
      itemType: ItemType;
      x: number;
      y: number;
      z: number;
      color: string;
      rotationY?: number;
      scale?: number;
    }
  | { tool: "modifyWallMaterial"; textureType: WallFinish; targetWallId: WallId | "all" }
  | { tool: "modifyFloorMaterial"; textureType: FloorFinish }
  | { tool: "setLighting"; preset: LightingPreset }
  | { tool: "optimizeLayoutForSpace" }
  | { tool: "removeFurniture"; itemType?: ItemType; id?: string }
  | { tool: "clearFurniture" }
  | { tool: "setRoomSize"; width: number; depth: number }
  | { tool: "openSpace"; name: string; kind: SpaceKind };

export interface ChatMessage {
  id: string;
  role: "user" | "architect";
  text: string;
  source?: "grok" | "studio";
  detail?: string;
}

export interface RenderJob {
  id: string;
  status: RenderStatus;
  progress: number;
  prompt: string;
  imageUrl?: string;
  kind?: "study" | "render";
  error?: string;
  createdAt: number;
}

export function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}
