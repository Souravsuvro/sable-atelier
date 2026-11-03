import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useRig } from "@/components/studio/rig";
import { CATALOG } from "@/lib/studio/catalog";
import { useStudio } from "@/lib/studio/store";
import type { FurnitureNode, ItemType } from "@/lib/studio/types";

const WOOD = "#6b4a32";
const METAL = "#c8c2b8";
const INK = "#221f1c";
const BRASS = "#b8893d";

function Sharp({
  args,
  position,
  color,
  roughness = 0.78,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  shadow = true,
}: {
  args: [number, number, number];
  position: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shadow?: boolean;
}) {
  return (
    <mesh position={position} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive ?? "#000000"} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

function Leg({ position, height, radius = 0.035, color = WOOD }: { position: [number, number, number]; height: number; radius?: number; color?: string }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[radius, radius, height, 8]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.08} />
    </mesh>
  );
}

function Sofa({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG.sofa;
  return (
    <group>
      <Sharp args={[w * 0.94, 0.12, d * 0.9]} position={[0, 0.14, 0]} color={INK} roughness={0.7} />
      <Sharp args={[w * 0.4, 0.18, d * 0.66]} position={[-w * 0.2, 0.32, 0.05]} color={color} />
      <Sharp args={[w * 0.4, 0.18, d * 0.66]} position={[w * 0.2, 0.32, 0.05]} color={color} />
      <Sharp args={[w * 0.28, 0.22, 0.08]} position={[-w * 0.22, 0.5, -d * 0.22]} color={color} />
      <Sharp args={[w * 0.28, 0.22, 0.08]} position={[w * 0.22, 0.5, -d * 0.22]} color={color} />
      <Sharp args={[w * 0.96, h * 0.52, d * 0.16]} position={[0, 0.56, -d * 0.38]} color={color} />
      <Sharp args={[w * 0.08, h * 0.38, d * 0.78]} position={[-w * 0.46, 0.46, 0.02]} color={color} />
      <Sharp args={[w * 0.08, h * 0.38, d * 0.78]} position={[w * 0.46, 0.46, 0.02]} color={color} />
    </group>
  );
}

function Armchair({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG.armchair;
  return (
    <group>
      <Sharp args={[w * 0.9, 0.1, d * 0.86]} position={[0, 0.12, 0]} color={INK} roughness={0.7} />
      <Sharp args={[w * 0.72, 0.16, d * 0.62]} position={[0, 0.28, 0.04]} color={color} />
      <Sharp args={[w * 0.86, h * 0.48, d * 0.16]} position={[0, 0.52, -d * 0.36]} color={color} />
      <Sharp args={[w * 0.12, h * 0.32, d * 0.72]} position={[-w * 0.4, 0.4, 0.02]} color={color} />
      <Sharp args={[w * 0.12, h * 0.32, d * 0.72]} position={[w * 0.4, 0.4, 0.02]} color={color} />
    </group>
  );
}

function CoffeeTable({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG["coffee-table"];
  return (
    <group>
      <Sharp args={[w, 0.045, d]} position={[0, h - 0.03, 0]} color={color} roughness={0.55} />
      <Leg position={[-w * 0.38, 0.15, -d * 0.32]} height={0.3} />
      <Leg position={[w * 0.38, 0.15, -d * 0.32]} height={0.3} />
      <Leg position={[-w * 0.38, 0.15, d * 0.32]} height={0.3} />
      <Leg position={[w * 0.38, 0.15, d * 0.32]} height={0.3} />
    </group>
  );
}

function DiningTable({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG["dining-table"];
  return (
    <group>
      <Sharp args={[w, 0.05, d]} position={[0, h - 0.03, 0]} color={color} roughness={0.5} />
      <Leg position={[-w * 0.4, h * 0.45, -d * 0.36]} height={h * 0.86} radius={0.03} />
      <Leg position={[w * 0.4, h * 0.45, -d * 0.36]} height={h * 0.86} radius={0.03} />
      <Leg position={[-w * 0.4, h * 0.45, d * 0.36]} height={h * 0.86} radius={0.03} />
      <Leg position={[w * 0.4, h * 0.45, d * 0.36]} height={h * 0.86} radius={0.03} />
    </group>
  );
}

function DiningChair({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG["dining-chair"];
  return (
    <group>
      <Sharp args={[w * 0.86, 0.05, d * 0.82]} position={[0, 0.46, 0]} color={color} />
      <Sharp args={[w * 0.86, 0.42, 0.05]} position={[0, 0.7, -d * 0.36]} color={color} />
      <Leg position={[-w * 0.34, 0.22, -d * 0.3]} height={0.44} radius={0.018} color={INK} />
      <Leg position={[w * 0.34, 0.22, -d * 0.3]} height={0.44} radius={0.018} color={INK} />
      <Leg position={[-w * 0.34, 0.22, d * 0.3]} height={0.44} radius={0.018} color={INK} />
      <Leg position={[w * 0.34, 0.22, d * 0.3]} height={0.44} radius={0.018} color={INK} />
      <Sharp shadow={false} args={[0.02, h * 0.42, 0.02]} position={[-w * 0.34, h * 0.55, -d * 0.32]} color={INK} />
      <Sharp shadow={false} args={[0.02, h * 0.42, 0.02]} position={[w * 0.34, h * 0.55, -d * 0.32]} color={INK} />
    </group>
  );
}

function FloorLamp() {
  const { height: h } = CATALOG["floor-lamp"];
  const lit = useStudio((s) => s.lighting === "evening" || s.lighting === "golden-hour");
  return (
    <group>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.04, 16]} />
        <meshStandardMaterial color={BRASS} metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, h * 0.42, 0]}>
        <cylinderGeometry args={[0.012, 0.014, h * 0.78, 8]} />
        <meshStandardMaterial color={METAL} metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh position={[0, h - 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 0.32, 16]} />
        <meshStandardMaterial color="#1c1a17" roughness={0.72} emissive={lit ? "#ffb15a" : "#000000"} emissiveIntensity={lit ? 0.4 : 0} />
      </mesh>
      {lit ? <pointLight position={[0, h - 0.4, 0]} intensity={1.1} distance={4.2} color="#ffc89a" /> : null}
    </group>
  );
}

function Plant() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.16, 0.13, 0.24, 16]} />
        <meshStandardMaterial color="#8a5a3c" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.02, 0.028, 0.7, 8]} />
        <meshStandardMaterial color="#5c4332" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.32, 14, 10]} />
        <meshStandardMaterial color="#314236" roughness={0.9} />
      </mesh>
    </group>
  );
}

