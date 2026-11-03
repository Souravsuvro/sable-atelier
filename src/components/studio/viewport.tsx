import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { Pieces } from "@/components/studio/furniture";
import { PlanSvg } from "@/components/studio/plan";
import { RigContext, useRig, type DragState, type OrbitHandle } from "@/components/studio/rig";
import { getMaterialTexture } from "@/components/studio/textures";
import { bindRenderer, floorPointFromClient } from "@/components/studio/webxr";
import { CATALOG } from "@/lib/studio/catalog";
import { useStudio } from "@/lib/studio/store";
import { ITEM_TYPES, oneOf, type FloorFinish, type ItemType, type LightingPreset, type WallFinish, type WallId } from "@/lib/studio/types";

const VOID = "#d7d0c4";
const PLINTH = "#2a261f";
const INK = "#221f1c";
const GRID = "#b7aa96";
const BASE = "#cfc6b8";

const WALL_TINT: Record<WallFinish, string> = {
  plaster: "#efe8dc",
  limewash: "#e7e0d2",
  concrete: "#c8c4bc",
  brick: "#ffffff",
  "oak-panel": "#ffffff",
  sage: "#d5ddd2",
};

const FLOOR_ROUGH: Record<FloorFinish, number> = {
  oak: 0.72,
  walnut: 0.66,
  concrete: 0.92,
  marble: 0.28,
  terrazzo: 0.42,
};

const RIG: Record<
  LightingPreset,
  { ambient: string; ambientI: number; key: string; keyI: number; keyPos: [number, number, number]; exposure: number }
> = {
  "north-light": { ambient: "#f4f0e8", ambientI: 0.46, key: "#fff6ea", keyI: 2.35, keyPos: [-4, 6.4, -2.2], exposure: 1.05 },
  "golden-hour": { ambient: "#f0ddc4", ambientI: 0.34, key: "#ffb15a", keyI: 2.7, keyPos: [5.2, 3.4, 2.4], exposure: 1.08 },
  evening: { ambient: "#9aa4b5", ambientI: 0.16, key: "#ffc89a", keyI: 0.55, keyPos: [-2.2, 4.2, 1], exposure: 0.9 },
  gallery: { ambient: "#ffffff", ambientI: 0.62, key: "#ffffff", keyI: 1.45, keyPos: [1.5, 8, 2], exposure: 1.12 },
};

class ModelBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "The model failed to start." };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center bg-plaster px-6 text-center text-ink">
          <div>
            <p className="font-display text-2xl">Model paused</p>
            <p className="mt-2 max-w-sm text-sm break-words">{this.state.error}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Lights() {
  const lighting = useStudio((s) => s.lighting);
  const rig = RIG[lighting];
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    gl.toneMappingExposure = rig.exposure;
  }, [gl, rig.exposure]);
  return (
    <>
      <hemisphereLight args={["#e7eef2", "#d9cbb8", 0.45]} />
      <ambientLight color={rig.ambient} intensity={rig.ambientI} />
      <directionalLight
        castShadow
        position={rig.keyPos}
        intensity={rig.keyI}
        color={rig.key}
        shadow-mapSize={typeof window !== "undefined" && window.innerWidth < 800 ? [512, 512] : [1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.00025}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[4.5, 3.2, 5]} intensity={0.32} color="#f3eee6" />
    </>
  );
}

function Wall({
  id,
  size,
  position,
  outward,
  finish,
  children,
}: {
  id: WallId;
  size: [number, number, number];
  position: [number, number, number];
  outward: THREE.Vector3;
  finish: WallFinish;
  children?: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const planeD = outward.dot(new THREE.Vector3(position[0], position[1], position[2]));
  const textured = finish === "brick" || finish === "oak-panel";
  const map = getMaterialTexture(textured ? finish : "plaster");
  const color = WALL_TINT[finish];

  useFrame(({ camera, invalidate }) => {
    const outside = outward.dot(camera.position) - planeD > 0.2;
    const next = !outside;
    const groupEl = group.current;
    if (!groupEl || groupEl.visible === next) return;
    groupEl.visible = next;
    invalidate();
  }, -2);

  return (
    <group ref={group} position={position} name={id}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} map={textured ? map : getMaterialTexture("plaster")} roughness={0.94} />
      </mesh>
      <mesh
        position={[outward.x * -0.08, -size[1] / 2 + 0.045, outward.z * -0.08]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[Math.abs(outward.x) > 0.5 ? 0.045 : size[0] - 0.16, 0.09, Math.abs(outward.z) > 0.5 ? 0.045 : size[2] - 0.16]} />
        <meshStandardMaterial color={BASE} roughness={0.86} />
      </mesh>
      {children}
    </group>
  );
}

