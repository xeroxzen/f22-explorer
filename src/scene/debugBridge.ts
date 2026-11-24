import * as THREE from 'three';
import { soundEngine } from '../audio/soundEngine.js';
import { findExactPartCollisionsAtExplode } from './f22Geometry.js';
import {
  useExplorerStore,
  type CameraPresetId,
  type ClipAxis,
  type QualityTier,
} from '../store/explorerStore.js';

interface RegisteredHitbox {
  readonly partId: string;
  readonly mesh: THREE.Object3D;
  readonly boundsMesh: THREE.Object3D;
}

const hitboxes = new Map<string, RegisteredHitbox>();
const SCRATCH_BOX3 = new THREE.Box3();
const SCRATCH_CORNER = new THREE.Vector3();
let activeCamera: THREE.Camera | null = null;
let activeCanvas: HTMLCanvasElement | null = null;
let activeScene: THREE.Scene | null = null;

// Pre-allocated ring buffer for zero-allocation frame timing
const MAX_FRAME_SAMPLES = 600;
const frameTimesBuf = new Float64Array(MAX_FRAME_SAMPLES);
let frameTimesCount = 0;
let frameTimesHead = 0;
let fpsFrames = 0;
let fpsStartMs = performance.now();
let lastMeasuredFps = 0;
let lastFrameStampMs = 0;
let lastDrawCalls = 0;
let lastTriangles = 0;

export function registerDebugHitbox(
  partId: string,
  mesh: THREE.Object3D | null,
  boundsMesh?: THREE.Object3D | null
): void {
  if (!import.meta.env.DEV) return;
  if (mesh) {
    hitboxes.set(partId, {
      partId,
      mesh,
      boundsMesh: boundsMesh ?? mesh,
    });
  } else {
    hitboxes.delete(partId);
  }
}

export function updateDebugFrame(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  renderInfo?: { readonly calls: number; readonly triangles: number },
  scene?: THREE.Scene | null
): void {
  if (!import.meta.env.DEV) return;
  activeCamera = camera;
  activeCanvas = canvas;
  if (scene !== undefined) {
    activeScene = scene;
  }
  if (renderInfo) {
    lastDrawCalls = renderInfo.calls;
    lastTriangles = renderInfo.triangles;
  }

  const now = performance.now();
  if (lastFrameStampMs > 0) {
    const dtMs = now - lastFrameStampMs;
    if (dtMs > 0 && dtMs < 2000) {
      frameTimesBuf[frameTimesHead] = dtMs;
      frameTimesHead = (frameTimesHead + 1) % MAX_FRAME_SAMPLES;
      if (frameTimesCount < MAX_FRAME_SAMPLES) frameTimesCount++;
    }
  }
  lastFrameStampMs = now;

  fpsFrames++;
  const elapsed = now - fpsStartMs;
  if (elapsed >= 500) {
    lastMeasuredFps = (fpsFrames * 1000) / elapsed;
  }
}

