import { CATALOG, PRESET_COPY, presetCalls } from "@/lib/studio/catalog";
import { createSpaceScene, findOpenSpot } from "@/lib/studio/layout";
import type { AgentCall, ItemType, PresetName, RoomSize, SpaceKind, StudioScene } from "@/lib/studio/types";

export const STARTERS = [
  "Lay out the front yard with a pool, parking, and a play frame",
  "Design the backyard as a garden with beds, a shade tree, and a bench",
  "Show the shell with one stair flight and a gable roof",
  "Layer the light with a pendant, a task lamp, and a sconce",
  "Open a quiet bedroom with evening light",
  "Set this up as an office",
  "A calm house",
  "Add a navy chair",
];

export interface ArchitectPlan {
  rationale: string;
  calls: AgentCall[];
}

const PATTERNS: [RegExp, ItemType][] = [
  [/swimming pools?|\bpools?\b/i, "pool"],
  [/parking bays?|car parks?|driveways?/i, "parking"],
  [/playgrounds?|play frames?|play grounds?/i, "playground"],
  [/garden beds?|flower beds?|beds of plants/i, "garden-bed"],
  [/shade trees?|\btrees?\b/i, "tree"],
  [/benches?/i, "bench"],
  [/stairs?|staircases?|flights?/i, "stair"],
  [/gable roofs?|\broofs?\b/i, "roof"],
  [/pendants?|ambient lights?/i, "pendant"],
  [/sconces?|wall lights?|accent lights?/i, "sconce"],
  [/desk lamps?|task lights?|task lamps?/i, "desk-lamp"],
  [/dining tables?/i, "dining-table"],
  [/coffee tables?/i, "coffee-table"],
  [/dining chairs?/i, "dining-chair"],
  [/arm\s?chairs?|lounge chairs?/i, "armchair"],
  [/sofas?|couches|sectionals?/i, "sofa"],
  [/bookshel(?:f|ves)|bookcases?/i, "bookshelf"],
  [/sideboards?|credenzas?/i, "sideboard"],
  [/floor lamps?/i, "floor-lamp"],
  [/plants?|olives?/i, "plant"],
  [/ottomans?|poufs?|pouffes?/i, "ottoman"],
  [/rugs?|carpets?/i, "rug"],
  [/beds?/i, "bed"],
  [/chairs?/i, "armchair"],
  [/tables?/i, "coffee-table"],
  [/lamps?/i, "floor-lamp"],
];

const COLORS: [RegExp, string][] = [
  [/ivory|cream|white/i, "#f3eee6"],
  [/charcoal|black/i, "#1c1a17"],
  [/navy|blue/i, "#243044"],
  [/sage|olive|green/i, "#3f5346"],
  [/terracotta|rust|red/i, "#8f3d36"],
  [/brass|gold/i, "#b8893d"],
  [/walnut|brown/i, "#6b4a32"],
  [/sand|beige|tan/i, "#d9c7a6"],
  [/grey|gray/i, "#8a847c"],
  [/blush|pink/i, "#d7b2a6"],
];

function mentioned(text: string): ItemType[] {
  let rest = text;
  const found: ItemType[] = [];
  for (const [re, type] of PATTERNS) {
    if (new RegExp(re.source, "i").test(rest)) {
      found.push(type);
      rest = rest.replace(new RegExp(re.source, "ig"), " ");
    }
  }
  return found;
}

function mentionedColor(text: string): string | null {
  for (const [re, color] of COLORS) {
    if (re.test(text)) return color;
  }
  return null;
}

