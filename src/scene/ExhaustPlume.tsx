import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import type { SingleEngineState } from '../sim/engineSim.js';
import { useExplorerStore } from '../store/explorerStore.js';

const DEG = Math.PI / 180;
const DIAMOND_INDICES = [0, 1, 2, 3, 4, 5, 6];

/**
 * Emissive axial color gradient for the AB outer flame:
 * brightest blue-white at the nozzle exit -> hot orange -> deep amber -> transparent.
 */
function createFlameGradientTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#e0f2fe');
  grad.addColorStop(0.14, '#fde68a');
  grad.addColorStop(0.42, '#f97316');
  grad.addColorStop(0.78, '#c2410c');
  grad.addColorStop(1.0, '#431407');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Axial feather alpha map so the open-ended rectangular-to-round AB plume
 * dissolves smoothly to 0% opacity at the far end (zero visible end caps or rings).
 */
function createAxialFadeTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.28, '#e0e0e0');
  grad.addColorStop(0.72, '#555555');
  grad.addColorStop(1.0, '#000000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Open-ended lofted plume shell whose exit cross-section is genuinely rectangular
 * (matching the F-22's 2D thrust-vectoring nozzle aspect ratio) for the first
 * ~1.5–2 nozzle widths, then smoothly relaxes via superellipse interpolation toward
 * a feathered round tail with UV.y = 1 - t for axial alpha fadeout. Zero end caps.
 */
function createRectToRoundPlumeGeometry(
  exitHalfW: number,
  exitHalfH: number,
  length: number,
  radialSegs = 28,
  lengthSegs = 16
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iz = 0; iz <= lengthSegs; iz++) {
    const t = iz / lengthSegs; // 0 = nozzle exit, 1 = feathered tip
    const z = t * length;
    const relaxT = Math.max(0, (t - 0.25) / 0.75);
    const p = 12 - relaxT * 10; // superellipse exponent: 12 (rectangular) -> 2 (round)
    const taper = Math.max(0.05, 1 - t * 0.92);
    const hw = exitHalfW * taper;
    const hh = exitHalfH * Math.max(0.05, 1 - t * 0.86);

    for (let ir = 0; ir <= radialSegs; ir++) {
      const u = ir / radialSegs;
      const theta = u * Math.PI * 2;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / p) * hw;
      const y = Math.sign(st) * Math.pow(Math.abs(st), 2 / p) * hh;
      positions.push(x, y, z);
      uvs.push(u, 1 - t);
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
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Single F119-PW-100 rectangular 2D-nozzle exhaust plume (visual approximation, NOT CFD).
 * - Idle & Mil: NO opaque or white geometry and NO tubes at any tier; at MED/HIGH shows only
 *   an ultra-subtle <= 8%-opacity heat-haze ribbon; at LOW renders nothing.
 * - Afterburner: emissive gradient (blue-white exit -> orange -> transparent), rectangular-to-round
 *   open-ended envelope (no end caps), bloom strictly on the inner blue-white core & shock diamonds.
 */
function SingleNozzlePlume({
  xPos,
  engine,
  nozzlePitchRad,
  reducedMotion,
  qualityTier,
  flameMap,
  alphaMap,
  clippingPlanes,
}: {
  readonly xPos: number;
  readonly engine: SingleEngineState;
  readonly nozzlePitchRad: number;
  readonly reducedMotion: boolean;
  readonly qualityTier: 'low' | 'med' | 'high';
  readonly flameMap: THREE.CanvasTexture | null;
  readonly alphaMap: THREE.CanvasTexture | null;
  readonly clippingPlanes: THREE.Plane[];
}) {
  const hazeRef = useRef<THREE.Group>(null);
  const abOuterRef = useRef<THREE.Mesh>(null);
  const diamondsRef = useRef<THREE.Group>(null);

  const outerPlumeGeo = useMemo(
    () => createRectToRoundPlumeGeometry(0.38, 0.22, 1.0, 28, 16),
    []
  );
  const innerCoreGeo = useMemo(
    () => createRectToRoundPlumeGeometry(0.22, 0.13, 1.0, 24, 12),
    []
  );

  useEffect(() => {
    return () => {
      outerPlumeGeo.dispose();
      innerCoreGeo.dispose();
    };
  }, [outerPlumeGeo, innerCoreGeo]);

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

  // Aligned directly to NLM GLB 2D nozzle exit plane (glTF X = ±0.74 m, Y = 0.90 m, Z = +6.26 m)
  const zExit = 6.26;
  const ab = engine.abFraction;
  const dryNorm = Math.max(0, Math.min(1, (engine.n2Pct - 62) / 38));
  const shimmerLen = 2.6 + dryNorm * 2.6;
  const abLen = 4.2 + ab * 3.0;

  return (
    <group position={[xPos, 0.90, zExit]} rotation={[nozzlePitchRad, 0, 0]}>
      {/* Idle & Military Power: NO tubes, NO opaque/white geometry.
          At LOW tier: render nothing; at MED/HIGH: ultra-subtle <= 0.08 opacity heat-haze planes. */}
      {!engine.afterburnerOn && qualityTier !== 'low' && (
        <group ref={hazeRef}>
          <mesh position={[0, 0, shimmerLen / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.72, shimmerLen]} />
            <meshBasicMaterial
              color="#94a3b8"
              alphaMap={alphaMap}
              transparent
              opacity={0.04 + dryNorm * 0.04}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
          <mesh position={[0, 0, shimmerLen / 2]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[shimmerLen, 0.30]} />
            <meshBasicMaterial
              color="#94a3b8"
              alphaMap={alphaMap}
              transparent
              opacity={0.035 + dryNorm * 0.035}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>
        </group>
      )}

      {/* Afterburner: emissive gradient outer flame (below bloom threshold) + HDR bloomed blue-white core & shock diamonds */}
      {engine.afterburnerOn && (
        <group>
          {/* Outer open-ended rectangular-to-round translucent AB flame (toneMapped=true -> no bloom halo) */}
          <mesh ref={abOuterRef} geometry={outerPlumeGeo} scale={[1, 1, abLen]}>
            <meshBasicMaterial
              map={flameMap}
              alphaMap={alphaMap}
              transparent
              opacity={0.34 + ab * 0.18}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* Bright blue-white nozzle-exit core (HDR toneMapped=false -> triggers subtle bloom on core only!) */}
          <mesh geometry={innerCoreGeo} scale={[1, 1, abLen * 0.42]}>
            <meshBasicMaterial
              color={[1.65, 1.95, 2.4] as unknown as THREE.ColorRepresentation}
              alphaMap={alphaMap}
              toneMapped={false}
              transparent
              opacity={0.28 + ab * 0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
            />
          </mesh>

          {/* 7 Discrete Mach shock diamonds strictly inside the flame envelope, fading with distance */}
          <group ref={diamondsRef}>
            {DIAMOND_INDICES.map((i) => {
              const frac = (i + 0.45) / (DIAMOND_INDICES.length + 0.65);
              const dz = 0.28 + frac * abLen * 0.78;
              const envT = dz / abLen;
              const envHalfW = 0.38 * Math.max(0.05, 1 - envT * 0.92);
              const envHalfH = 0.22 * Math.max(0.05, 1 - envT * 0.86);
              const fade = Math.pow(1 - frac, 1.35);
              const widthR = envHalfW * 0.58 * (0.75 + ab * 0.25);
              const heightR = envHalfH * 0.58 * (0.75 + ab * 0.25);
              const diamondLen = 0.23 * (1 - frac * 0.28);
              const isCoreDiamond = i < 3;
              return (
                <mesh
                  key={i}
                  position={[0, 0, dz]}
                  scale={[widthR, heightR, diamondLen]}
                >
                  <octahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial
                    color={
                      i === 0
                        ? ([2.2, 2.4, 2.8] as unknown as THREE.ColorRepresentation)
                        : isCoreDiamond
                          ? ([2.1, 1.85, 1.25] as unknown as THREE.ColorRepresentation)
                          : '#f97316'
                    }
                    toneMapped={!isCoreDiamond}
                    transparent
                    opacity={Math.max(0.12, fade * (0.72 + ab * 0.26))}
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

  const flameMap = useMemo(() => createFlameGradientTexture(), []);
  const alphaMap = useMemo(() => createAxialFadeTexture(), []);
  useEffect(() => {
    return () => {
      flameMap?.dispose();
      alphaMap?.dispose();
    };
  }, [flameMap, alphaMap]);

  if (explodeFactor > 0.05 || engineSim.phase === 'OFF') return null;

  const pitchRad = nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value * DEG;
  const cp = clippingPlanes as THREE.Plane[];

  return (
    <group name="f119-exhaust-plumes">
      <SingleNozzlePlume
        xPos={-0.74}
        engine={engineSim.left}
        nozzlePitchRad={pitchRad}
        reducedMotion={reducedMotion}
        qualityTier={qualityTier}
        flameMap={flameMap}
        alphaMap={alphaMap}
        clippingPlanes={cp}
      />
      <SingleNozzlePlume
        xPos={0.74}
        engine={engineSim.right}
        nozzlePitchRad={pitchRad}
        reducedMotion={reducedMotion}
        qualityTier={qualityTier}
        flameMap={flameMap}
        alphaMap={alphaMap}
        clippingPlanes={cp}
      />
    </group>
  );
}
