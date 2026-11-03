import type { Camera, Object3D, WebGLRenderer } from "three";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { useStudio } from "@/lib/studio/store";

let renderer: WebGLRenderer | null = null;
let camera: Camera | null = null;
let scene: Object3D | null = null;
const raycaster = new Raycaster();
const ndc = new Vector2();
const hit = new Vector3();
const floor = new Plane(new Vector3(0, 1, 0), 0);

export function bindRenderer(gl: WebGLRenderer, nextCamera?: Camera, nextScene?: Object3D) {
  renderer = gl;
  if (nextCamera) camera = nextCamera;
  if (nextScene) scene = nextScene;
}

export function currentRenderer(): WebGLRenderer | null {
  return renderer;
}

export function floorPointFromClient(clientX: number, clientY: number): { x: number; z: number } | null {
  const gl = renderer;
  if (!gl || !camera) return null;
  const rect = gl.domElement.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(floor, hit)) return null;
  return { x: hit.x, z: hit.z };
}

export function captureStill(): string | null {
  const gl = renderer;
  if (!gl || gl.xr?.isPresenting) return null;
  try {
    if (scene && camera) gl.render(scene, camera);
    const url = gl.domElement.toDataURL("image/jpeg", 0.82);
    return url.startsWith("data:image/jpeg") && url.length > 8000 ? url : null;
  } catch {
    return null;
  }
}

export async function probeAR(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

export async function enterAR(gl: WebGLRenderer): Promise<"ok" | "unsupported" | "failed"> {
  const xr = navigator.xr;
  if (!xr) return "unsupported";
  try {
    const supported = await xr.isSessionSupported("immersive-ar");
    if (!supported) return "unsupported";
    gl.xr.enabled = true;
    gl.xr.setReferenceSpaceType("local-floor");
    let session: XRSession;
    try {
      session = await xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["hit-test"],
      });
    } catch {
      session = await xr.requestSession("immersive-ar", {
        optionalFeatures: ["local-floor", "hit-test"],
      });
    }
    await gl.xr.setSession(session);
    session.addEventListener("end", () => {
      useStudio.getState().bumpCanvas();
    });
    return "ok";
  } catch {
    return "failed";
  }
}
