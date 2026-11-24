import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import type { SingleEngineState } from '../sim/engineSim.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { fsToZ } from './f22Geometry.js';

const DEG = Math.PI / 180;
const SHIMMER_LAYERS = [0, 1, 2];
const DIAMOND_INDICES = [0, 1, 2, 3, 4, 5, 6];

/**
 * Single F119-PW-100 rectangular 2D-nozzle exhaust plume (visual approximation, NOT CFD).
 * - Idle & Mil power: translucent heat-shimmer distortion waves ONLY (no opaque geometry).
 * - Afterburner: rectangular exit cross-section matching the 2D nozzles, translucent flame
 *   envelope, and 7 visibly discrete Mach shock diamonds that fade smoothly with distance.
 */
function SingleNozzlePlume({
  xPos,
  engine,
  nozzlePitchRad,
  reducedMotion,
  clippingPlanes,
}: {
  readonly xPos: number;
  readonly engine: SingleEngineState;
  readonly nozzlePitchRad: number;
  readonly reducedMotion: boolean;
  readonly clippingPlanes: THREE.Plane[];
}) {
  const shimmerGroupRef = useRef<THREE.Group>(null);
  const abOuterRef = useRef<THREE.Mesh>(null);
  const diamondsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    const jitter = 1 + Math.sin(t * 38 + xPos * 7) * 0.025 + Math.cos(t * 61) * 0.015;
    if (shimmerGroupRef.current) {
      shimmerGroupRef.current.children.forEach((child, idx) => {
        child.position.y = Math.sin(t * (14 + idx * 5) + xPos * 3 + idx) * 0.018;
      });
    }
    if (abOuterRef.current) {
      abOuterRef.current.scale.set(1, jitter, 1);
    }
    if (diamondsRef.current) {
      diamondsRef.current.scale.set(1, 1, 1 + Math.sin(t * 46) * 0.02);
    }
  });

  if (!engine.lit) return null;

  const zExit = fsToZ(18.88);
  const ab = engine.abFraction;
  const dryNorm = Math.max(0, Math.min(1, (engine.n2Pct - 62) / 38));
  const shimmerLen = 2.4 + dryNorm * 2.8;
  const abLen = 3.8 + ab * 3.2;

  // Rectangular 2D-nozzle aspect ratio (wider horizontally than tall, opens taller in AB)
  const rectScaleY = 0.44 + engine.nozzleOpenFraction * 0.16;

  return (
    <group
      position={[xPos, 2.02, zExit]}
      rotation={[nozzlePitchRad, 0, 0]}
      scale={[1.0, rectScaleY, 1.0]}
    >
      {/* Idle & Military Power: pure translucent heat-shimmer distortion waves (NO opaque geometry) */}
      {!engine.afterburnerOn && (
        <group ref={shimmerGroupRef}>
          {SHIMMER_LAYERS.map((layer) => {
            const len = shimmerLen * (0.72 + layer * 0.18);
            const rExit = 0.36 + layer * 0.06;
            const rFar = 0.18 + layer * 0.08;
            return (
              <mesh
                key={layer}
                position={[0, 0, len / 2 + layer * 0.12]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[rFar, rExit, len, 12, 1, true]} />
                <meshBasicMaterial
                  color={layer === 0 ? '#e2e8f0' : '#94a3b8'}
                  transparent
                  opacity={(0.055 + dryNorm * 0.045) * (1 - layer * 0.25)}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                  clippingPlanes={clippingPlanes}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Afterburner: rectangular translucent flame + 7 visibly discrete fading Mach shock diamonds */}
      {engine.afterburnerOn && (
        <group>
          {/* Outer translucent rectangular-section AB flame envelope */}
          <mesh
            ref={abOuterRef}
            position={[0, 0, abLen / 2]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.14, 0.44, abLen, 16, 1, true]} />
            <meshBasicMaterial
              color="#ea580c"
              transparent
              opacity={0.14 + ab * 0.12}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* Subtle blue-violet stoichiometric inner shear envelope */}
          <mesh position={[0, 0, abLen * 0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.10, 0.30, abLen * 0.64, 14, 1, true]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.10 + ab * 0.08}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* 7 Discrete Mach shock diamonds spaced cleanly apart, fading smoothly with distance */}
          <group ref={diamondsRef}>
            {DIAMOND_INDICES.map((i) => {
              const frac = (i + 0.45) / (DIAMOND_INDICES.length + 0.3);
              const dz = 0.28 + frac * abLen * 0.88;
              const fade = Math.pow(1 - frac, 1.25);
              const radius = (0.24 - frac * 0.11) * (0.72 + ab * 0.28);
              const diamondLen = 0.28 * (1 - frac * 0.25); // compact axial length -> discrete gaps!
              return (
                <mesh
                  key={i}
                  position={[0, 0, dz]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[1.05, diamondLen / Math.max(0.05, radius), 0.95]}
                >
                  <octahedronGeometry args={[radius, 0]} />
                  <meshBasicMaterial
                    color={i < 2 ? '#ffffff' : i < 4 ? '#fef08a' : '#fb923c'}
                    transparent
                    opacity={Math.max(0.14, fade * (0.65 + ab * 0.32))}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    clippingPlanes={clippingPlanes}
                  />
                </mesh>
              );
            })}
          </group>

          {/* Warm point light illuminating aft nozzles & run-up pad */}
          <pointLight
            position={[0, 0, 1.4]}
            color="#fb923c"
            intensity={3.0 * ab}
            distance={14}
            decay={2}
          />
        </group>
      )}
    </group>
  );
}

export function ExhaustPlume({
  clippingPlanes,
}: {
  readonly clippingPlanes: readonly THREE.Plane[];
}) {
  const engineSim = useExplorerStore((s) => s.engineSim);
  const nozzlePitch = useExplorerStore((s) => s.nozzlePitch);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const reducedMotion = useExplorerStore((s) => s.reducedMotion);

  if (explodeFactor > 0.05 || engineSim.phase === 'OFF') return null;

  const pitchRad = nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value * DEG;
  const cp = clippingPlanes as THREE.Plane[];

  return (
    <group name="f119-exhaust-plumes">
      <SingleNozzlePlume
        xPos={-0.78}
        engine={engineSim.left}
        nozzlePitchRad={pitchRad}
        reducedMotion={reducedMotion}
        clippingPlanes={cp}
      />
      <SingleNozzlePlume
        xPos={0.78}
        engine={engineSim.right}
        nozzlePitchRad={pitchRad}
        reducedMotion={reducedMotion}
        clippingPlanes={cp}
      />
    </group>
  );
}