const BOOK_COLORS = ["#f3eee6", "#b8893d", "#3f5346", "#8f3d36", "#243044", "#d9c7a6", "#1c1a17"];

function Books({ depth }: { depth: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { width: w } = CATALOG.bookshelf;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    const shelves = [0.08, 0.46, 0.84, 1.22];
    let i = 0;
    for (let s = 0; s < shelves.length; s += 1) {
      for (let b = 0; b < 6; b += 1) {
        dummy.position.set(-w * 0.38 + b * 0.13, (shelves[s] ?? 0) + 0.16, 0.02);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        tint.set(BOOK_COLORS[(s * 3 + b) % BOOK_COLORS.length] ?? "#f3eee6");
        m.setColorAt(i, tint);
        i += 1;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [w]);
  return (
    <instancedMesh ref={mesh} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, 24]} castShadow>
      <boxGeometry args={[0.08, 0.28, depth * 0.7]} />
      <meshStandardMaterial roughness={0.7} />
    </instancedMesh>
  );
}

function Bookshelf({ color }: { color: string }) {
  const { width: w, height: h, depth: d } = CATALOG.bookshelf;
  const shelves = [0.08, 0.46, 0.84, 1.22, 1.6, h - 0.04];
  return (
    <group>
      <Sharp args={[0.04, h, d]} position={[-w / 2 + 0.02, h / 2, 0]} color={color} roughness={0.62} />
      <Sharp args={[0.04, h, d]} position={[w / 2 - 0.02, h / 2, 0]} color={color} roughness={0.62} />
      <Sharp args={[w, 0.04, d]} position={[0, h - 0.02, 0]} color={color} roughness={0.62} />
      {shelves.slice(0, 5).map((y) => (
        <Sharp key={y} args={[w - 0.06, 0.03, d]} position={[0, y, 0]} color={color} roughness={0.62} />
      ))}
      <Books depth={d} />
    </group>
  );
}

