import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import type { SingleEngineState } from '../sim/engineSim.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { fsToZ } from './f22Geometry.js';

const DEG = Math.PI / 180;
const DIAMOND_INDICES = [0, 1, 2, 3, 4, 5];

/**
 * Single F119 exhaust plume visual approximation (NOT CFD).
 * - Idle / Mil power: subtle translucent heat shimmer + warm inner turbine glow.
 * - Afterburner: luminous orange-white flame cone + 6 Mach shock diamonds + warm rear light.
 */
function SingleNozzlePlume({
  xPos,
  engine,
  nozzlePitchRad,
  clippingPlanes,
}: {
  readonly xPos: number;
  readonly engine: SingleEngineState;
  readonly nozzlePitchRad: number;
  readonly clippingPlanes: THREE.Plane[];
}) {
  const shimmerRef = useRef<THREE.Mesh>(null);
  const abOuterRef = useRef<THREE.Mesh>(null);
  const abCoreRef = useRef<THREE.Mesh>(null);
  const diamondsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const jitter = 1 + Math.sin(t * 42 + xPos * 7) * 0.035 + Math.cos(t * 67) * 0.02;
    if (shimmerRef.current) {
      shimmerRef.current.scale.set(1, jitter, 1);
    }
    if (abOuterRef.current) {
      abOuterRef.current.scale.set(1, jitter, 1);
    }
    if (abCoreRef.current) {
      abCoreRef.current.scale.set(1, 1 + Math.sin(t * 58 + xPos) * 0.04, 1);
    }
    if (diamondsRef.current) {
      diamondsRef.current.scale.set(1, 1, 1 + Math.sin(t * 50) * 0.025);
    }
  });

  if (!engine.lit) return null;

  const zExit = fsToZ(18.88);
  const ab = engine.abFraction;
  const dryNorm = Math.max(0, Math.min(1, (engine.n2Pct - 62) / 38));
  const shimmerLen = 2.0 + dryNorm * 2.2;
  const abLen = 3.2 + ab * 3.4;

  return (
    <group position={[xPos, 2.02, zExit]} rotation={[nozzlePitchRad, 0, 0]}>
      {/* Warm inner nozzle turbine glow */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[0.78, 0.34 + engine.nozzleOpenFraction * 0.24]} />
        <meshBasicMaterial
          color={engine.afterburnerOn ? '#ffedd5' : '#f97316'}
          transparent
          opacity={engine.afterburnerOn ? 0.92 : 0.28 + dryNorm * 0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* Idle & Military Power heat shimmer cone (visual approximation) */}
      <mesh
        ref={shimmerRef}
        position={[0, 0, shimmerLen / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.16, 0.42, shimmerLen, 14, 1, true]} />
        <meshBasicMaterial
          color={dryNorm > 0.3 ? '#fed7aa' : '#cbd5e1'}
          transparent
          opacity={0.11 + dryNorm * 0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          clippingPlanes={clippingPlanes}
        />
      </mesh>

      {/* Afterburner flame cone + Mach shock diamonds (ONLY in AB) */}
      {engine.afterburnerOn && (
        <group>
          {/* Outer translucent orange-red afterburner envelope */}
          <mesh
            ref={abOuterRef}
            position={[0, 0, abLen / 2]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.10, 0.44, abLen, 16, 1, true]} />
            <meshBasicMaterial
              color="#ea580c"
              transparent
              opacity={0.22 + ab * 0.14}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* Soft inner amber-blue core (kept subtle so shock diamonds pop cleanly) */}
          <mesh
            ref={abCoreRef}
            position={[0, 0, abLen * 0.35]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.06, 0.24, abLen * 0.7, 14, 1, true]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.14 + ab * 0.12}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* 6 Crisp Luminous Mach shock diamonds spaced along plume axis */}
          <group ref={diamondsRef}>
            {DIAMOND_INDICES.map((i) => {
              const frac = (i + 0.55) / (DIAMOND_INDICES.length + 0.5);
              const dz = frac * abLen * 0.90;
              const radius = (0.27 - frac * 0.14) * (0.7 + ab * 0.3);
              const len = 0.44 * (1 - frac * 0.30);
              return (
                <mesh
                  key={i}
                  position={[0, 0, dz]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[1, len / Math.max(0.05, radius), 1]}
                >
                  <octahedronGeometry args={[radius, 0]} />
                  <meshBasicMaterial
                    color={i % 2 === 0 ? '#ffffff' : '#fef08a'}
                    transparent
                    opacity={Math.max(0.45, (0.95 - frac * 0.38) * (0.6 + ab * 0.4))}
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
            intensity={3.5 * ab}
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

  if (explodeFactor > 0.05 || engineSim.phase === 'OFF') return null;

  const pitchRad = nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value * DEG;
  const cp = clippingPlanes as THREE.Plane[];

  return (
    <group name="f119-exhaust-plumes">
      <SingleNozzlePlume
        xPos={-0.78}
        engine={engineSim.left}
        nozzlePitchRad={pitchRad}
        clippingPlanes={cp}
      />
      <SingleNozzlePlume
        xPos={0.78}
        engine={engineSim.right}
        nozzlePitchRad={pitchRad}
        clippingPlanes={cp}
      />
    </group>
  );
}
