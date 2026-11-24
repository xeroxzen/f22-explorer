import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import type { SingleEngineState } from '../sim/engineSim.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { fsToZ } from './f22Geometry.js';

const DEG = Math.PI / 180;
const DIAMOND_INDICES = [0, 1, 2, 3, 4, 5, 6];

/**
 * Open-ended lofted plume shell whose exit cross-section is genuinely rectangular
 * (matching the F-22's 2D thrust-vectoring nozzle aspect ratio) for the first
 * ~1.5 nozzle widths, then smoothly relaxes via superellipse interpolation toward
 * a tapered oval/round tail. Zero end caps so no rounded cylinder cap is ever visible.
 */
function createRectToRoundPlumeGeometry(
  exitHalfW: number,
  exitHalfH: number,
  length: number,
  radialSegs = 28,
  lengthSegs = 14
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iz = 0; iz <= lengthSegs; iz++) {
    const t = iz / lengthSegs; // 0 = nozzle exit, 1 = plume tip
    const z = t * length;
    // Stay strictly rectangular for first ~25% (~1.5–2 nozzle widths), then relax to round (p = 2)
    const relaxT = Math.max(0, (t - 0.24) / 0.76);
    const p = 10 - relaxT * 8; // superellipse exponent: 10 (rectangular) -> 2 (round)
    const taper = 1 - t * 0.72;
    const hw = exitHalfW * taper;
    const hh = exitHalfH * (1 - t * 0.52);

    for (let ir = 0; ir <= radialSegs; ir++) {
      const theta = (ir / radialSegs) * Math.PI * 2;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p) * hw;
      const y = Math.sign(st) * Math.pow(Math.abs(st), 2 / p) * hh;
      positions.push(x, y, z);
    }
  }

  const stride = radialSegs + 1;
  for (let iz = 0; iz < lengthSegs; iz++) {
    for (let ir = 0; ir < radialSegs; ir++) {
      const a = iz * stride + ir;
      const b = a + 1;
      const c = (iz + 1) * stride + ir;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Single F119-PW-100 rectangular 2D-nozzle exhaust plume (visual approximation, NOT CFD).
 * - Idle & Mil: NO opaque or white geometry and NO tubes at any tier; at MED/HIGH shows only
 *   an ultra-subtle <= 8%-opacity heat-haze ribbon; at LOW renders nothing.
 * - Afterburner: genuinely rectangular exit cross-section relaxing toward round (open-ended,
 *   zero end caps), translucent flame envelope, and 7 discrete fading Mach shock diamonds.
 */
function SingleNozzlePlume({
  xPos,
  engine,
  nozzlePitchRad,
  reducedMotion,
  qualityTier,
  clippingPlanes,
}: {
  readonly xPos: number;
  readonly engine: SingleEngineState;
  readonly nozzlePitchRad: number;
  readonly reducedMotion: boolean;
  readonly qualityTier: 'low' | 'med' | 'high';
  readonly clippingPlanes: THREE.Plane[];
}) {
  const hazeRef = useRef<THREE.Group>(null);
  const abOuterRef = useRef<THREE.Mesh>(null);
  const diamondsRef = useRef<THREE.Group>(null);

  const outerPlumeGeo = useMemo(
    () => createRectToRoundPlumeGeometry(0.41, 0.24, 1.0, 28, 14),
    []
  );
  const innerPlumeGeo = useMemo(
    () => createRectToRoundPlumeGeometry(0.28, 0.16, 1.0, 24, 10),
    []
  );

  useEffect(() => {
    return () => {
      outerPlumeGeo.dispose();
      innerPlumeGeo.dispose();
    };
  }, [outerPlumeGeo, innerPlumeGeo]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (hazeRef.current) {
      hazeRef.current.position.y = Math.sin(t * 18 + xPos * 5) * 0.014;
    }
    if (abOuterRef.current) {
      const jitter = 1 + Math.sin(t * 38 + xPos * 7) * 0.02 + Math.cos(t * 61) * 0.015;
      abOuterRef.current.scale.y = jitter;
    }
    if (diamondsRef.current) {
      diamondsRef.current.scale.z = 1 + Math.sin(t * 46) * 0.02;
    }
  });

  if (!engine.lit) return null;

  const zExit = fsToZ(18.88);
  const ab = engine.abFraction;
  const dryNorm = Math.max(0, Math.min(1, (engine.n2Pct - 62) / 38));
  const shimmerLen = 2.6 + dryNorm * 2.6;
  const abLen = 3.8 + ab * 3.2;

  return (
    <group position={[xPos, 2.02, zExit]} rotation={[nozzlePitchRad, 0, 0]}>
      {/* Idle & Military Power: NO tubes, NO opaque/white geometry.
          At LOW tier: render nothing; at MED/HIGH: ultra-subtle <= 0.08 opacity heat-haze planes. */}
      {!engine.afterburnerOn && qualityTier !== 'low' && (
        <group ref={hazeRef}>
          <mesh position={[0, 0, shimmerLen / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.74, shimmerLen]} />
            <meshBasicMaterial
              color="#94a3b8"
              transparent
              opacity={0.04 + dryNorm * 0.04}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
          <mesh position={[0, 0, shimmerLen / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[shimmerLen, 0.32]} />
            <meshBasicMaterial
              color="#94a3b8"
              transparent
              opacity={0.035 + dryNorm * 0.035}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        </group>
      )}

      {/* Afterburner: rectangular exit cross-section relaxing toward round + 7 discrete fading shock diamonds */}
      {engine.afterburnerOn && (
        <group>
          {/* Outer open-ended rectangular-to-round translucent AB flame */}
          <mesh ref={abOuterRef} geometry={outerPlumeGeo} scale={[1, 1, abLen]}>
            <meshBasicMaterial
              color="#ea580c"
              transparent
              opacity={0.18 + ab * 0.14}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* Subtle stoichiometric inner blue-amber shear envelope (rectangular-to-round, open-ended) */}
          <mesh geometry={innerPlumeGeo} scale={[1, 1, abLen * 0.62]}>
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
              const dz = 0.32 + frac * abLen * 0.88;
              const fade = Math.pow(1 - frac, 1.3);
              const widthR = (0.28 - frac * 0.14) * (0.72 + ab * 0.28);
              const heightR = widthR * (0.52 + frac * 0.35); // rectangular aspect near exit -> rounder aft
              const diamondLen = 0.26 * (1 - frac * 0.25);
              return (
                <mesh
                  key={i}
                  position={[0, 0, dz]}
                  scale={[widthR, heightR, diamondLen]}
                >
                  <octahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial
                    color={i < 2 ? '#ffffff' : i < 4 ? '#fef08a' : '#fb923c'}
                    transparent
                    opacity={Math.max(0.12, fade * (0.68 + ab * 0.30))}
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
  const qualityTier = useExplorerStore((s) => s.qualityTier);

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
        qualityTier={qualityTier}
        clippingPlanes={cp}
      />
      <SingleNozzlePlume
        xPos={0.78}
        engine={engineSim.right}
        nozzlePitchRad={pitchRad}
        reducedMotion={reducedMotion}
        qualityTier={qualityTier}
        clippingPlanes={cp}
      />
    </group>
  );
}
