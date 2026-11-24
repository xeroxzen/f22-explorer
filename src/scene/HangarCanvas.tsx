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

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  'three-quarter': { pos: [14, 6.2, -13.5], target: [0, 1.9, 0] },
  top: { pos: [0, 23, -0.01], target: [0, 1.8, 0] },
  side: { pos: [20, 3.2, 0], target: [0, 2.0, 0] },
  rear: { pos: [7.5, 4.2, 16.5], target: [0, 1.9, 2.0] },
  cockpit: { pos: [2.8, 4.0, -5.8], target: [0, 2.6, -4.6] },
};

function HangarStructure({ shadows }: { readonly shadows: boolean }) {
  return (
    <group name="hangar-environment">
      {/* Epoxy hangar concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={shadows}>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#141b24" roughness={0.82} metalness={0.16} />
      </mesh>

      {/* Safety bay outline around aircraft */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[11.2, 11.38, 64]} />
        <meshBasicMaterial color="#d97706" transparent opacity={0.35} />
      </mesh>

      {/* Overhead hangar steel roof trusses & light strips */}
      {[-14, 0, 14].map((z, idx) => (
        <group key={idx} position={[0, 11.5, z]}>
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
  const { camera, gl, scene } = useThree();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const setSceneReady = useExplorerStore((s) => s.setSceneReady);
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const cameraPresetNonce = useExplorerStore((s) => s.cameraPresetNonce);
  const animatingRef = useRef(false);
  const goalPosRef = useRef(new THREE.Vector3(14, 6.2, -13.5));
  const goalTargetRef = useRef(new THREE.Vector3(0, 1.9, 0));

  useEffect(() => {
    gl.localClippingEnabled = true;
    installDebugHook();
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [gl, setSceneReady]);

  useEffect(() => {
    if (cameraPresetNonce === 0) return;
    const p = CAMERA_PRESETS[cameraPreset];
    goalPosRef.current.set(...p.pos);
    goalTargetRef.current.set(...p.target);
    animatingRef.current = true;
  }, [cameraPreset, cameraPresetNonce]);

  useFrame((_, delta) => {
    if (animatingRef.current && controlsRef.current) {
      const alpha = Math.min(1, delta * 6);
      camera.position.lerp(goalPosRef.current, alpha);
      controlsRef.current.target.lerp(goalTargetRef.current, alpha);
      controlsRef.current.update();
      if (camera.position.distanceTo(goalPosRef.current) < 0.08) {
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
      minDistance={3}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2 - 0.02}
      target={[0, 1.9, 0]}
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
        camera={{ position: [14, 6.2, -13.5], fov: 40, near: 0.1, far: 300 }}
        onPointerMissed={() => selectPart(null)}
      >
        <color attach="background" args={['#0c1118']} />
        <fog attach="fog" args={['#0c1118', 42, 120]} />

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
