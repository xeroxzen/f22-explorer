import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import { getF22VlmMesh, requestVlmSolve } from '../sim/vlmClient.js';
import { evaluateVlmVelocity, type VlmControlDeflections } from '../sim/vlmSolver.js';
import { useExplorerStore } from '../store/explorerStore.js';

/**
 * Diverging Blue (-Cp suction) -> White (0) -> Red (+Cp pressure) colormap.
 */
function deltaCpToRgb(dcp: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, dcp / 1.4));
  if (t >= 0) {
    // White (#e2e8f0) -> Crimson (#dc2626)
    return [
      0.886 + (0.863 - 0.886) * t,
      0.910 + (0.149 - 0.910) * t,
      0.941 + (0.149 - 0.941) * t,
    ];
  }
  const u = -t;
  // White (#e2e8f0) -> Cobalt Blue (#2563eb)
  return [
    0.886 + (0.145 - 0.886) * u,
    0.910 + (0.388 - 0.910) * u,
    0.941 + (0.922 - 0.941) * u,
  ];
}

function Arrow3D({
  origin,
  dir,
  length,
  color,
}: {
  readonly origin: [number, number, number];
  readonly dir: [number, number, number];
  readonly length: number;
  readonly color: string;
}) {
  const clampedLen = Math.max(0.25, Math.min(4.2, length));
  const quat = useMemo(() => {
    const v = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
  }, [dir]);

  const shaftLen = Math.max(0.1, clampedLen - 0.32);
  return (
    <group position={origin} quaternion={quat}>
      <mesh position={[0, shaftLen / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, shaftLen, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, shaftLen + 0.16, 0]}>
        <coneGeometry args={[0.13, 0.34, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

export function AirflowOverlay() {
  const activeMode = useExplorerStore((s) => s.activeMode);
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const aeroAlphaDeg = useExplorerStore((s) => s.aeroAlphaDeg);
  const aeroBetaDeg = useExplorerStore((s) => s.aeroBetaDeg);
  const aeroMach = useExplorerStore((s) => s.aeroMach);
  const aeroPolhamus = useExplorerStore((s) => s.aeroPolhamus);
  const aeroShowCp = useExplorerStore((s) => s.aeroShowCp);
  const aeroShowLiftRibbon = useExplorerStore((s) => s.aeroShowLiftRibbon);
  const aeroShowStreamlines = useExplorerStore((s) => s.aeroShowStreamlines);
  const aeroShowForces = useExplorerStore((s) => s.aeroShowForces);
  const stickPitch = useExplorerStore((s) => s.stickPitch);
  const stickRoll = useExplorerStore((s) => s.stickRoll);
  const rudderYaw = useExplorerStore((s) => s.rudderYaw);
  const flaps = useExplorerStore((s) => s.flaps);
  const vlmResult = useExplorerStore((s) => s.vlmResult);
  const setVlmResult = useExplorerStore((s) => s.setVlmResult);

  const mesh = useMemo(() => getF22VlmMesh(), []);

  // Map stick + flaps + rudder directly to VLM control-surface deflections
  const deflections = useMemo<VlmControlDeflections>(() => {
    const ailMax = R.F22_AILERON_MAX_DEG.value;
    const stabMax = R.F22_STABILATOR_MAX_DEG.value;
    const rudMax = R.F22_RUDDER_MAX_DEG.value;
    const lefMax = R.F22_LEF_MAX_DEG.value;
    return {
      lefDeg: flaps * lefMax * 0.5,
      // Positive stickRoll = right-wing-down -> left aileron/flaperon TE down (+), right TE up (-)
      flaperonLeftDeg: flaps * 24 + stickRoll * 14,
      flaperonRightDeg: flaps * 24 - stickRoll * 14,
      aileronLeftDeg: stickRoll * ailMax,
      aileronRightDeg: -stickRoll * ailMax,
      // Positive stickPitch = nose up -> stabilator TE up (-)
      stabilatorLeftDeg: -(stickPitch - stickRoll * 0.35) * stabMax,
      stabilatorRightDeg: -(stickPitch + stickRoll * 0.35) * stabMax,
      rudderLeftDeg: rudderYaw * rudMax,
      rudderRightDeg: rudderYaw * rudMax,
    };
  }, [stickPitch, stickRoll, rudderYaw, flaps]);

  // Trigger off-main-thread Web Worker VLM solve whenever flow/control inputs change
  useEffect(() => {
    if (activeMode !== 'airflow') return;
    requestVlmSolve(
      {
        alphaDeg: aeroAlphaDeg,
        betaDeg: aeroBetaDeg,
        mach: aeroMach,
        polhamusVortexLift: aeroPolhamus,
        deflections,
      },
      (res) => setVlmResult(res)
    );
  }, [activeMode, aeroAlphaDeg, aeroBetaDeg, aeroMach, aeroPolhamus, deflections, setVlmResult]);

  // 1. Batched ΔCp panel geometry with diverging blue-white-red vertex colors
  const cpGeometry = useMemo(() => {
    if (!vlmResult || !aeroShowCp) return null;
    const panels = mesh.panels;
    const pos = new Float32Array(panels.length * 6 * 3);
    const col = new Float32Array(panels.length * 6 * 3);

    for (let i = 0; i < panels.length; i++) {
      const p = panels[i]!;
      const [r, g, b] = deltaCpToRgb(vlmResult.panelDeltaCp[i] ?? 0);
      // Slight normal offset (+0.035 m) so ΔCp skin doesn't z-fight with the GLB wing
      const ox = p.normal[0] * 0.035;
      const oy = p.normal[1] * 0.035;
      const oz = p.normal[2] * 0.035;

      const verts = [p.p00, p.p10, p.p11, p.p00, p.p11, p.p01];
      const base = i * 18;
      for (let v = 0; v < 6; v++) {
        const pt = verts[v]!;
        pos[base + v * 3] = pt[0] + ox;
        pos[base + v * 3 + 1] = pt[1] + oy;
        pos[base + v * 3 + 2] = pt[2] + oz;
        col[base + v * 3] = r;
        col[base + v * 3 + 1] = g;
        col[base + v * 3 + 2] = b;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  }, [mesh.panels, vlmResult, aeroShowCp]);

  useEffect(() => () => cpGeometry?.dispose(), [cpGeometry]);

  // 2. Spanwise lift distribution ribbon extruded above the wing quarter-chord
  const { ribbonGeo, ribbonLineGeo } = useMemo(() => {
    if (!vlmResult || !aeroShowLiftRibbon || vlmResult.spanwiseWingLift.length < 2) {
      return { ribbonGeo: null, ribbonLineGeo: null };
    }
    const pts = vlmResult.spanwiseWingLift;
    const scaleH = 1.65;
    const quadVerts: number[] = [];
    const topLine: number[] = [];

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const h = Math.max(-0.9, Math.min(2.8, p.cClOverCref * scaleH));
      topLine.push(p.xSpanM, p.yElevM + 0.12 + h, p.zMidM);

      if (i < pts.length - 1) {
        const q = pts[i + 1]!;
        // Skip fuselage gap between left & right wing roots
        if (Math.abs(q.xSpanM - p.xSpanM) > 1.2) continue;
        const hq = Math.max(-0.9, Math.min(2.8, q.cClOverCref * scaleH));
        const y0 = p.yElevM + 0.12;
        const y1 = q.yElevM + 0.12;
        quadVerts.push(
          p.xSpanM, y0, p.zMidM,
          q.xSpanM, y1, q.zMidM,
          q.xSpanM, y1 + hq, q.zMidM,
          p.xSpanM, y0, p.zMidM,
          q.xSpanM, y1 + hq, q.zMidM,
          p.xSpanM, y0 + h, p.zMidM
        );
      }
    }

    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.Float32BufferAttribute(quadVerts, 3));
    rGeo.computeVertexNormals();

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(topLine, 3));
    return { ribbonGeo: rGeo, ribbonLineGeo: lGeo };
  }, [vlmResult, aeroShowLiftRibbon]);

  useEffect(() => {
    return () => {
      ribbonGeo?.dispose();
      ribbonLineGeo?.dispose();
    };
  }, [ribbonGeo, ribbonLineGeo]);

  // 3. Biot-Savart Streamlines & Wingtip Vortex Particles (count scaled by quality tier)
  const streamlineData = useMemo(() => {
    if (!vlmResult || !aeroShowStreamlines) return null;
    const count = qualityTier === 'high' ? 44 : qualityTier === 'med' ? 28 : 16;
    const steps = qualityTier === 'high' ? 32 : 22;
    const ds = 0.62;
    const wingY = R.VLM_WING_Y_M.value;

    // Seed points spanning wing + dense clusters around left & right clipped wingtips (|x| ~ 6.4..7.0)
    const seeds: Array<[number, number, number]> = [];
    const tipOffsets = [-0.25, 0.0, 0.22, -0.12];
    for (const side of [-1, 1]) {
      for (let t = 0; t < tipOffsets.length; t++) {
        seeds.push([side * (6.45 + t * 0.14), wingY + tipOffsets[t]!, -2.5]);
      }
    }
    const remaining = Math.max(4, count - seeds.length);
    for (let i = 0; i < remaining; i++) {
      const frac = remaining > 1 ? i / (remaining - 1) : 0.5;
      const x = -6.2 + frac * 12.4;
      if (Math.abs(x) < 1.3) continue;
      seeds.push([x, wingY + 0.08, -4.2]);
    }

    const lines: Float32Array[] = [];
    const segPositions: number[] = [];
    const segColors: number[] = [];

    for (const seed of seeds) {
      const pts = new Float32Array(steps * 3);
      let px = seed[0];
      let py = seed[1];
      let pz = seed[2];
      const isTip = Math.abs(px) > 6.1;

      for (let s = 0; s < steps; s++) {
        pts[s * 3] = px;
        pts[s * 3 + 1] = py;
        pts[s * 3 + 2] = pz;

        // RK2 midpoint advection through Biot-Savart induced velocity + freestream
        const v1 = evaluateVlmVelocity(mesh, vlmResult.panelGamma, aeroAlphaDeg, aeroBetaDeg, [px, py, pz]);
        const mid: [number, number, number] = [
          px + v1[0] * ds * 0.5,
          py + v1[1] * ds * 0.5,
          pz + v1[2] * ds * 0.5,
        ];
        const v2 = evaluateVlmVelocity(mesh, vlmResult.panelGamma, aeroAlphaDeg, aeroBetaDeg, mid);
        const nx = px + v2[0] * ds;
        const ny = py + v2[1] * ds;
        const nz = pz + v2[2] * ds;

        if (s > 0) {
          segPositions.push(pts[(s - 1) * 3]!, pts[(s - 1) * 3 + 1]!, pts[(s - 1) * 3 + 2]!, px, py, pz);
          // Highlight wingtip vortex streamlines in warm cyan-white, inner streamlines in soft sky blue
          const fade = 1 - s / steps;
          if (isTip) {
            segColors.push(0.45, 0.88, 1.0, 0.25 + 0.55 * fade, 0.72 + 0.25 * fade, 1.0);
          } else {
            segColors.push(0.22, 0.60, 0.92, 0.15, 0.45 + 0.25 * fade, 0.85);
          }
        }
        px = nx;
        py = ny;
        pz = nz;
      }
      lines.push(pts);
    }

    const segGeo = new THREE.BufferGeometry();
    segGeo.setAttribute('position', new THREE.Float32BufferAttribute(segPositions, 3));
    segGeo.setAttribute('color', new THREE.Float32BufferAttribute(segColors, 3));

    const particlePos = new Float32Array(lines.length * 3);
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));

    return { lines, steps, segGeo, particleGeo };
  }, [mesh, vlmResult, aeroShowStreamlines, aeroAlphaDeg, aeroBetaDeg, qualityTier]);

  useEffect(() => {
    return () => {
      streamlineData?.segGeo.dispose();
      streamlineData?.particleGeo.dispose();
    };
  }, [streamlineData]);

  const phaseRef = useRef(0);
  useFrame((_, delta) => {
    if (!streamlineData) return;
    phaseRef.current = (phaseRef.current + Math.min(delta, 0.05) * 0.55) % 1;
    const attr = streamlineData.particleGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const { lines, steps } = streamlineData;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const t = (phaseRef.current + (i * 0.137) % 1) % 1;
      const fIdx = t * (steps - 2);
      const i0 = Math.floor(fIdx);
      const frac = fIdx - i0;
      const b0 = i0 * 3;
      const b1 = (i0 + 1) * 3;
      arr[i * 3] = line[b0]! + (line[b1]! - line[b0]!) * frac;
      arr[i * 3 + 1] = line[b0 + 1]! + (line[b1 + 1]! - line[b0 + 1]!) * frac;
      arr[i * 3 + 2] = line[b0 + 2]! + (line[b1 + 2]! - line[b0 + 2]!) * frac;
    }
    attr.needsUpdate = true;
  });

  if (activeMode !== 'airflow' || !vlmResult) return null;

  const refC = mesh.refMomentCenter;
  const liftLen = Math.abs(vlmResult.cl) * 2.8;
  const dragLen = Math.min(3.5, Math.sqrt(Math.max(0, vlmResult.cdi)) * 5.2);
  const rollLen = Math.abs(vlmResult.cRoll) * 45;
  const pitchLen = Math.abs(vlmResult.cPitch) * 10;

  return (
    <group name="vlm-airflow-overlay" position={[0, -0.82, 0]}>
      {/* ΔCp Diverging Pressure-Difference Panels */}
      {cpGeometry && (
        <mesh geometry={cpGeometry}>
          <meshBasicMaterial
            vertexColors
            transparent
            opacity={0.76}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Spanwise Lift Distribution Ribbon */}
      {ribbonGeo && (
        <mesh geometry={ribbonGeo}>
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {ribbonLineGeo && (
        <lineSegments geometry={ribbonLineGeo}>
          <lineBasicMaterial color="#e0f2fe" />
        </lineSegments>
      )}

      {/* Biot-Savart Streamlines & Advected Wingtip Vortex Particles */}
      {streamlineData && (
        <>
          <lineSegments geometry={streamlineData.segGeo}>
            <lineBasicMaterial vertexColors transparent opacity={0.72} />
          </lineSegments>
          <points geometry={streamlineData.particleGeo}>
            <pointsMaterial color="#f0f9ff" size={0.18} sizeAttenuation transparent opacity={0.95} />
          </points>
        </>
      )}

      {/* Consistent Scaled 3D Force & Moment Arrows */}
      {aeroShowForces && (
        <group name="vlm-force-arrows">
          {liftLen > 0.05 && (
            <Arrow3D
              origin={[refC[0], refC[1] + 0.4, refC[2]]}
              dir={[0, vlmResult.cl >= 0 ? 1 : -1, 0]}
              length={liftLen}
              color="#22c55e"
            />
          )}
          {dragLen > 0.05 && (
            <Arrow3D
              origin={[refC[0], refC[1] + 0.4, refC[2]]}
              dir={[0, 0, 1]}
              length={dragLen}
              color="#ef4444"
            />
          )}
          {rollLen > 0.12 && (
            <Arrow3D
              origin={[refC[0], refC[1] + 1.2, refC[2] - 1.5]}
              dir={[vlmResult.cRoll >= 0 ? 1 : -1, 0, 0]}
              length={rollLen}
              color="#f59e0b"
            />
          )}
          {pitchLen > 0.12 && (
            <Arrow3D
              origin={[refC[0], refC[1] + 0.6, refC[2] - 3.0]}
              dir={[0, vlmResult.cPitch >= 0 ? 1 : -1, 0]}
              length={pitchLen}
              color="#a855f7"
            />
          )}
        </group>
      )}
    </group>
  );
}
