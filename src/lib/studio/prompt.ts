import { CATALOG, FLOOR_LABEL, LIGHT_LABEL, WALL_LABEL } from "@/lib/studio/catalog";
import { coverageRatio } from "@/lib/studio/layout";
import type { StudioScene } from "@/lib/studio/types";

export function sceneSummary(scene: StudioScene): string {
  return JSON.stringify({
    room: scene.room,
    floor: scene.floor,
    walls: scene.walls,
    lighting: scene.lighting,
    coverage: Number(coverageRatio(scene.nodes, scene.room).toFixed(2)),
    nodes: scene.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      x: Number(n.x.toFixed(2)),
      z: Number(n.z.toFixed(2)),
      rot: Number(n.rotationY.toFixed(2)),
      scale: Number(n.scale.toFixed(2)),
      color: n.color,
    })),
  });
}

export function architectSystem(scene: StudioScene): string {
  const halfW = scene.room.width / 2;
  const halfD = scene.room.depth / 2;
  const catalog = Object.entries(CATALOG)
    .map(([type, spec]) => `${type} (${spec.width}×${spec.depth}m)`)
    .join(", ");
  return [
    "You are the principal of Sable Atelier. You edit a building: rooms, a front yard, a backyard, and the shell.",
    "You edit the model by returning JSON only, no markdown.",
    `Shape: {"rationale": string, "calls": AgentCall[]}.`,
    "rationale is two or three sentences of architectural judgment. No headings, no bullet lists.",
    "Tools:",
    `placeFurnitureItem {itemType, x, y, z, color, rotationY?, scale?}`,
    `modifyWallMaterial {textureType, targetWallId}`,
    `modifyFloorMaterial {textureType}`,
    `setLighting {preset}`,
    `optimizeLayoutForSpace {}`,
    `removeFurniture {itemType? id?}`,
    `clearFurniture {}`,
    `setRoomSize {width, depth}`,
    `openSpace {name, kind} kind is interior, front, back, or shell.`,
    `itemType is one of: ${catalog}.`,
    "Floor finishes: oak, walnut, concrete, marble, terrazzo, grass, gravel.",
    "Wall finishes: plaster, limewash, concrete, brick, oak-panel, sage, hedge.",
    "targetWallId: north, south, east, west, or all.",
    "Lighting presets: north-light, golden-hour, evening, gallery.",
    "Light is layered. A pendant is ambient light over the room. A desk-lamp is task light. A sconce is accent light on a wall. A floor-lamp is for reading. Do not light a room with one source when the user asks for lighting.",
    "A stair is one flight with a landing logic of rise and going; place at most one stair in the shell. A roof is a gable over the footprint; place one roof in the shell, not inside a furnished room.",
    "Front yard (kind front): pool, parking, playground. Backyard (kind back): garden-bed, tree, bench. Open that space before placing outdoor pieces.",
    "When the user names a new room, call openSpace with kind interior, then furnish that room. Do not dump a bedroom into the yard.",
    "color is a hex string like #d9d0c3.",
    "y is the base height. Use 0 so pieces sit on the floor. The catalog sets the real height.",
    "rotationY 0 faces +Z. Positive rotation is counter-clockwise from above.",
    `Keep centers inside x [${(-halfW).toFixed(2)}, ${halfW.toFixed(2)}] and z [${(-halfD).toFixed(2)}, ${halfD.toFixed(2)}], with a margin so pieces do not cut the walls.`,
    "North is negative Z. At most 12 calls. At most 24 pieces in the active space.",
    "When the user asks for a new room type, openSpace if it is a different space, then clearFurniture, then set finishes, light, and place a coherent set.",
    "When they ask to tidy, call optimizeLayoutForSpace and do not restyle unless asked.",
    "Do not invent piece types.",
    `Current plan: ${sceneSummary(scene)}`,
  ].join("\n");
}

export function buildRenderPrompt(scene: StudioScene): string {
  const pieces =
    scene.nodes.length === 0
      ? "The room is empty."
      : scene.nodes
          .map((n) => `${CATALOG[n.type].label.toLowerCase()} upholstered or finished ${n.color}`)
          .join(", ");
  const walls = (["north", "south", "east", "west"] as const)
    .map((id) => `${id} ${WALL_LABEL[scene.walls[id]].toLowerCase()}`)
    .join(", ");
  return [
    "Photorealistic architectural interior photograph, 35mm lens, eye level, natural color, no people, no text, no watermark.",
    `A ${scene.room.width.toFixed(1)} by ${scene.room.depth.toFixed(1)} meter room with a ${scene.room.height.toFixed(1)} meter ceiling.`,
    `Floor: ${FLOOR_LABEL[scene.floor].toLowerCase()}. Walls: ${walls}.`,
    `Lighting: ${LIGHT_LABEL[scene.lighting].toLowerCase()}.`,
    `Furniture: ${pieces}.`,
    "Quiet luxury, precise materials, soft daylight or lamplight as specified, magazine interior, plaster and timber, uncluttered styling.",
  ].join(" ");
}
