import { useEffect, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import {
  QUALITY_PRESETS,
  useExplorerStore,
  type CameraPresetId,
} from '../store/explorerStore.js';
import { installDebugHook, updateDebugFrame } from './debugBridge.js';
import { F22Model } from './F22Model.js';
import { fsToZ } from './f22Geometry.js';

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  'three-quarter': { pos: [14.5, 6.2, -13.5], target: [0, 2.0, 0] },
  front: { pos: [0, 3.0, -21.0], target: [0, 2.2, 0] },
  top: { pos: [0, 31.0, -0.01], target: [0, 1.8, 0] },
  side: { pos: [22.0, 3.0, 0], target: [0, 2.1, 0] },
  rear: { pos: [7.5, 4.4, 17.5], target: [0, 2.0, 1.5] },
  // Seat-level pilot eye camera looking directly forward at the 6 LCDs + HUD + ICP
  cockpit: { pos: [0, 2.74, fsToZ(5.25)], target: [0, 2.46, fsToZ(3.85)] },
  // Low quarter camera looking cleanly into open main & side weapons bays
  bays: { pos: [5.4, 0.95, fsToZ(5.2)], target: [0, 1.42, fsToZ(9.2)] },
};

function HangarStructure({ shadows }: { readonly shadows: boolean }) {
  return (
    <group name="hangar-environment">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={shadows}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#141b24" roughness={0.82} metalness={0.16} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[11.2, 11.38, 64]} />
        <meshBasicMaterial color="#d97706" transparent opacity={0.35} />
      </mesh>

      {[-14, 0, 14].map((z, idx) => (
        <group key={idx} position={[0, 34, z]}>
          <mesh>
            <boxGeometry args={[36, 0.35, 0.35]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.24, 0]}>
            <boxGeometry args={[16, 0.08, 0.45]} />
            <meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={1.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SceneController() {
  const { camera, gl, scene, size } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const setSceneReady = useExplorerStore((s) => s.setSceneReady);
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const cameraPresetNonce = useExplorerStore((s) => s.cameraPresetNonce);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const bottomSheetHeightPx = useExplorerStore((s) => s.bottomSheetHeightPx);
  const rightDrawerWidthPx = useExplorerStore((s) => s.rightDrawerWidthPx);
  const animatingRef = useRef(false);
  const goalPosRef = useRef(new THREE.Vector3(14.5, 6.2, -13.5));
  const goalTargetRef = useRef(new THREE.Vector3(0, 2.0, 0));
  const prevExplodeRef = useRef(0);

  useEffect(() => {
    gl.localClippingEnabled = true;
    installDebugHook();
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [gl, setSceneReady]);

  // Offset camera frustum center when mobile bottom sheet or landscape drawer is open
  // so no exploded or assembled parts are hidden behind the sheet!
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (!persp.isPerspectiveCamera) return;
    if (bottomSheetHeightPx > 0 || rightDrawerWidthPx > 0) {
      persp.setViewOffset(
        size.width,
        size.height,
        rightDrawerWidthPx * 0.5,
        bottomSheetHeightPx * 0.5,
        size.width,
        size.height
      );
    } else {
      persp.clearViewOffset();
    }
    persp.updateProjectionMatrix();
  }, [camera, size.width, size.height, bottomSheetHeightPx, rightDrawerWidthPx]);

  // Camera preset transitions
  useEffect(() => {
    if (cameraPresetNonce === 0) return;
    const p = CAMERA_PRESETS[cameraPreset];
    const isCloseView = cameraPreset === 'cockpit' || cameraPreset === 'bays';
    const aspectScale = !isCloseView && size.width < size.height ? 1.48 : 1.0;
    const sheetScale =
      !isCloseView && bottomSheetHeightPx > 0
        ? 1 + (bottomSheetHeightPx / Math.max(300, size.height)) * 0.65
        : 1.0;
    const explodeScale = isCloseView
      ? 1.0
      : 1 + useExplorerStore.getState().explodeFactor * 0.62;
    goalTargetRef.current.set(...p.target);
    const dir = new THREE.Vector3(...p.pos).sub(goalTargetRef.current);
    goalPosRef.current
      .copy(goalTargetRef.current)
      .addScaledVector(dir, aspectScale * sheetScale * explodeScale);
    animatingRef.current = true;
  }, [cameraPreset, cameraPresetNonce, size.width, size.height, bottomSheetHeightPx]);

  // Auto-fit camera bounding box when exploding or when mobile sheet opens/closes
  useEffect(() => {
    if (
      Math.abs(explodeFactor - prevExplodeRef.current) < 0.01 &&
      bottomSheetHeightPx === 0
    ) {
      return;
    }
    prevExplodeRef.current = explodeFactor;
    const curPreset = useExplorerStore.getState().cameraPreset;
    if (curPreset === 'cockpit' || curPreset === 'bays') return;
    const p = CAMERA_PRESETS[curPreset];
    const aspectScale = size.width < size.height ? 1.52 : 1.0;
    const sheetScale =
      bottomSheetHeightPx > 0
        ? 1 + (bottomSheetHeightPx / Math.max(300, size.height)) * 0.65
        : 1.0;
    const explodeScale = 1 + explodeFactor * 0.65;
    goalTargetRef.current.set(p.target[0], p.target[1] + explodeFactor * 0.3, p.target[2]);
    const dir = new THREE.Vector3(...p.pos).sub(new THREE.Vector3(...p.target));
    goalPosRef.current
      .copy(goalTargetRef.current)
      .addScaledVector(dir, aspectScale * sheetScale * explodeScale);
    animatingRef.current = true;
  }, [explodeFactor, size.width, size.height, bottomSheetHeightPx]);

  useFrame((_, delta) => {
    if (animatingRef.current && controlsRef.current) {
      const alpha = Math.min(1, delta * 7);
      camera.position.lerp(goalPosRef.current, alpha);
      controlsRef.current.target.lerp(goalTargetRef.current, alpha);
      controlsRef.current.update();
      if (camera.position.distanceTo(goalPosRef.current) < 0.05) {
        animatingRef.current = false;
      }
    }

    updateDebugFrame(
      camera,
      gl.domElement,
      {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      },
      scene
    );
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.6}
      maxDistance={75}
      maxPolarAngle={Math.PI / 2 - 0.01}
      target={[0, 2.0, 0]}
      onStart={() => {
        animatingRef.current = false;
      }}
    />
  );
}

export function HangarCanvas() {
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const preset = QUALITY_PRESETS[qualityTier];

  return (
    <div className="canvas-shell" data-testid="hangar-canvas-shell">
      <Canvas
        dpr={preset.dpr}
        shadows={preset.shadows}
        gl={{ antialias: preset.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [14.5, 6.2, -13.5], fov: 40, near: 0.08, far: 320 }}
        onPointerMissed={() => selectPart(null)}
      >
        <color attach="background" args={['#0c1118']} />
        <fog attach="fog" args={['#0c1118', 48, 135]} />

        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#c8dcff', '#1b2430', 0.55]} />
        <directionalLight
          position={[16, 22, -14]}
          intensity={1.35}
          castShadow={preset.shadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-14, 12, 14]} intensity={0.6} color="#93c5fd" />

        <HangarStructure shadows={preset.shadows} />

        <Grid
          args={[60, 60]}
          cellSize={1}
          cellThickness={0.45}
          cellColor="#223042"
          sectionSize={5}
          sectionThickness={0.9}
          sectionColor="#364a66"
          fadeDistance={52}
          fadeStrength={1.2}
          position={[0, 0.001, 0]}
        />

        <F22Model />
        <SceneController />
      </Canvas>
    </div>
  );
}