export function installDebugHook(): void {
  if (!import.meta.env.DEV) return;
  const w = window as unknown as Record<string, unknown>;
  if (w['__f22debug']) return;

  w['__f22debug'] = {
    resetFps() {
      fpsFrames = 0;
      fpsStartMs = performance.now();
      lastMeasuredFps = 0;
      lastFrameStampMs = 0;
      frameTimesCount = 0;
      frameTimesHead = 0;
    },
    getPerfMetrics() {
      const sorted = Array.from(frameTimesBuf.subarray(0, frameTimesCount)).sort(
        (a, b) => a - b
      );
      const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)]! : 0;
      const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)]! : 0;
      const elapsed = performance.now() - fpsStartMs;
      const fps =
        elapsed > 100 && fpsFrames > 0
          ? (fpsFrames * 1000) / elapsed
          : lastMeasuredFps;
      return {
        fps,
        p50FrameMs: p50,
        p95FrameMs: p95,
        drawCalls: lastDrawCalls,
        triangles: lastTriangles,
        samples: sorted.length,
      };
    },
    getState() {
      const s = useExplorerStore.getState();
      return {
        sceneReady: s.sceneReady,
        qualityTier: s.qualityTier,
        soundMuted: s.soundMuted,
        selectedPartId: s.selectedPartId,
        showInspector: s.showInspector,
        showPartTree: s.showPartTree,
        explodeFactor: s.explodeFactor,
        xrayMode: s.xrayMode,
        clipAxis: s.clipAxis,
        clipPosition: s.clipPosition,
        bottomSheetHeightPx: s.bottomSheetHeightPx,
        rightDrawerWidthPx: s.rightDrawerWidthPx,
        mobileControlsHidden: s.mobileControlsHidden,
        registeredHitboxes: Array.from(hitboxes.keys()),
      };
    },
    getSoundState() {
      return soundEngine.getDebugState();
    },
    setQualityTier(tier: QualityTier) {
      useExplorerStore.getState().setQualityTier(tier);
    },
    selectPart(partId: string | null) {
      useExplorerStore.getState().selectPart(partId);
    },
    setShowInspector(open: boolean) {
      useExplorerStore.getState().setShowInspector(open);
    },
    setShowPartTree(open: boolean) {
      useExplorerStore.getState().setShowPartTree(open);
    },
    setExplodeFactor(v: number) {
      useExplorerStore.getState().setExplodeFactor(v);
    },
    setXrayMode(enabled: boolean) {
      useExplorerStore.getState().setXrayMode(enabled);
    },
    setClipAxis(axis: ClipAxis) {
      useExplorerStore.getState().setClipAxis(axis);
    },
    setCameraPreset(preset: CameraPresetId) {
      useExplorerStore.getState().setCameraPreset(preset);
    },
    setMobileControlsHidden(hidden: boolean) {
      useExplorerStore.getState().setMobileControlsHidden(hidden);
    },
    getCameraPosition() {
      if (!activeCamera) return null;
      return {
        x: activeCamera.position.x,
        y: activeCamera.position.y,
        z: activeCamera.position.z,
      };
    },
    getPartScreenBounds(partId: string) {
      if (!activeCamera || !activeCanvas) return null;
      const entry = hitboxes.get(partId);
      if (!entry) return null;
      activeCamera.updateMatrixWorld();
      entry.boundsMesh.updateMatrixWorld(true);
      SCRATCH_BOX3.setFromObject(entry.boundsMesh);
      if (SCRATCH_BOX3.isEmpty()) return null;

      const rect = activeCanvas.getBoundingClientRect();
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let anyInFront = false;

      const { min, max } = SCRATCH_BOX3;
      for (let ix = 0; ix < 2; ix++) {
        for (let iy = 0; iy < 2; iy++) {
          for (let iz = 0; iz < 2; iz++) {
            SCRATCH_CORNER.set(
              ix ? max.x : min.x,
              iy ? max.y : min.y,
              iz ? max.z : min.z
            ).project(activeCamera);
            if (SCRATCH_CORNER.z >= -1 && SCRATCH_CORNER.z <= 1) {
              anyInFront = true;
            }
            const sx = rect.left + ((SCRATCH_CORNER.x + 1) / 2) * rect.width;
            const sy = rect.top + ((-SCRATCH_CORNER.y + 1) / 2) * rect.height;
            if (sx < minX) minX = sx;
            if (sx > maxX) maxX = sx;
            if (sy < minY) minY = sy;
            if (sy > maxY) maxY = sy;
          }
        }
      }

      return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
        inFront: anyInFront,
      };
    },
    /**
     * Exact 3D Separating Axis Theorem (SAT) collision check across all 44 parts
     * at the current explode factor.
     */
    checkPartIntersections(toleranceM = 0.005) {
      if (!activeScene) return [];
      const factor = useExplorerStore.getState().explodeFactor;
      return findExactPartCollisionsAtExplode(factor, toleranceM);
    },
  };
}