function Floor() {
  const room = useStudio((s) => s.room);
  const floor = useStudio((s) => s.floor);
  const map = getMaterialTexture(floor);
  useLayoutEffect(() => {
    map.repeat.set(Math.max(1, room.width / 1.6), Math.max(1, room.depth / 1.6));
    map.needsUpdate = true;
  }, [map, room.width, room.depth]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color={VOID} roughness={1} />
      </mesh>
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[room.width + 0.46, 0.06, room.depth + 0.46]} />
        <meshStandardMaterial color={PLINTH} roughness={0.62} metalness={0.06} />
      </mesh>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[room.width, 0.04, room.depth]} />
        <meshStandardMaterial color="#ffffff" map={map} roughness={FLOOR_ROUGH[floor]} metalness={floor === "marble" ? 0.06 : 0} />
      </mesh>
      <FloorGrid />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        onClick={(e) => {
          e.stopPropagation();
          useStudio.getState().select(null);
        }}
      >
        <planeGeometry args={[room.width - 0.04, room.depth - 0.04]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FrameBar({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial color={INK} roughness={0.55} />
    </mesh>
  );
}

function SouthWindow({ glow }: { glow: number }) {
  return (
    <group position={[0, 0.18, -0.08]}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[2.02, 1.22]} />
        <meshStandardMaterial color="#d5e0e4" emissive="#fff4e2" emissiveIntensity={glow} roughness={0.18} side={THREE.DoubleSide} />
      </mesh>
      <FrameBar position={[0, 0.66, 0.03]} args={[2.2, 0.07, 0.04]} />
      <FrameBar position={[0, -0.66, 0.03]} args={[2.2, 0.07, 0.04]} />
      <FrameBar position={[-1.06, 0, 0.03]} args={[0.07, 1.32, 0.04]} />
      <FrameBar position={[1.06, 0, 0.03]} args={[0.07, 1.32, 0.04]} />
      <FrameBar position={[0, 0, 0.03]} args={[0.04, 1.22, 0.03]} />
    </group>
  );
}

function FloorGrid() {
  const room = useStudio((s) => s.room);
  const geom = useMemo(() => {
    const positions: number[] = [];
    const y = 0.018;
    const hw = room.width / 2;
    const hd = room.depth / 2;
    const push = (x1: number, z1: number, x2: number, z2: number) => {
      positions.push(x1, y, z1, x2, y, z2);
    };
    for (let x = -hw; x <= hw + 0.001; x += 0.5) push(x, -hd, x, hd);
    for (let z = -hd; z <= hd + 0.001; z += 0.5) push(-hw, z, hw, z);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, [room.width, room.depth]);

  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <lineSegments geometry={geom} raycast={() => undefined}>
      <lineBasicMaterial color={GRID} transparent opacity={0.55} />
    </lineSegments>
  );
}

function RoomShell() {
  const room = useStudio((s) => s.room);
  const walls = useStudio((s) => s.walls);
  const lighting = useStudio((s) => s.lighting);
  const { width, depth, height } = room;
  const t = 0.1;
  const north = useMemo(() => new THREE.Vector3(0, 0, -1), []);
  const south = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const east = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const west = useMemo(() => new THREE.Vector3(-1, 0, 0), []);

  return (
    <group>
      <Floor />
      <Wall id="north" finish={walls.north} size={[width + t * 2, height, t]} position={[0, height / 2, -depth / 2 - t / 2]} outward={north} />
      <Wall id="south" finish={walls.south} size={[width + t * 2, height, t]} position={[0, height / 2, depth / 2 + t / 2]} outward={south}>
        <SouthWindow glow={lighting === "evening" ? 0.2 : 0.9} />
      </Wall>
      <Wall id="east" finish={walls.east} size={[t, height, depth]} position={[width / 2 + t / 2, height / 2, 0]} outward={east} />
      <Wall id="west" finish={walls.west} size={[t, height, depth]} position={[-width / 2 - t / 2, height / 2, 0]} outward={west} />
    </group>
  );
}

function PointerRig() {
  const { camera, gl } = useThree();
  const { controlsRef, dragRef } = useRig();

  useEffect(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return;
      useStudio.getState().moveNode(drag.id, hit.x + drag.ox, hit.z + drag.oz);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      if (controlsRef.current) controlsRef.current.enabled = true;
      gl.domElement.style.cursor = "";
      useStudio.getState().endGesture();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [camera, gl, controlsRef, dragRef]);

  return null;
}

function TargetLock() {
  const { controlsRef } = useRig();
  const gl = useThree((s) => s.gl);
  const view = useStudio((s) => s.view);
  const room = useStudio((s) => s.room);
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls || gl.xr.isPresenting) return;
    if (view === "plan") {
      controls.target.y = 0;
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -room.width / 2, room.width / 2);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -room.depth / 2, room.depth / 2);
      return;
    }
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -1.2, 1.2);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.35, 1.25);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -1.2, 1.2);
  });
  return null;
}