function tweakCalls(q: string): AgentCall[] {
  const calls: AgentCall[] = [];
  if (/marble/.test(q)) calls.push({ tool: "modifyFloorMaterial", textureType: "marble" });
  else if (/terrazzo/.test(q)) calls.push({ tool: "modifyFloorMaterial", textureType: "terrazzo" });
  else if (/concrete floor|honed floor/.test(q)) calls.push({ tool: "modifyFloorMaterial", textureType: "concrete" });
  else if (/walnut floor|dark floor/.test(q)) calls.push({ tool: "modifyFloorMaterial", textureType: "walnut" });
  else if (/oak floor|timber floor|wood floor/.test(q)) calls.push({ tool: "modifyFloorMaterial", textureType: "oak" });

  if (/brick/.test(q)) {
    const target = /all walls/.test(q) ? "all" : /south/.test(q) ? "south" : /east/.test(q) ? "east" : /west/.test(q) ? "west" : "north";
    calls.push({ tool: "modifyWallMaterial", textureType: "brick", targetWallId: target });
  } else if (/oak panel|timber wall|wood wall/.test(q)) {
    calls.push({ tool: "modifyWallMaterial", textureType: "oak-panel", targetWallId: "north" });
  } else if (/sage/.test(q) && /wall|wash|paint/.test(q)) {
    calls.push({ tool: "modifyWallMaterial", textureType: "sage", targetWallId: "all" });
  } else if (/limewash/.test(q)) {
    calls.push({ tool: "modifyWallMaterial", textureType: "limewash", targetWallId: "all" });
  } else if (/concrete wall|board-formed/.test(q)) {
    calls.push({ tool: "modifyWallMaterial", textureType: "concrete", targetWallId: "all" });
  } else if (/plaster/.test(q)) {
    calls.push({ tool: "modifyWallMaterial", textureType: "plaster", targetWallId: "all" });
  }

  if (/golden hour|sunset|warm light/.test(q)) calls.push({ tool: "setLighting", preset: "golden-hour" });
  else if (/evening|night|lamplight|moody light/.test(q)) calls.push({ tool: "setLighting", preset: "evening" });
  else if (/gallery light|flat light/.test(q)) calls.push({ tool: "setLighting", preset: "gallery" });
  else if (/north light|daylight/.test(q)) calls.push({ tool: "setLighting", preset: "north-light" });

  return calls;
}

function pickPreset(q: string): PresetName {
  if (/front yard|frontyard|swimming|driveway/.test(q)) return "front-yard";
  if (/back\s?yard|garden/.test(q)) return "backyard";
  if (/shell|gable|staircase|the stairs? and/.test(q)) return "shell";
  if (/workspace|home office|desk/.test(q)) return "workspace";
  if (/office|meeting room|studio office/.test(q)) return "office";
  if (/bedroom|sleep/.test(q)) return "bedroom";
  if (/dining|supper|kitchen/.test(q)) return "dining";
  if (/gallery|museum|minimal/.test(q)) return "gallery";
  if (/moody|evening lounge|night/.test(q)) return "moody";
  return "living";
}

function spaceFor(preset: PresetName): { name: string; kind: SpaceKind } | null {
  if (preset === "front-yard") return { name: "Front yard", kind: "front" };
  if (preset === "backyard") return { name: "Backyard", kind: "back" };
  if (preset === "shell") return { name: "Shell", kind: "shell" };
  if (preset === "bedroom") return { name: "Bedroom", kind: "interior" };
  if (preset === "dining") return { name: "Dining", kind: "interior" };
  if (preset === "office") return { name: "Office", kind: "interior" };
  if (preset === "workspace") return { name: "Workspace", kind: "interior" };
  if (preset === "living") return { name: "Living", kind: "interior" };
  return null;
}

function roomFor(kind: SpaceKind): RoomSize {
  return createSpaceScene(kind).room;
}

function describe(calls: AgentCall[]): string {
  const bits: string[] = [];
  for (const call of calls) {
    if (call.tool === "placeFurnitureItem") bits.push(`place a ${CATALOG[call.itemType].label.toLowerCase()}`);
    else if (call.tool === "removeFurniture") bits.push(call.itemType ? `remove the ${call.itemType.replace("-", " ")}` : "remove a piece");
    else if (call.tool === "modifyFloorMaterial") bits.push(`change the floor to ${call.textureType}`);
    else if (call.tool === "modifyWallMaterial") bits.push(`retint the ${call.targetWallId === "all" ? "walls" : `${call.targetWallId} wall`}`);
    else if (call.tool === "setLighting") bits.push(`shift the light`);
    else if (call.tool === "optimizeLayoutForSpace") bits.push("pull the plan back into a walkable arrangement");
    else if (call.tool === "clearFurniture") bits.push("clear the floor");
    else if (call.tool === "setRoomSize") bits.push("resize the room");
    else if (call.tool === "openSpace") bits.push(`open ${call.name.toLowerCase()}`);
  }
  if (bits.length === 0) return "Nothing in that note changes the model. Try a mood, a finish, or a piece.";
  const unique = [...new Set(bits)].slice(0, 4);
  return `I'll ${unique.join(", ")}. The rest of the shell stays as it is.`;
}

