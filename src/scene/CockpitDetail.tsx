import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { EngineSimState } from '../sim/engineSim.js';
import { fsToZ } from './f22Geometry.js';
import { COCKPIT_DISPLAY_DIMENSIONS_M } from './storeDimensions.js';
import { useExplorerStore } from '../store/explorerStore.js';

type ScreenKind =
  | 'pri-attitude'
  | 'sec-grid'
  | 'sec-stores'
  | 'ufd-left'
  | 'ufd-right'
  | 'icp'
  | 'hud';

/**
 * Redraw the Right Secondary MFD (generic engine gauges) from the live EngineSimState.
 * Driven by the exact same state as the 3D nozzles, exhaust plumes, and outside HUD.
 */
export function drawEngineMfdCanvas(
  ctx: CanvasRenderingContext2D,
  engineSim: EngineSimState
): void {
  ctx.fillStyle = '#071019';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = engineSim.left.afterburnerOn ? '#f97316' : '#1e3a52';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);

  // Header + AB indicator
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ENG · GENERIC', 16, 26);

  const abOn = engineSim.left.afterburnerOn || engineSim.right.afterburnerOn;
  ctx.fillStyle = abOn ? '#f97316' : '#1e293b';
  ctx.fillRect(156, 10, 86, 22);
  ctx.fillStyle = abOn ? '#0b1120' : '#94a3b8';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(abOn ? 'AB: ON' : 'AB: OFF', 199, 26);

  // 4 live vertical bar graphs: L N2%, R N2%, THR%, NOZ%
  const avgThrustPct = ((engineSim.left.thrustFraction + engineSim.right.thrustFraction) / 2) * 100;
  const avgNozPct = ((engineSim.left.nozzleOpenFraction + engineSim.right.nozzleOpenFraction) / 2) * 100;
  const bars = [
    { x: 24, pct: engineSim.left.n2Pct, lbl: 'L N2', col: '#38bdf8' },
    { x: 82, pct: engineSim.right.n2Pct, lbl: 'R N2', col: '#38bdf8' },
    { x: 140, pct: avgThrustPct, lbl: 'THR%', col: abOn ? '#f97316' : '#22c55e' },
    { x: 198, pct: avgNozPct, lbl: 'NOZ%', col: '#eab308' },
  ];

  const barTop = 60;
  const barMaxH = 136;
  for (const b of bars) {
    const clamped = Math.max(0, Math.min(100, b.pct));
    const h = (clamped / 100) * barMaxH;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(b.x, barTop, 34, barMaxH);
    ctx.fillStyle = b.col;
    ctx.fillRect(b.x, barTop + barMaxH - h, 34, h);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(clamped)}`, b.x + 17, barTop - 8);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(b.lbl, b.x + 17, barTop + barMaxH + 18);
  }

  // Footer regime & phase status
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  const statusLine =
    engineSim.phase === 'RUNNING'
      ? `MODE: ${engineSim.left.regime} · APU OFF`
      : `PHASE: ${engineSim.phase}`;
  ctx.fillText(statusLine, 128, 240);
}

function makeStaticScreenTexture(kind: ScreenKind): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  if (kind === 'hud') {
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = '#4ade80';
    ctx.fillStyle = '#4ade80';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 128);
    ctx.lineTo(104, 128);
    ctx.moveTo(152, 128);
    ctx.lineTo(216, 128);
    ctx.stroke();
    for (const dy of [-48, -24, 24, 48]) {
      ctx.beginPath();
      ctx.moveTo(92, 128 + dy);
      ctx.lineTo(114, 128 + dy);
      ctx.moveTo(142, 128 + dy);
      ctx.lineTo(164, 128 + dy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(128, 128, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48, 36);
    ctx.lineTo(208, 36);
    ctx.stroke();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HDG 360  GENERIC', 128, 28);
    ctx.font = '12px monospace';
    ctx.fillText('EDUCATIONAL SCHEMATIC', 128, 232);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  ctx.fillStyle = '#071019';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#1e3a52';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);

  if (kind === 'pri-attitude') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(128, 134, 78, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(40, 50, 176, 84);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(40, 134, 176, 84);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 134);
    ctx.lineTo(206, 134);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 134, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRIMARY MFD (8×8")', 128, 28);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('GENERIC ATTITUDE', 128, 238);
  } else if (kind === 'sec-grid') {
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2;
    for (let x = 32; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 36);
      ctx.lineTo(x, 224);
      ctx.stroke();
    }
    for (let y = 48; y < 224; y += 32) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(236, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    for (const r of [34, 68]) {
      ctx.beginPath();
      ctx.arc(128, 134, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SEC MFD · GRID', 128, 28);
  } else if (kind === 'sec-stores') {
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STORES · GENERIC', 128, 28);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.strokeRect(86, 68, 84, 118);
    ctx.strokeRect(48, 88, 26, 78);
    ctx.strokeRect(182, 88, 26, 78);
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '13px monospace';
    ctx.fillText('MAIN BAY', 128, 132);
    ctx.fillText('L', 61, 132);
    ctx.fillText('R', 195, 132);
  } else if (kind === 'ufd-left') {
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('UFD L · COMM', 22, 42);
    ctx.font = '16px monospace';
    ctx.fillText('VHF  121.500', 22, 92);
    ctx.fillText('UHF  243.000', 22, 134);
    ctx.fillText('NAV  GENERIC', 22, 176);
  } else if (kind === 'ufd-right') {
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('UFD R · SYS', 22, 42);
    ctx.font = '16px monospace';
    ctx.fillText('HYD A/B:  OK', 22, 92);
    ctx.fillText('ELEC:     OK', 22, 134);
    ctx.fillText('ECS:      OK', 22, 176);
  } else if (kind === 'icp') {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ICP · GENERIC', 128, 34);
    ctx.strokeStyle = '#475569';
    ctx.fillStyle = '#1e293b';
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillRect(42 + col * 60, 58 + r * 54, 48, 40);
        ctx.strokeRect(42 + col * 60, 58 + r * 54, 48, 40);
      }
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

interface BezeledDisplayProps {
  readonly position: [number, number, number];
  readonly rotation?: [number, number, number];
  readonly width: number;
  readonly height: number;
  readonly texture: THREE.CanvasTexture;
  readonly clippingPlanes: THREE.Plane[];
  readonly onSelect: () => void;
}

function BezeledDisplay({
  position,
  rotation = [0, 0, 0],
  width,
  height,
  texture,
  clippingPlanes,
  onSelect,
}: BezeledDisplayProps) {
  const bezelPad = 0.014;
  const btnCount = 4;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group position={position} rotation={rotation} onClick={handleClick}>
      <mesh>
        <boxGeometry args={[width + bezelPad * 2, height + bezelPad * 2, 0.022]} />
        <meshStandardMaterial color="#181f28" roughness={0.65} metalness={0.35} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, 0.013]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} clippingPlanes={clippingPlanes} />
      </mesh>
      {Array.from({ length: btnCount }).map((_, i) => {
        const bx = -width * 0.36 + (i / (btnCount - 1)) * (width * 0.72);
        return (
          <group key={i}>
            <mesh position={[bx, height / 2 + bezelPad * 0.5, 0.013]}>
              <boxGeometry args={[0.011, 0.007, 0.006]} />
              <meshStandardMaterial color="#64748b" clippingPlanes={clippingPlanes} />
            </mesh>
            <mesh position={[bx, -height / 2 - bezelPad * 0.5, 0.013]}>
              <boxGeometry args={[0.011, 0.007, 0.006]} />
              <meshStandardMaterial color="#64748b" clippingPlanes={clippingPlanes} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function CockpitDetail({
  clippingPlanes,
}: {
  readonly clippingPlanes: readonly THREE.Plane[];
}) {
  const selectPart = useExplorerStore((s) => s.selectPart);
  const engineSim = useExplorerStore((s) => s.engineSim);
  const cp = clippingPlanes as THREE.Plane[];

  const textures = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const engCanvas = document.createElement('canvas');
    engCanvas.width = 256;
    engCanvas.height = 256;
    const engTex = new THREE.CanvasTexture(engCanvas);
    return {
      pri: makeStaticScreenTexture('pri-attitude'),
      grid: makeStaticScreenTexture('sec-grid'),
      stores: makeStaticScreenTexture('sec-stores'),
      ufdL: makeStaticScreenTexture('ufd-left'),
      ufdR: makeStaticScreenTexture('ufd-right'),
      icp: makeStaticScreenTexture('icp'),
      hud: makeStaticScreenTexture('hud'),
      engCanvas,
      engTex,
    };
  }, []);

  // Redraw the live Right Secondary MFD whenever engineSim changes
  useEffect(() => {
    if (!textures) return;
    const ctx = textures.engCanvas.getContext('2d');
    if (!ctx) return;
    drawEngineMfdCanvas(ctx, engineSim);
    textures.engTex.needsUpdate = true;
  }, [textures, engineSim]);

  useEffect(() => {
    return () => {
      if (!textures) return;
      textures.pri.dispose();
      textures.grid.dispose();
      textures.stores.dispose();
      textures.ufdL.dispose();
      textures.ufdR.dispose();
      textures.icp.dispose();
      textures.hud.dispose();
      textures.engTex.dispose();
    };
  }, [textures]);

  if (!textures) return null;

  const zPanel = fsToZ(3.96);
  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPart(id);
  };

  const { primaryMfd, secondaryMfd, upFrontDisplay } = COCKPIT_DISPLAY_DIMENSIONS_M;
  const throttleRotX = 0.25 - engineSim.throttle * 0.55;

  return (
    <group name="cockpit-interior-detail" position={[0, 0.18, 0]}>
      {/* 1. Sculpted Glare Shield & Coaming Arch */}
      <mesh position={[0, 2.63, zPanel - 0.04]} onClick={pick('cockpit-displays-hud')}>
        <boxGeometry args={[0.92, 0.04, 0.34]} />
        <meshStandardMaterial color="#141920" roughness={0.85} metalness={0.2} clippingPlanes={cp} />
      </mesh>
      {/* Canopy Sill / Bow Frame visible from pilot seat */}
      <mesh position={[-0.50, 2.54, fsToZ(4.55)]} onClick={pick('canopy')}>
        <boxGeometry args={[0.045, 0.05, 1.85]} />
        <meshStandardMaterial color="#2a323d" metalness={0.5} roughness={0.4} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0.50, 2.54, fsToZ(4.55)]} onClick={pick('canopy')}>
        <boxGeometry args={[0.045, 0.05, 1.85]} />
        <meshStandardMaterial color="#2a323d" metalness={0.5} roughness={0.4} clippingPlanes={cp} />
      </mesh>

      {/* 2. 6 Bezeled Color LCDs (Lockheed Martin Code One sourced sizes) + ICP + HUD */}
      {/* Top Row: Left 3×4 in UFD, Center ICP, Right 3×4 in UFD */}
      <BezeledDisplay
        position={[-0.195, 2.55, zPanel + 0.035]}
        rotation={[-0.14, 0.08, 0]}
        width={upFrontDisplay.width}
        height={upFrontDisplay.height}
        texture={textures.ufdL}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0, 2.55, zPanel + 0.025]}
        rotation={[-0.14, 0, 0]}
        width={0.115}
        height={0.078}
        texture={textures.icp}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0.195, 2.55, zPanel + 0.035]}
        rotation={[-0.14, -0.08, 0]}
        width={upFrontDisplay.width}
        height={upFrontDisplay.height}
        texture={textures.ufdR}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />

      {/* Middle Row: Left 6.5×6.5 in Secondary MFD, Center 8×8 in Primary MFD, Right 6.5×6.5 in Live Engine MFD */}
      <BezeledDisplay
        position={[-0.24, 2.36, zPanel + 0.065]}
        rotation={[-0.15, 0.14, 0]}
        width={secondaryMfd.width}
        height={secondaryMfd.height}
        texture={textures.grid}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0, 2.36, zPanel + 0.045]}
        rotation={[-0.15, 0, 0]}
        width={primaryMfd.width}
        height={primaryMfd.height}
        texture={textures.pri}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0.24, 2.36, zPanel + 0.065]}
        rotation={[-0.15, -0.14, 0]}
        width={secondaryMfd.width}
        height={secondaryMfd.height}
        texture={textures.engTex}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />

      {/* Lower Center 6.5×6.5 in Secondary MFD (Stores) */}
      <BezeledDisplay
        position={[0, 2.13, zPanel + 0.105]}
        rotation={[-0.26, 0, 0]}
        width={secondaryMfd.width}
        height={secondaryMfd.height}
        texture={textures.stores}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />

      {/* Wide-Angle HUD Combiner Glass + Frame */}
      <group
        position={[0, 2.75, zPanel - 0.02]}
        rotation={[0.28, 0, 0]}
        onClick={pick('cockpit-displays-hud')}
      >
        <mesh>
          <planeGeometry args={[0.24, 0.20]} />
          <meshBasicMaterial
            map={textures.hud}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthWrite={false}
            clippingPlanes={cp}
          />
        </mesh>
        <mesh position={[-0.125, 0, 0]}>
          <boxGeometry args={[0.012, 0.21, 0.012]} />
          <meshStandardMaterial color="#334155" clippingPlanes={cp} />
        </mesh>
        <mesh position={[0.125, 0, 0]}>
          <boxGeometry args={[0.012, 0.21, 0.012]} />
          <meshStandardMaterial color="#334155" clippingPlanes={cp} />
        </mesh>
      </group>

      {/* 3. Left & Right Side Consoles */}
      <mesh position={[-0.41, 2.24, fsToZ(4.62)]} rotation={[0, 0, -0.18]} onClick={pick('cockpit-tub')}>
        <boxGeometry args={[0.18, 0.08, 1.15]} />
        <meshStandardMaterial color="#1f2732" roughness={0.7} metalness={0.25} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0.41, 2.24, fsToZ(4.62)]} rotation={[0, 0, 0.18]} onClick={pick('cockpit-tub')}>
        <boxGeometry args={[0.18, 0.08, 1.15]} />
        <meshStandardMaterial color="#1f2732" roughness={0.7} metalness={0.25} clippingPlanes={cp} />
      </mesh>

      {/* 4. Right-Hand HOTAS Side-Stick Controller */}
      <group position={[0.37, 2.34, fsToZ(4.44)]} onClick={pick('hotas-controls')}>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.032, 0.045, 0.06, 12]} />
          <meshStandardMaterial color="#111827" roughness={0.8} clippingPlanes={cp} />
        </mesh>
        <mesh position={[0, 0.07, -0.01]} rotation={[-0.18, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.020, 0.14, 12]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} clippingPlanes={cp} />
        </mesh>
      </group>

      {/* 5. Left-Hand Dual F119 Throttles (animated with live engineSim.throttle) */}
      <group position={[-0.37, 2.32, fsToZ(4.42)]} onClick={pick('hotas-controls')}>
        <mesh position={[-0.022, 0.04, 0]} rotation={[throttleRotX, 0, 0]}>
          <boxGeometry args={[0.022, 0.10, 0.045]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} clippingPlanes={cp} />
        </mesh>
        <mesh position={[0.022, 0.04, 0]} rotation={[throttleRotX, 0, 0]}>
          <boxGeometry args={[0.022, 0.10, 0.045]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} clippingPlanes={cp} />
        </mesh>
      </group>

      {/* 6. ACES II Ejection Seat Headrest & Yellow/Black Ejection Handle */}
      <group position={[0, 2.52, fsToZ(5.26)]} onClick={pick('aces-ii-seat')}>
        <mesh position={[0, 0.16, 0.06]}>
          <boxGeometry args={[0.34, 0.24, 0.12]} />
          <meshStandardMaterial color="#27303b" roughness={0.75} clippingPlanes={cp} />
        </mesh>
        <mesh position={[0, -0.22, -0.34]}>
          <torusGeometry args={[0.035, 0.008, 8, 16]} />
          <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={0.35} clippingPlanes={cp} />
        </mesh>
      </group>
    </group>
  );
}