function ViewFrame() {
  const view = useStudio((s) => s.view);
  const { camera } = useThree();
  const { controlsRef } = useRig();

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (view === "plan") {
      camera.position.set(0.15, 11.2, 1.35);
      controls.target.set(0, 0, 0);
      controls.enableRotate = false;
      controls.minPolarAngle = 0.05;
      controls.maxPolarAngle = 0.28;
      controls.minDistance = 7;
      controls.maxDistance = 16;
    } else {
      camera.position.set(0.35, 3.7, 6.35);
      controls.target.set(0, 0.55, 0);
      controls.enableRotate = true;
      controls.minPolarAngle = 0.18;
      controls.maxPolarAngle = Math.PI / 2 - 0.06;
      controls.minDistance = 2.8;
      controls.maxDistance = 14;
    }
    controls.update?.();
  }, [view, camera, controlsRef]);

  return null;
}

function Scene({ controlsRef }: { controlsRef: RefObject<OrbitHandle | null> }) {
  return (
    <>
      <color attach="background" args={[VOID]} />
      <Lights />
      <RoomShell />
      <Pieces />
      <PointerRig />
      <TargetLock />
      <OrbitControls
        ref={(instance) => {
          (controlsRef as { current: OrbitHandle | null }).current = instance as unknown as OrbitHandle | null;
        }}
        makeDefault
        enableDamping
        dampingFactor={0.09}
        minDistance={2.8}
        maxDistance={14}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI / 2 - 0.06}
        target={[0, 0.55, 0]}
        screenSpacePanning={false}
      />
      <ViewFrame />
    </>
  );
}

function PlanInset() {
  const view = useStudio((s) => s.view);
  const room = useStudio((s) => s.room);
  const floor = useStudio((s) => s.floor);
  const walls = useStudio((s) => s.walls);
  const lighting = useStudio((s) => s.lighting);
  const nodes = useStudio((s) => s.nodes);
  if (view === "plan") return null;
  return (
    <div className="pointer-events-auto absolute top-3 left-3 z-10 hidden w-48 rounded-xl border border-line bg-ink/80 p-2 backdrop-blur-md lg:block">
      <p className="px-1 pb-1 text-xs tracking-widest text-muted uppercase">Plan</p>
      <PlanSvg scene={{ room, floor, walls, lighting, nodes }} interactive />
    </div>
  );
}

function placeDropped(type: ItemType, clientX: number, clientY: number) {
  const point = floorPointFromClient(clientX, clientY);
  const spec = CATALOG[type];
  useStudio.getState().applyCalls([
    {
      tool: "placeFurnitureItem",
      itemType: type,
      x: point?.x ?? 0,
      y: spec.y,
      z: point?.z ?? 0,
      color: spec.color,
    },
  ]);
}

function studioDpr() {
  if (typeof window === "undefined") return 1;
  const small = window.innerWidth < 800 || window.matchMedia("(pointer: coarse)").matches;
  return Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
}

export function Viewport() {
  const epoch = useStudio((s) => s.canvasEpoch);
  const controlsRef = useRef<OrbitHandle | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const rig = useMemo(() => ({ controlsRef, dragRef }), []);
  const [over, setOver] = useState(false);

  return (
    <div
      className={over ? "h-full min-h-0 w-full touch-none ring-2 ring-brass ring-inset" : "h-full min-h-0 w-full touch-none"}
      onDragOver={(event) => {
        const raw = event.dataTransfer.getData("text/plain") || event.dataTransfer.types.includes("text/plain");
        if (!raw && ![...event.dataTransfer.types].includes("text/plain")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        const raw = event.dataTransfer.getData("text/plain");
        setOver(false);
        if (!raw.startsWith("sable:")) return;
        event.preventDefault();
        const type = raw.slice(6);
        if (!oneOf(ITEM_TYPES, type)) return;
        placeDropped(type, event.clientX, event.clientY);
      }}
    >
      <ModelBoundary>
        <Canvas
          key={epoch}
          className="h-full w-full"
          shadows
          frameloop="demand"
          dpr={studioDpr()}
          camera={{ position: [0.35, 3.7, 6.35], fov: 34, near: 0.1, far: 40 }}
          gl={{ antialias: true, alpha: false, stencil: false }}
          onCreated={({ gl, camera, scene }) => {
            gl.xr.enabled = true;
            gl.xr.setReferenceSpaceType("local-floor");
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.05;
            gl.setClearColor(VOID);
            camera.lookAt(0, 0.55, 0);
            bindRenderer(gl, camera, scene);
          }}
        >
          <RigContext.Provider value={rig}>
            <Scene controlsRef={controlsRef} />
          </RigContext.Provider>
        </Canvas>
      </ModelBoundary>
      <PlanInset />
    </div>
  );
}
