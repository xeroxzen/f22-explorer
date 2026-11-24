import { useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { QUALITY_PRESETS, useExplorerStore } from '../store/explorerStore.js';
import { installDebugHook, updateDebugFrame } from './debugBridge.js';

function SceneController() {
  const { camera, gl, scene } = useThree();
  const setSceneReady = useExplorerStore((s) => s.setSceneReady);

  useEffect(() => {
    installDebugHook();
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [setSceneReady]);

  useFrame(() => {
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

  return null;
}

export function HangarCanvas() {
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const preset = QUALITY_PRESETS[qualityTier];

  return (
    <div className="canvas-shell" data-testid="hangar-canvas-shell">
      <Canvas
        dpr={preset.dpr}
        shadows={preset.shadows}
        gl={{ antialias: preset.antialias, powerPreference: 'high-performance' }}
        camera={{ position: [14, 7, 16], fov: 42, near: 0.1, far: 400 }}
      >
        <color attach="background" args={['#0d1219']} />
        <fog attach="fog" args={['#0d1219', 45, 140]} />

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[18, 26, 14]}
          intensity={1.2}
          castShadow={preset.shadows}
        />
        <directionalLight position={[-14, 12, -12]} intensity={0.45} color="#8ab4f8" />

        {/* Empty hangar reference floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow={preset.shadows}>
          <planeGeometry args={[160, 160]} />
          <meshStandardMaterial color="#121822" roughness={0.88} metalness={0.12} />
        </mesh>

        <Grid
          args={[60, 60]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#243042"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#3a4c66"
          fadeDistance={55}
          fadeStrength={1.2}
          position={[0, 0, 0]}
        />

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={3}
          maxDistance={65}
          maxPolarAngle={Math.PI / 2 - 0.03}
          target={[0, 1.5, 0]}
        />

        <SceneController />
      </Canvas>
    </div>
  );
}
