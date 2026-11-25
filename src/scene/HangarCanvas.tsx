import { Suspense, useEffect, useRef, type ComponentRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Grid, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, SSAO } from '@react-three/postprocessing';
import { soundEngine } from '../audio/soundEngine.js';
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
  // Left-aft 3/4 view framing the jet & full afterburner plume/shock diamonds clear of the left Engines panel
  rear: { pos: [-10.5, 4.4, 19.5], target: [-0.8, 2.0, 5.2] },
  // Seat-level pilot eye camera (forward of ACES II headrest) with wide 52° FOV framing all 6 Code One LCDs + HUD
  cockpit: { pos: [0, 2.82, fsToZ(5.10)], target: [0, 2.51, fsToZ(3.96)] },
  // Below-belly forward-starboard exterior camera framing the open main & side weapons bays unobstructed
  bays: { pos: [6.4, 0.85, -6.2], target: [0.0, 0.95, -0.4] },
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

/**
 * Outdoor concrete engine run-up pad / hush-house apron (relocated outside whenever
 * engines are starting or running — no afterburner indoors).
 */
function OutdoorRunUpPad({ shadows }: { readonly shadows: boolean }) {
  return (
    <group name="outdoor-runup-pad">
      {/* Concrete tarmac apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={shadows}>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#2a313b" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* Yellow blast-zone safety perimeter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 2]}>
        <ringGeometry args={[12.8, 13.05, 64]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.65} />
      </mesh>
      {/* Centerline taxi stripe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -14]}>
        <planeGeometry args={[0.28, 36]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
      </mesh>
      {/* Angled concrete blast deflector wall well aft of the jet & rear camera */}
      <group position={[0, 2.6, 38]}>
        <mesh rotation={[-0.32, 0, 0]} receiveShadow={shadows}>
          <boxGeometry args={[28, 5.6, 0.7]} />
          <meshStandardMaterial color="#475569" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh position={[0, 2.65, -0.82]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[28, 0.25, 0.08]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      </group>
      {/* Flush low-profile apron edge markers (no tall distracting posts) */}
      {[-16, 16].flatMap((x) =>
        [-14, 0, 14].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.02, z]}>
            <cylinderGeometry args={[0.14, 0.16, 0.04, 10]} />
            <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
          </mesh>
        ))
      )}
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
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const weaponsLoadout = useExplorerStore((s) => s.weaponsLoadout);
  const rightDrawerWidthPx = useExplorerStore((s) => s.rightDrawerWidthPx);
  const animatingRef = useRef(false);
  const goalPosRef = useRef(new THREE.Vector3(14.5, 6.2, -13.5));
  const goalTargetRef = useRef(new THREE.Vector3(0, 2.0, 0));
  const prevExplodeRef = useRef(0);
  const perfWindowSRef = useRef(0);
  const perfFramesRef = useRef(0);
  const perfSlowFramesRef = useRef(0);

  useEffect(() => {
    gl.localClippingEnabled = true;
    installDebugHook();
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [gl, setSceneReady]);

  // Listen for OS prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => useExplorerStore.getState().setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

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

  // Widen FOV to 52° in cockpit seat view so all 6 Code One LCDs (including lower-center MFD) fit comfortably
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    if (!persp.isPerspectiveCamera) return;
    const targetFov = cameraPreset === 'cockpit' ? 52 : 40;
    if (persp.fov !== targetFov) {
      persp.fov = targetFov;
      persp.updateProjectionMatrix();
    }
  }, [camera, cameraPreset]);

  // Camera preset transitions (with bounding-box auto-fit for open weapons bays + loaded stores)
  useEffect(() => {
    if (cameraPresetNonce === 0 && cameraPreset !== 'bays') return;

    if (cameraPreset === 'bays') {
      const box = new THREE.Box3();
      const baysRoot = scene.getObjectByName('animated-weapons-bays');
      if (baysRoot) {
        baysRoot.updateMatrixWorld(true);
        box.setFromObject(baysRoot);
      }
      if (box.isEmpty()) {
        box.set(new THREE.Vector3(-1.85, 0.25, -2.5), new THREE.Vector3(1.85, 1.0, 2.0));
      }
      const center = box.getCenter(new THREE.Vector3());
      const ext = box.getSize(new THREE.Vector3());
      const radius = Math.max(1.8, ext.length() * 0.5);

      const persp = camera as THREE.PerspectiveCamera;
      const fovRad = ((persp.isPerspectiveCamera ? persp.fov : 40) * Math.PI) / 180;
      const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
      const halfV = fovRad / 2;
      const halfH = Math.atan(Math.tan(halfV) * aspect);
      const minHalf = Math.min(halfV, halfH);

      // Account for mobile bottom sheet or desktop left panel
      const sheetFrac = bottomSheetHeightPx > 0 ? bottomSheetHeightPx / Math.max(300, size.height) : 0;
      const fitScale = (size.width < size.height ? 1.38 : 1.25) * (1 + sheetFrac * 0.75);
      const dist = (radius / Math.sin(minHalf)) * fitScale;

      // Below and outboard (~30° downward look angle toward open bays & stores, clamped above floor)
      const dir = new THREE.Vector3(0.76, -0.14, -0.63).normalize();
      goalTargetRef.current.copy(center);
      // Shift target slightly down on mobile when bottom sheet is open so bays sit in upper viewport
      if (sheetFrac > 0.05) {
        goalTargetRef.current.y -= radius * sheetFrac * 0.45;
      }
      goalPosRef.current.copy(goalTargetRef.current).addScaledVector(dir, dist);
      if (goalPosRef.current.y < 0.26) {
        goalPosRef.current.y = 0.26;
      }
      animatingRef.current = true;
      return;
    }

    const p = CAMERA_PRESETS[cameraPreset];
    const isCloseView = cameraPreset === 'cockpit';
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
  }, [
    camera,
    scene,
    cameraPreset,
    cameraPresetNonce,
    size.width,
    size.height,
    bottomSheetHeightPx,
    mainBayOpen,
    sideBaysOpen,
    weaponsLoadout,
  ]);

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
    const dt = Math.min(delta, 0.1);
    const store = useExplorerStore.getState();
    if (store.engineSim.phase !== 'OFF') {
      store.tickEngineSim(dt);
    }

    const es = useExplorerStore.getState().engineSim;
    const activeEngineCount = (es.left.lit ? 1 : 0) + (es.right.lit ? 1 : 0);
    const avgSpool = (es.left.n2Pct + es.right.n2Pct) / 200;
    const avgAb = (es.left.abFraction + es.right.abFraction) / 2;
    soundEngine.update({
      sourcePosM: { x: 0, y: 2.0, z: fsToZ(17.5) },
      listenerPosM: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      isInterior: store.cameraPreset === 'cockpit',
      running: es.phase !== 'OFF',
      spoolFraction: avgSpool,
      afterburnerFraction: avgAb,
      activeEngineCount,
      apuSpoolFraction: es.apuSpoolFrac,
    });

    // Adaptive quality: step down one tier on sustained frame drops (>70% frames >36 ms over 2.5 s)
    if (!store.qualityLockedByUser && store.qualityTier !== 'low' && delta < 0.5) {
      perfWindowSRef.current += delta;
      perfFramesRef.current += 1;
      if (delta > 0.036) perfSlowFramesRef.current += 1;
      if (perfWindowSRef.current >= 2.5) {
        if (
          perfFramesRef.current >= 15 &&
          perfSlowFramesRef.current / perfFramesRef.current > 0.7
        ) {
          store.stepDownQualityAdaptive();
        }
        perfWindowSRef.current = 0;
        perfFramesRef.current = 0;
        perfSlowFramesRef.current = 0;
      }
    }

    if (animatingRef.current && controlsRef.current) {
      if (store.reducedMotion) {
        camera.position.copy(goalPosRef.current);
        controlsRef.current.target.copy(goalTargetRef.current);
        controlsRef.current.update();
        animatingRef.current = false;
      } else {
        const alpha = Math.min(1, delta * 7);
        camera.position.lerp(goalPosRef.current, alpha);
        controlsRef.current.target.lerp(goalTargetRef.current, alpha);
        controlsRef.current.update();
        if (camera.position.distanceTo(goalPosRef.current) < 0.05) {
          animatingRef.current = false;
        }
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

  const isCockpitView = cameraPreset === 'cockpit';
  const isBaysView = cameraPreset === 'bays';

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={isCockpitView ? 0.45 : isBaysView ? 1.5 : 2.5}
      maxDistance={isCockpitView ? 2.2 : 75}
      minAzimuthAngle={isCockpitView ? -Math.PI / 3 : -Infinity}
      maxAzimuthAngle={isCockpitView ? Math.PI / 3 : Infinity}
      minPolarAngle={isCockpitView ? Math.PI / 3 : 0.05}
      maxPolarAngle={
        isCockpitView ? (Math.PI * 2) / 3 : isBaysView ? Math.PI * 0.72 : Math.PI / 2 - 0.01
      }
      target={[0, 2.0, 0]}
      onStart={() => {
        animatingRef.current = false;
      }}
    />
  );
}