export function interpretBrief(text: string, scene: StudioScene): ArchitectPlan {
  const q = text.toLowerCase();
  const adding = /\b(add|place|put|drop|need|insert|include|bring)\b/.test(q);
  const removing = /\b(remove|delete|take away|get rid)\b/.test(q);
  if (/pool|parking|playground|front yard|frontyard|driveway|back\s?yard|garden|stair|roof|gable|shell/.test(q)) {
    const outdoor = /pool|parking|playground|front yard|frontyard|driveway/.test(q)
      ? { name: "Front yard", kind: "front" as const, preset: "front-yard" as const }
      : /back\s?yard|garden/.test(q)
        ? { name: "Backyard", kind: "back" as const, preset: "backyard" as const }
        : { name: "Shell", kind: "shell" as const, preset: "shell" as const };
    const whole = /lay out|set up|design the|scheme|front yard|back\s?yard|the garden|the shell|stairs and roof|roof and stair/.test(q);
    const room = roomFor(outdoor.kind);
    const calls: AgentCall[] = [{ tool: "openSpace", name: outdoor.name, kind: outdoor.kind }];
    let scheme = whole;
    if (whole) calls.push(...presetCalls(outdoor.preset, room));
    else {
      for (const type of mentioned(q)) {
        calls.push({ tool: "placeFurnitureItem", itemType: type, x: 0, y: 0, z: 0.4, color: mentionedColor(q) ?? CATALOG[type].color });
      }
      if (calls.length === 1) {
        calls.push(...presetCalls(outdoor.preset, room));
        scheme = true;
      }
    }
    const placed = calls.filter((call) => call.tool === "placeFurnitureItem").length;
    return {
      rationale: scheme ? PRESET_COPY[outdoor.preset] : `I'll open the ${outdoor.name.toLowerCase()} and place ${placed === 1 ? "that" : "what you named"}.`,
      calls,
    };
  }

  const lights = mentioned(q).filter((type) => type === "pendant" || type === "sconce" || type === "desk-lamp" || type === "floor-lamp");
  if (lights.length > 0 && /light|lamp|pendant|sconce/.test(q)) {
    const calls: AgentCall[] = [];
    let nodes = scene.nodes;
    for (const type of lights) {
      const spot = findOpenSpot(nodes, type, scene.room);
      calls.push({
        tool: "placeFurnitureItem",
        itemType: type,
        x: spot.x,
        y: 0,
        z: spot.z,
        color: CATALOG[type].color,
      });
      nodes = [...nodes, { id: "pending", type, x: spot.x, y: 0, z: spot.z, rotationY: 0, scale: 1, color: CATALOG[type].color }];
    }
    return {
      rationale: "Light works in layers. A pendant is the ambient light, a task lamp sits where someone works or reads, and a sconce washes the wall. I'll add the ones you named and leave the furniture.",
      calls,
    };
  }

  const styling = /\b(japandi|scandi|scandinavian|moody|gallery|bedroom|dining room|living room|lounge|restyle|redesign|make this|turn this|scheme|office|workspace|home office|house|meeting room|kitchen|lighting)\b/.test(q);

  if (/reading corner|reading nook|place to read/.test(q)) {
    const calls: AgentCall[] = [];
    const color = mentionedColor(q);
    const want: ItemType[] = [];
    if (!scene.nodes.some((n) => n.type === "armchair")) want.push("armchair");
    if (!scene.nodes.some((n) => n.type === "floor-lamp")) want.push("floor-lamp");
    if (!scene.nodes.some((n) => n.type === "bookshelf")) want.push("bookshelf");
    let nodes = scene.nodes;
    for (const type of want) {
      const spot = findOpenSpot(nodes, type, scene.room);
      const call: AgentCall = {
        tool: "placeFurnitureItem",
        itemType: type,
        x: spot.x,
        y: 0,
        z: spot.z,
        color: color ?? CATALOG[type].color,
      };
      calls.push(call);
      nodes = [
        ...nodes,
        {
          id: "pending",
          type,
          x: spot.x,
          y: 0,
          z: spot.z,
          rotationY: 0,
          scale: 1,
          color: CATALOG[type].color,
        },
      ];
    }
    calls.push({ tool: "setLighting", preset: "evening" });
    return {
      rationale: "A reading corner needs a chair, a lamp at the shoulder, and a case of books. I'll keep what's already in the room and warm the light.",
      calls,
    };
  }

  if (styling) {
    const name = pickPreset(q);
    const space = spaceFor(name);
    const calls: AgentCall[] = [];
    if (space && /bedroom|dining|kitchen|office|workspace|living|house/.test(q)) {
      calls.push({ tool: "openSpace", name: name === "dining" && /kitchen/.test(q) ? "Kitchen" : space.name, kind: space.kind });
    }
    calls.push(...presetCalls(name, space ? roomFor(space.kind) : scene.room), ...tweakCalls(q));
    return { rationale: PRESET_COPY[name], calls };
  }

  if (/\b(clear|empty|start over|strip)\b/.test(q) && !adding) {
    return {
      rationale: "I'll clear the floor and leave the shell, the light, and the finishes untouched.",
      calls: [{ tool: "clearFurniture" }],
    };
  }

  if (/tidy|optimi|rebalance|arrange|more space|too tight|crowded|spread out|compose the plan/.test(q) && !adding) {
    return {
      rationale: "I'll pull pieces off the walk and set storage back to the walls. Colors stay. Coverage is measured after the move.",
      calls: [...tweakCalls(q), { tool: "optimizeLayoutForSpace" }],
    };
  }

  const tweaks = tweakCalls(q);
  if (adding || removing || tweaks.length > 0) {
    const calls: AgentCall[] = [...tweaks];
    const addAt = q.search(/\b(add|place|put|drop|need|insert|include|bring)\b/);
    const removeAt = q.search(/\b(remove|delete|take away|get rid)\b/);
    let addTypes: ItemType[] = [];
    let removeTypes: ItemType[] = [];
    if (adding && removing && addAt >= 0 && removeAt >= 0) {
      if (removeAt < addAt) {
        removeTypes = mentioned(q.slice(removeAt, addAt));
        addTypes = mentioned(q.slice(addAt));
      } else {
        addTypes = mentioned(q.slice(addAt, removeAt));
        removeTypes = mentioned(q.slice(removeAt));
      }
    } else if (removing) {
      removeTypes = mentioned(q);
    } else if (adding) {
      addTypes = mentioned(q);
    }
    for (const type of removeTypes) calls.push({ tool: "removeFurniture", itemType: type });
    const color = mentionedColor(q);
    let nodes = scene.nodes.filter((n) => !removeTypes.includes(n.type));
    for (const type of addTypes) {
      const spot = findOpenSpot(nodes, type, scene.room);
      calls.push({
        tool: "placeFurnitureItem",
        itemType: type,
        x: Math.round(spot.x * 100) / 100,
        y: 0,
        z: Math.round(spot.z * 100) / 100,
        color: color ?? CATALOG[type].color,
      });
      nodes = [
        ...nodes,
        { id: "pending", type, x: spot.x, y: 0, z: spot.z, rotationY: 0, scale: 1, color: CATALOG[type].color },
      ];
    }
    if (calls.length > 0) return { rationale: describe(calls), calls };
  }

  return {
    rationale:
      "I can restyle the whole room, place or remove a piece, change a finish, or rebalance what's already here. Try “moody evening lounge”, “marble floor”, or “add a navy sofa”.",
    calls: [],
  };
}
