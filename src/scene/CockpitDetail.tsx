import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { fsToZ } from './f22Geometry.js';
import { useExplorerStore } from '../store/explorerStore.js';

type ScreenKind =
  | 'pri-attitude'
  | 'sec-grid'
  | 'sec-engine'
  | 'sec-stores'
  | 'ufd-left'
  | 'ufd-right'
  | 'icp'
  | 'hud';

function makeScreenTexture(kind: ScreenKind): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  if (kind === 'hud') {
    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = '#4ade80';
    ctx.fillStyle = '#4ade80';
    ctx.lineWidth = 3;
    // Generic pitch ladder & horizon line
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
    // Center reticle
    ctx.beginPath();
    ctx.arc(128, 128, 10, 0, Math.PI * 2);
    ctx.stroke();
    // Top heading tape
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

  // Dark CRT/LCD background
  ctx.fillStyle = '#071019';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#1e3a52';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 248);

  if (kind === 'pri-attitude') {
    // Generic attitude ball (blue sky / brown ground)
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
    ctx.fillText('PRIMARY MFD', 128, 28);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('GENERIC ATTITUDE', 128, 238);
  } else if (kind === 'sec-grid') {
    // Generic tactical range rings & map grid
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
  } else if (kind === 'sec-engine') {
    // Generic twin-engine vertical bar graphs
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENGINE · GENERIC', 128, 28);
    const bars = [
      { x: 42, h: 120, lbl: 'L N2', col: '#38bdf8' },
      { x: 92, h: 118, lbl: 'R N2', col: '#38bdf8' },
      { x: 146, h: 95, lbl: 'EGT', col: '#f59e0b' },
      { x: 196, h: 135, lbl: 'FUEL', col: '#22c55e' },
    ];
    for (const b of bars) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x, 54, 28, 150);
      ctx.fillStyle = b.col;
      ctx.fillRect(b.x, 204 - b.h, 28, b.h);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px monospace';
      ctx.fillText(b.lbl, b.x + 14, 226);
    }
  } else if (kind === 'sec-stores') {
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STORES · GENERIC', 128, 28);
    // Simple generic wing/bay box schematic
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
  const bezelPad = 0.018;
  const btnCount = 4;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <group position={position} rotation={rotation} onClick={handleClick}>
      {/* Matte dark outer bezel */}
      <mesh>
        <boxGeometry args={[width + bezelPad * 2, height + bezelPad * 2, 0.022]} />
        <meshStandardMaterial color="#181f28" roughness={0.65} metalness={0.35} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Glowing generic LCD screen */}
      <mesh position={[0, 0, 0.013]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Perimeter bezel option select buttons (top & bottom rows) */}
      {Array.from({ length: btnCount }).map((_, i) => {
        const bx = -width * 0.36 + (i / (btnCount - 1)) * (width * 0.72);
        return (
          <group key={i}>
            <mesh position={[bx, height / 2 + bezelPad * 0.5, 0.013]}>
              <boxGeometry args={[0.012, 0.008, 0.006]} />
              <meshStandardMaterial color="#64748b" clippingPlanes={clippingPlanes} />
            </mesh>
            <mesh position={[bx, -height / 2 - bezelPad * 0.5, 0.013]}>
              <boxGeometry args={[0.012, 0.008, 0.006]} />
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
  const cp = clippingPlanes as THREE.Plane[];

  const textures = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return {
      pri: makeScreenTexture('pri-attitude'),
      grid: makeScreenTexture('sec-grid'),
      eng: makeScreenTexture('sec-engine'),
      stores: makeScreenTexture('sec-stores'),
      ufdL: makeScreenTexture('ufd-left'),
      ufdR: makeScreenTexture('ufd-right'),
      icp: makeScreenTexture('icp'),
      hud: makeScreenTexture('hud'),
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!textures) return;
      Object.values(textures).forEach((t) => t.dispose());
    };
  }, [textures]);

  if (!textures) return null;

  const zPanel = fsToZ(3.96);
  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPart(id);
  };

  return (
    <group name="cockpit-interior-detail">
      {/* 1. Sculpted Glare Shield & Coaming Arch */}
      <mesh position={[0, 2.60, zPanel - 0.04]} onClick={pick('cockpit-displays-hud')}>
        <boxGeometry args={[0.88, 0.04, 0.34]} />
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

      {/* 2. 6 Bezeled Color LCDs + ICP + Wide-Angle HUD */}
      {/* Top Row: Left UFD, Center ICP, Right UFD */}
      <BezeledDisplay
        position={[-0.20, 2.51, zPanel + 0.04]}
        rotation={[-0.14, 0.08, 0]}
        width={0.105}
        height={0.085}
        texture={textures.ufdL}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0, 2.51, zPanel + 0.03]}
        rotation={[-0.14, 0, 0]}
        width={0.12}
        height={0.085}
        texture={textures.icp}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0.20, 2.51, zPanel + 0.04]}
        rotation={[-0.14, -0.08, 0]}
        width={0.105}
        height={0.085}
        texture={textures.ufdR}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />

      {/* Middle Row: Left Secondary MFD, Center Primary MFD (8"x8"), Right Secondary MFD */}
      <BezeledDisplay
        position={[-0.25, 2.34, zPanel + 0.07]}
        rotation={[-0.16, 0.14, 0]}
        width={0.14}
        height={0.14}
        texture={textures.grid}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0, 2.34, zPanel + 0.05]}
        rotation={[-0.16, 0, 0]}
        width={0.19}
        height={0.18}
        texture={textures.pri}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />
      <BezeledDisplay
        position={[0.25, 2.34, zPanel + 0.07]}
        rotation={[-0.16, -0.14, 0]}
        width={0.14}
        height={0.14}
        texture={textures.eng}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />

      {/* Lower Center Secondary MFD */}
      <BezeledDisplay
        position={[0, 2.15, zPanel + 0.10]}
        rotation={[-0.24, 0, 0]}
        width={0.14}
        height={0.12}
        texture={textures.stores}
        clippingPlanes={cp}
        onSelect={() => selectPart('cockpit-displays-hud')}
      />

      {/* Wide-Angle HUD Combiner Glass + Frame */}
      <group
        position={[0, 2.74, zPanel - 0.02]}
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
      <mesh position={[-0.41, 2.26, fsToZ(4.62)]} rotation={[0, 0, -0.18]} onClick={pick('cockpit-tub')}>
        <boxGeometry args={[0.18, 0.08, 1.15]} />
        <meshStandardMaterial color="#1f2732" roughness={0.7} metalness={0.25} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0.41, 2.26, fsToZ(4.62)]} rotation={[0, 0, 0.18]} onClick={pick('cockpit-tub')}>
        <boxGeometry args={[0.18, 0.08, 1.15]} />
        <meshStandardMaterial color="#1f2732" roughness={0.7} metalness={0.25} clippingPlanes={cp} />
      </mesh>

      {/* 4. Right-Hand HOTAS Side-Stick Controller */}
      <group position={[0.37, 2.36, fsToZ(4.44)]} onClick={pick('hotas-controls')}>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.032, 0.045, 0.06, 12]} />
          <meshStandardMaterial color="#111827" roughness={0.8} clippingPlanes={cp} />
        </mesh>
        <mesh position={[0, 0.07, -0.01]} rotation={[-0.18, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.020, 0.14, 12]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} clippingPlanes={cp} />
        </mesh>
      </group>

      {/* 5. Left-Hand Dual F119 Throttles */}
      <group position={[-0.37, 2.34, fsToZ(4.42)]} onClick={pick('hotas-controls')}>
        <mesh position={[-0.022, 0.04, 0]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.022, 0.10, 0.045]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} clippingPlanes={cp} />
        </mesh>
        <mesh position={[0.022, 0.04, 0]} rotation={[0.2, 0, 0]}>
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