const BASE = import.meta.env.BASE_URL;
const SSAO_COLOR = new THREE.Color('#090d14');

function PostEffects({
  qualityTier,
  afterburnerOn,
}: {
  readonly qualityTier: 'low' | 'med' | 'high';
  readonly afterburnerOn: boolean;
}) {
  if (qualityTier === 'low') return null;
  if (qualityTier === 'med' && !afterburnerOn) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={qualityTier === 'high'}>
      {qualityTier === 'high' ? (
        <SSAO
          samples={8}
          resolutionScale={0.5}
          radius={0.35}
          intensity={14}
          luminanceInfluence={0.5}
          color={SSAO_COLOR}
          worldDistanceThreshold={40}
          worldDistanceFalloff={5}
          worldProximityThreshold={0.4}
          worldProximityFalloff={0.1}
        />
      ) : (
        <></>
      )}
      {afterburnerOn ? (
        <Bloom
          mipmapBlur
          luminanceThreshold={1.08}
          intensity={0.48}
          radius={0.62}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
}

export function HangarCanvas() {
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const outdoors = useExplorerStore((s) => s.engineSim.outdoors);
  const afterburnerOn = useExplorerStore(
    (s) => s.engineSim.left.afterburnerOn || s.engineSim.right.afterburnerOn
  );
  const preset = QUALITY_PRESETS[qualityTier];

  return (
    <div className="canvas-shell" data-testid="hangar-canvas-shell">
      <Canvas
        dpr={preset.dpr}
        shadows={preset.shadows}
        gl={{
          antialias: preset.antialias,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [14.5, 6.2, -13.5], fov: 40, near: 0.08, far: 320 }}
        onPointerMissed={() => selectPart(null)}
      >
        <color attach="background" args={[outdoors ? '#556e8a' : '#1b222c']} />
        <fog attach="fog" args={[outdoors ? '#647c96' : '#1b222c', outdoors ? 70 : 52, outdoors ? 220 : 145]} />

        {qualityTier !== 'low' && (
          <Suspense fallback={null}>
            <Environment
              files={
                outdoors
                  ? `${BASE}hdri/airfield_overcast_1k.hdr`
                  : `${BASE}hdri/hangar_1k.hdr`
              }
              background
              backgroundBlurriness={outdoors ? 0.16 : 0.42}
              backgroundIntensity={outdoors ? 0.85 : 0.55}
              environmentIntensity={outdoors ? 0.88 : 0.72}
            />
          </Suspense>
        )}

        <ambientLight intensity={qualityTier === 'low' ? 0.65 : 0.35} />
        <hemisphereLight args={[outdoors ? '#dbeafe' : '#c8dcff', outdoors ? '#334155' : '#1b2430', 0.55]} />
        <directionalLight
          position={[16, 22, -14]}
          intensity={outdoors ? 1.55 : 1.35}
          castShadow={preset.shadows}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-14, 12, 14]} intensity={0.6} color="#93c5fd" />

        {outdoors ? (
          <OutdoorRunUpPad shadows={preset.shadows} />
        ) : (
          <HangarStructure shadows={preset.shadows} />
        )}

        {qualityTier !== 'low' && (
          <ContactShadows
            position={[0, 0.012, 0]}
            opacity={0.55}
            scale={28}
            blur={2.2}
            far={6}
            resolution={256}
            frames={1}
          />
        )}

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
        <PostEffects qualityTier={qualityTier} afterburnerOn={afterburnerOn} />
        <SceneController />
      </Canvas>
    </div>
  );
}