function Sideboard({ color }: { color: string }) {
  const { width: w, height: h, depth: d } = CATALOG.sideboard;
  return (
    <group>
      <Sharp args={[w, h * 0.72, d]} position={[0, h * 0.58, 0]} color={color} roughness={0.58} />
      <Sharp args={[0.012, h * 0.5, 0.012]} position={[0, h * 0.58, d / 2 + 0.002]} color={BRASS} metalness={0.4} roughness={0.4} shadow={false} />
      <Leg position={[-w * 0.42, 0.08, d * 0.32]} height={0.16} radius={0.025} color={INK} />
      <Leg position={[w * 0.42, 0.08, d * 0.32]} height={0.16} radius={0.025} color={INK} />
      <Leg position={[-w * 0.42, 0.08, -d * 0.32]} height={0.16} radius={0.025} color={INK} />
      <Leg position={[w * 0.42, 0.08, -d * 0.32]} height={0.16} radius={0.025} color={INK} />
    </group>
  );
}

function Bed({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG.bed;
  return (
    <group>
      <Sharp args={[w, 0.16, d]} position={[0, 0.16, 0]} color={INK} roughness={0.7} />
      <Sharp args={[w * 0.94, 0.18, d * 0.9]} position={[0, 0.32, 0.02]} color={color} />
      <Sharp args={[w * 0.9, h * 0.42, 0.08]} position={[0, 0.55, -d * 0.44]} color={color} />
      <Sharp args={[0.42, 0.1, 0.28]} position={[-0.28, 0.46, -d * 0.28]} color="#f3eee6" />
      <Sharp args={[0.42, 0.1, 0.28]} position={[0.28, 0.46, -d * 0.28]} color="#f3eee6" />
    </group>
  );
}

function Rug({ color }: { color: string }) {
  const { width: w, depth: d } = CATALOG.rug;
  return <Sharp args={[w, 0.015, d]} position={[0, 0.01, 0]} color={color} roughness={0.95} shadow={false} />;
}

function Ottoman({ color }: { color: string }) {
  const { width: w, depth: d, height: h } = CATALOG.ottoman;
  return <Sharp args={[w, h * 0.7, d]} position={[0, h * 0.4, 0]} color={color} />;
}

function Body({ type, color }: { type: ItemType; color: string }) {
  switch (type) {
    case "sofa":
      return <Sofa color={color} />;
    case "armchair":
      return <Armchair color={color} />;
    case "coffee-table":
      return <CoffeeTable color={color} />;
    case "dining-table":
      return <DiningTable color={color} />;
    case "dining-chair":
      return <DiningChair color={color} />;
    case "floor-lamp":
      return <FloorLamp />;
    case "plant":
      return <Plant />;
    case "bookshelf":
      return <Bookshelf color={color} />;
    case "sideboard":
      return <Sideboard color={color} />;
    case "bed":
      return <Bed color={color} />;
    case "rug":
      return <Rug color={color} />;
    case "ottoman":
      return <Ottoman color={color} />;
    default:
      return null;
  }
}

function Piece({ node }: { node: FurnitureNode }) {
  const selected = useStudio((s) => s.selectedId === node.id);
  const { controlsRef, dragRef } = useRig();
  const gl = useThree((s) => s.gl);
  const spec = CATALOG[node.type];

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      const state = useStudio.getState();
      state.select(node.id);
      state.beginGesture();
      dragRef.current = { id: node.id, ox: node.x - event.point.x, oz: node.z - event.point.z };
      if (controlsRef.current) controlsRef.current.enabled = false;
      gl.domElement.style.cursor = "grabbing";
    },
    [controlsRef, dragRef, gl, node.id, node.x, node.z],
  );

  return (
    <group position={[node.x, node.y, node.z]} rotation={[0, node.rotationY, 0]} scale={node.scale} onPointerDown={onPointerDown}>
      {selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[spec.width + 0.08, spec.depth + 0.08]} />
          <meshBasicMaterial color="#b8893d" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ) : null}
      <Body type={node.type} color={node.color} />
    </group>
  );
}

export function Pieces() {
  const nodes = useStudio((s) => s.nodes);
  return (
    <group>
      {nodes.map((node) => (
        <Piece key={node.id} node={node} />
      ))}
    </group>
  );
}
