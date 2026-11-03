import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

function textureFrom(draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat = 2): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare a material.");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.repeat.set(repeat, repeat);
  return tex;
}

function rand(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function oak(ctx: CanvasRenderingContext2D, size: number, dark: boolean) {
  const base = dark ? "#5a3d28" : "#c4a06a";
  const alt = dark ? "#6b4a32" : "#d2b07a";
  const seam = dark ? "#3a281c" : "#8d6240";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const rows = 7;
  for (let i = 0; i < rows; i += 1) {
    const y = (size / rows) * i;
    const h = size / rows;
    ctx.fillStyle = i % 2 === 0 ? base : alt;
    ctx.fillRect(0, y + 1, size, h - 3);
    ctx.strokeStyle = "rgba(60,30,10,0.18)";
    ctx.beginPath();
    for (let x = 0; x <= size; x += 6) {
      const yy = y + h * 0.45 + Math.sin(x * 0.03 + i) * 4;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
    ctx.fillStyle = seam;
    ctx.fillRect(0, y + h - 2, size, 2);
  }
}

function concrete(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#c5c0b6";
  ctx.fillRect(0, 0, size, size);
  const next = rand(42);
  for (let i = 0; i < 1800; i += 1) {
    const g = 150 + Math.floor(next() * 70);
    ctx.fillStyle = `rgba(${g},${g - 4},${g - 8},0.45)`;
    ctx.fillRect(next() * size, next() * size, next() * 3 + 1, next() * 3 + 1);
  }
}

function marble(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#efe8dc";
  ctx.fillRect(0, 0, size, size);
  const next = rand(7);
  for (let i = 0; i < 14; i += 1) {
    ctx.strokeStyle = `rgba(120, 120, 116, ${0.18 + next() * 0.25})`;
    ctx.lineWidth = 1 + next() * 2;
    ctx.beginPath();
    ctx.moveTo(next() * size, next() * size);
    ctx.bezierCurveTo(next() * size, next() * size, next() * size, next() * size, next() * size, next() * size);
    ctx.stroke();
  }
}

function terrazzo(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#e6dfd2";
  ctx.fillRect(0, 0, size, size);
  const next = rand(11);
  const chips = ["#b8893d", "#3f5346", "#8f3d36", "#f3eee6", "#243044", "#6b4a32"];
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = chips[Math.floor(next() * chips.length)] ?? "#b8893d";
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(next() * size, next() * size, 4 + next() * 14, 3 + next() * 8, next() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function brick(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#e7dfd4";
  ctx.fillRect(0, 0, size, size);
  const bh = 36;
  const bw = 72;
  for (let row = 0; row < size / bh; row += 1) {
    const offset = row % 2 === 0 ? 0 : bw / 2;
    for (let col = -1; col < size / bw + 1; col += 1) {
      const shade = 130 + ((row * 3 + col * 5) % 4) * 8;
      ctx.fillStyle = `rgb(${shade + 20}, ${shade * 0.55}, ${shade * 0.42})`;
      ctx.fillRect(col * bw + offset + 2, row * bh + 2, bw - 4, bh - 4);
    }
  }
}

function panel(ctx: CanvasRenderingContext2D, size: number) {
  oak(ctx, size, false);
  ctx.fillStyle = "rgba(60,30,10,0.15)";
  for (let x = 0; x < size; x += size / 4) ctx.fillRect(x, 0, 3, size);
}

function noise(ctx: CanvasRenderingContext2D, size: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  const next = rand(3);
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = `rgba(80,70,60,${next() * 0.08})`;
    ctx.fillRect(next() * size, next() * size, 2, 2);
  }
}

function make(key: string): THREE.CanvasTexture {
  switch (key) {
    case "oak":
      return textureFrom((ctx, size) => oak(ctx, size, false), 2);
    case "walnut":
      return textureFrom((ctx, size) => oak(ctx, size, true), 2);
    case "concrete":
      return textureFrom(concrete, 2);
    case "marble":
      return textureFrom(marble, 1.5);
    case "terrazzo":
      return textureFrom(terrazzo, 1.5);
    case "brick":
      return textureFrom(brick, 2);
    case "oak-panel":
      return textureFrom(panel, 1);
    default:
      return textureFrom(noise, 2);
  }
}

export function getMaterialTexture(key: string): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = make(key);
  cache.set(key, tex);
  return tex;
}
