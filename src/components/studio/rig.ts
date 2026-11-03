import { createContext, useContext, type MutableRefObject, type RefObject } from "react";
import type { Vector3 } from "three";

export interface OrbitHandle {
  enabled: boolean;
  target: Vector3;
  update?: () => void;
  enableRotate: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  minDistance: number;
  maxDistance: number;
}

export interface DragState {
  id: string;
  ox: number;
  oz: number;
}

export interface Rig {
  controlsRef: RefObject<OrbitHandle | null>;
  dragRef: MutableRefObject<DragState | null>;
}

export const RigContext = createContext<Rig | null>(null);

export function useRig(): Rig {
  const rig = useContext(RigContext);
  if (!rig) throw new Error("Studio rig is missing");
  return rig;
}
