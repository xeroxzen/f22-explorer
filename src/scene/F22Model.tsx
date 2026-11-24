import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  F22_BUILT_PARTS,
  SYSTEM_GROUP_COLORS,
  fsToZ,
  type BuiltPartMesh,
  type MaterialRole,
} from './f22Geometry.js';
import { registerDebugHitbox } from './debugBridge.js';
import { getComponentContent } from '../content/registry.js';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { useViewport } from '../ui/useViewport.js';

const DEG = Math.PI / 180;

const MATERIAL_PALETTE: Record<
  MaterialRole,
  { color: string; metalness: number; roughness: number; opacity?: number }
> = {
  'stealth-skin': { color: '#6b7685', metalness: 0.52, roughness: 0.40 },
  'stealth-dark': { color: '#46505e', metalness: 0.46, roughness: 0.46 },
  'canopy-gold': { color: '#d8a63c', metalness: 0.74, roughness: 0.12, opacity: 0.64 },
  titanium: { color: '#8d96a2', metalness: 0.78, roughness: 0.32 },
  'engine-core': { color: '#586270', metalness: 0.84, roughness: 0.26 },
  'nozzle-ceramic': { color: '#313740', metalness: 0.68, roughness: 0.44 },
  'bay-white': { color: '#cfd6de', metalness: 0.14, roughness: 0.60 },
  'ordnance-body': { color: '#aeb7c2', metalness: 0.35, roughness: 0.44 },
  'gear-strut': { color: '#bfc7d1', metalness: 0.78, roughness: 0.28 },
  'cockpit-dark': { color: '#262d36', metalness: 0.30, roughness: 0.65 },
};

/**
 * Generic educational schematic panel for the F-22 cockpit (6 color LCDs + HUD + ICP).
 * No real/classified symbology is replicated.
 */
function CockpitSchematicPanel({
  clippingPlanes,
}: {
  readonly clippingPlanes: readonly THREE.Plane[];
}) {
  const zPanel = fsToZ(3.92);
  const cp = clippingPlanes as THREE.Plane[];

  return (
    <group position={[0, 2.40, zPanel]}>
      {/* Up-Front Integrated Control Panel (ICP) + 2 Up-Front Displays (3"x4") */}
      <mesh position={[-0.19, 0.12, 0.04]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.10, 0.08, 0.015]} />
        <meshStandardMaterial color="#0f172a" emissive="#22c55e" emissiveIntensity={0.75} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0, 0.12, 0.04]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.13, 0.08, 0.015]} />
        <meshStandardMaterial color="#1e293b" emissive="#38bdf8" emissiveIntensity={0.5} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0.19, 0.12, 0.04]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.10, 0.08, 0.015]} />
        <meshStandardMaterial color="#0f172a" emissive="#22c55e" emissiveIntensity={0.75} clippingPlanes={cp} />
      </mesh>

      {/* Primary Center MFD (8"x8") */}
      <mesh position={[0, -0.02, 0.06]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.20, 0.18, 0.015]} />
        <meshStandardMaterial color="#09111d" emissive="#0ea5e9" emissiveIntensity={0.85} clippingPlanes={cp} />
      </mesh>

      {/* 3 Secondary MFDs (left, right, lower-center — 6.25"x6.25" class) */}
      <mesh position={[-0.24, -0.02, 0.08]} rotation={[-0.18, 0.15, 0]}>
        <boxGeometry args={[0.15, 0.14, 0.015]} />
        <meshStandardMaterial color="#09111d" emissive="#10b981" emissiveIntensity={0.7} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0.24, -0.02, 0.08]} rotation={[-0.18, -0.15, 0]}>
        <boxGeometry args={[0.15, 0.14, 0.015]} />
        <meshStandardMaterial color="#09111d" emissive="#f59e0b" emissiveIntensity={0.7} clippingPlanes={cp} />
      </mesh>
      <mesh position={[0, -0.16, 0.10]} rotation={[-0.28, 0, 0]}>
        <boxGeometry args={[0.15, 0.11, 0.015]} />
        <meshStandardMaterial color="#09111d" emissive="#a855f7" emissiveIntensity={0.65} clippingPlanes={cp} />
      </mesh>

      {/* Wide-Angle Head-Up Display (HUD) Combiner Glass */}
      <mesh position={[0, 0.27, -0.02]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[0.24, 0.18, 0.008]} />
        <meshPhysicalMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={0.55}
          transparent
          opacity={0.34}
          roughness={0.08}
          clippingPlanes={cp}
        />
      </mesh>
    </group>
  );
}

/**
 * Dynamic weapons bay doors & USAF Fact Sheet internal loadouts when bays are open.
 */
function AnimatedWeaponsBays({
  clippingPlanes,
}: {
  readonly clippingPlanes: readonly THREE.Plane[];
}) {
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const weaponsLoadout = useExplorerStore((s) => s.weaponsLoadout);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);

  const mainLeftRef = useRef<THREE.Group>(null);
  const mainRightRef = useRef<THREE.Group>(null);
  const sideLeftRef = useRef<THREE.Group>(null);
  const sideRightRef = useRef<THREE.Group>(null);
  const aim9LeftRef = useRef<THREE.Group>(null);
  const aim9RightRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const alpha = Math.min(1, delta * 8);
    const mainAngle = mainBayOpen ? 88 * DEG : 0;
    const sideAngle = sideBaysOpen ? 92 * DEG : 0;
    const railAngle = sideBaysOpen ? 24 * DEG : 0;

    if (mainLeftRef.current) {
      mainLeftRef.current.rotation.z += (-mainAngle - mainLeftRef.current.rotation.z) * alpha;
    }
    if (mainRightRef.current) {
      mainRightRef.current.rotation.z += (mainAngle - mainRightRef.current.rotation.z) * alpha;
    }
    if (sideLeftRef.current) {
      sideLeftRef.current.rotation.z += (-sideAngle - sideLeftRef.current.rotation.z) * alpha;
    }
    if (sideRightRef.current) {
      sideRightRef.current.rotation.z += (sideAngle - sideRightRef.current.rotation.z) * alpha;
    }
    if (aim9LeftRef.current) {
      aim9LeftRef.current.rotation.y += (-railAngle - aim9LeftRef.current.rotation.y) * alpha;
    }
    if (aim9RightRef.current) {
      aim9RightRef.current.rotation.y += (railAngle - aim9RightRef.current.rotation.y) * alpha;
    }
  });

  if (explodeFactor > 0.05) return null;
  const cp = clippingPlanes as THREE.Plane[];
  const zMain = fsToZ(9.25);
  const zSide = fsToZ(8.90);

  return (
    <group name="animated-weapons-bays">
      {/* Main Bay Doors swinging open */}
      {mainBayOpen && (
        <>
          <group ref={mainLeftRef} position={[-1.06, 1.23, zMain]}>
            <mesh position={[0.53, 0, 0]}>
              <boxGeometry args={[1.05, 0.06, 4.30]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={mainRightRef} position={[1.06, 1.23, zMain]}>
            <mesh position={[-0.53, 0, 0]}>
              <boxGeometry args={[1.05, 0.06, 4.30]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>

          {/* Loadout shapes inside main bay (when JDAM or SDB is selected; AIM-120 uses base part) */}
          {weaponsLoadout === 'jdam' && (
            <group position={[0, 1.46, zMain]}>
              {[-0.42, 0.42].map((ox, i) => (
                <mesh key={i} position={[ox, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.16, 0.18, 2.95, 14]} />
                  <meshStandardMaterial color="#4b5563" metalness={0.35} roughness={0.55} clippingPlanes={cp} />
                </mesh>
              ))}
              {[-0.86, 0.86].map((ox, i) => (
                <mesh key={`am-${i}`} position={[ox, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 3.60, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.45} clippingPlanes={cp} />
                </mesh>
              ))}
            </group>
          )}

          {weaponsLoadout === 'sdb' && (
            <group position={[0, 1.46, zMain]}>
              {[-0.52, -0.22, 0.22, 0.52].flatMap((ox, i) =>
                [-0.95, 0.95].map((oz, j) => (
                  <mesh key={`${i}-${j}`} position={[ox, 0, oz]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.09, 0.09, 1.75, 10]} />
                    <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.45} clippingPlanes={cp} />
                  </mesh>
                ))
              )}
              {[-0.88, 0.88].map((ox, i) => (
                <mesh key={`am2-${i}`} position={[ox, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.08, 0.08, 3.60, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.35} roughness={0.45} clippingPlanes={cp} />
                </mesh>
              ))}
            </group>
          )}
        </>
      )}

      {/* Side Bay Doors + AIM-9 Trapeze Rails */}
      {sideBaysOpen && (
        <>
          <group ref={sideLeftRef} position={[-1.72, 1.56, zSide]}>
            <mesh position={[0, -0.16, 0]}>
              <boxGeometry args={[0.06, 0.32, 3.40]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={sideRightRef} position={[1.72, 1.56, zSide]}>
            <mesh position={[0, -0.16, 0]}>
              <boxGeometry args={[0.06, 0.32, 3.40]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={aim9LeftRef} position={[-1.48, 1.40, zSide + 0.8]}>
            <mesh position={[-0.25, 0, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 2.98, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.4} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={aim9RightRef} position={[1.48, 1.40, zSide + 0.8]}>
            <mesh position={[0.25, 0, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.065, 0.065, 2.98, 12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.4} clippingPlanes={cp} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

/**
 * Compute physical hinge pivot & target Euler [rx, ry, rz] for Phase 3 articulating parts.
 */
function getArticulationTarget(partId: string): {
  pivot: [number, number, number];
  rot: [number, number, number];
} | null {
  const s = useExplorerStore.getState();
  if (s.explodeFactor > 0.05) return null;

  switch (partId) {
    case 'canopy':
      return {
        pivot: [0, 2.55, fsToZ(6.39)],
        rot: [s.canopyOpen ? R.F22_CANOPY_OPEN_DEG.value * DEG : 0, 0, 0],
      };
    case 'nose-landing-gear':
      return {
        pivot: [0, 1.20, fsToZ(4.30)],
        rot: [s.gearDeployed ? 0 : -88 * DEG, 0, 0],
      };
    case 'main-landing-gear-left':
      return {
        pivot: [-1.615, 1.18, fsToZ(11.20)],
        rot: [0, 0, s.gearDeployed ? 0 : 88 * DEG],
      };
    case 'main-landing-gear-right':
      return {
        pivot: [1.615, 1.18, fsToZ(11.20)],
        rot: [0, 0, s.gearDeployed ? 0 : -88 * DEG],
      };
    case 'lef-left':
    case 'lef-right':
      return {
        pivot: [partId === 'lef-left' ? -4.3 : 4.3, 1.90, fsToZ(8.8)],
        rot: [-(s.flaps * R.F22_LEF_MAX_DEG.value) * DEG, 0, 0],
      };
    case 'flaperon-left':
      return {
        pivot: [-3.15, 1.92, fsToZ(13.1)],
        rot: [(s.flaps * 28 - s.stickRoll * 18) * DEG, 0, 0],
      };
    case 'flaperon-right':
      return {
        pivot: [3.15, 1.92, fsToZ(13.1)],
        rot: [(s.flaps * 28 + s.stickRoll * 18) * DEG, 0, 0],
      };
    case 'aileron-left':
      return {
        pivot: [-5.5, 1.87, fsToZ(12.6)],
        rot: [(-s.stickRoll * R.F22_AILERON_MAX_DEG.value) * DEG, 0, 0],
      };
    case 'aileron-right':
      return {
        pivot: [5.5, 1.87, fsToZ(12.6)],
        rot: [(s.stickRoll * R.F22_AILERON_MAX_DEG.value) * DEG, 0, 0],
      };
    case 'stabilator-left':
      return {
        pivot: [-1.80, 1.86, fsToZ(16.70)],
        rot: [
          ((s.stickPitch - s.stickRoll * 0.4) * R.F22_STABILATOR_MAX_DEG.value) * DEG,
          0,
          0,
        ],
      };
    case 'stabilator-right':
      return {
        pivot: [1.80, 1.86, fsToZ(16.70)],
        rot: [
          ((s.stickPitch + s.stickRoll * 0.4) * R.F22_STABILATOR_MAX_DEG.value) * DEG,
          0,
          0,
        ],
      };
    case 'rudder-left':
      return {
        pivot: [-2.15, 3.76, fsToZ(15.92)],
        rot: [0, (s.rudderYaw * R.F22_RUDDER_MAX_DEG.value - s.airbrake * 28) * DEG, 0],
      };
    case 'rudder-right':
      return {
        pivot: [2.15, 3.76, fsToZ(15.92)],
        rot: [0, (s.rudderYaw * R.F22_RUDDER_MAX_DEG.value + s.airbrake * 28) * DEG, 0],
      };
    case 'nozzle-2d-left':
    case 'nozzle-2d-right':
      return {
        pivot: [partId === 'nozzle-2d-left' ? -0.72 : 0.72, 1.72, fsToZ(16.92)],
        rot: [(-s.nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value) * DEG, 0, 0],
      };
    default:
      return null;
  }
}

interface PartNodeProps {
  readonly part: BuiltPartMesh;
  readonly clippingPlanes: readonly THREE.Plane[];
  readonly isPhone: boolean;
}

function F22PartNode({ part, clippingPlanes, isPhone }: PartNodeProps) {
  const explodeGroupRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const hoveredPartId = useExplorerStore((s) => s.hoveredPartId);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const xrayMode = useExplorerStore((s) => s.xrayMode);
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const weaponsLoadout = useExplorerStore((s) => s.weaponsLoadout);
  const hiddenPartIds = useExplorerStore((s) => s.hiddenPartIds);
  const isolatedPartId = useExplorerStore((s) => s.isolatedPartId);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const setHoveredPart = useExplorerStore((s) => s.setHoveredPart);

  const isSelected = selectedPartId === part.id;
  const isHovered = hoveredPartId === part.id;

  // Hide static closed door / AIM-120 mesh when animated open doors or alt loadout takes over
  const replacedByAnimatedBay =
    explodeFactor <= 0.05 &&
    ((part.id === 'main-bay-doors' && mainBayOpen) ||
      (part.id === 'side-bay-doors' && sideBaysOpen) ||
      (part.id === 'internal-ordnance-display' && mainBayOpen && weaponsLoadout !== 'air-to-air'));

  const isHidden =
    replacedByAnimatedBay ||
    hiddenPartIds.includes(part.id) ||
    (isolatedPartId !== null && isolatedPartId !== part.id);

  // Smooth directional explode + Phase 3 hinge articulation
  useFrame((_, delta) => {
    const g = explodeGroupRef.current;
    if (g) {
      const f = useExplorerStore.getState().explodeFactor;
      const alpha = Math.min(1, delta * 10);
      g.position.x += (part.explode[0] * f - g.position.x) * alpha;
      g.position.y += (part.explode[1] * f - g.position.y) * alpha;
      g.position.z += (part.explode[2] * f - g.position.z) * alpha;
    }

    const p = pivotRef.current;
    if (p) {
      const art = getArticulationTarget(part.id);
      const alpha = Math.min(1, delta * 9);
      const rx = art ? art.rot[0] : 0;
      const ry = art ? art.rot[1] : 0;
      const rz = art ? art.rot[2] : 0;
      p.rotation.x += (rx - p.rotation.x) * alpha;
      p.rotation.y += (ry - p.rotation.y) * alpha;
      p.rotation.z += (rz - p.rotation.z) * alpha;
    }
  });

  useEffect(() => {
    registerDebugHitbox(part.id, explodeGroupRef.current, explodeGroupRef.current);
    return () => registerDebugHitbox(part.id, null, null);
  }, [part.id]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, [part.positions]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  const pal = MATERIAL_PALETTE[part.material];
  const groupInfo = SYSTEM_GROUP_COLORS[part.systemGroup];

  const blendedColor = useMemo(() => {
    const base = new THREE.Color(pal.color);
    if (explodeFactor > 0.04) {
      const tint = new THREE.Color(groupInfo.tint);
      base.lerp(tint, Math.min(0.45, explodeFactor * 0.45));
    }
    return `#${base.getHexString()}`;
  }, [pal.color, groupInfo.tint, explodeFactor]);

  const xrayGhost = xrayMode && part.isOuterSkin;
  const transparent = xrayGhost || pal.opacity !== undefined;
  const opacity = xrayGhost ? 0.18 : (pal.opacity ?? 1);
  const emissive = isSelected ? '#0ea5e9' : isHovered ? '#38bdf8' : '#000000';
  const emissiveIntensity = isSelected ? 0.45 : isHovered ? 0.22 : 0;

  const showLeaderLabel =
    !isHidden &&
    (isSelected || (!isPhone && isHovered && explodeFactor > 0.05));
  const content = showLeaderLabel ? getComponentContent(part.id) : null;

  const initArt = getArticulationTarget(part.id);
  const pivot: [number, number, number] = initArt ? initArt.pivot : [0, 0, 0];

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPart(part.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredPart(part.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (useExplorerStore.getState().hoveredPartId === part.id) {
      setHoveredPart(null);
      document.body.style.cursor = 'auto';
    }
  };

  return (
    <group
      ref={explodeGroupRef}
      name={part.id}
      visible={!isHidden}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <group position={pivot} ref={pivotRef}>
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>
          <mesh geometry={geometry} castShadow receiveShadow>
            {part.material === 'canopy-gold' ? (
              <meshPhysicalMaterial
                color={blendedColor}
                metalness={0.68}
                roughness={0.12}
                clearcoat={1}
                clearcoatRoughness={0.1}
                transparent
                opacity={xrayGhost ? 0.16 : 0.64}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                clippingPlanes={clippingPlanes as THREE.Plane[]}
                side={THREE.DoubleSide}
              />
            ) : (
              <meshStandardMaterial
                color={blendedColor}
                metalness={pal.metalness}
                roughness={pal.roughness}
                transparent={transparent}
                opacity={opacity}
                depthWrite={!xrayGhost}
                emissive={emissive}
                emissiveIntensity={emissiveIntensity}
                clippingPlanes={clippingPlanes as THREE.Plane[]}
                clipShadows
                side={clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide}
              />
            )}
          </mesh>

          {part.id === 'cockpit-displays-hud' && (
            <CockpitSchematicPanel clippingPlanes={clippingPlanes} />
          )}
        </group>
      </group>

      {showLeaderLabel && content && (
        <Html
          position={[part.anchor[0], part.anchor[1] + 0.45, part.anchor[2]]}
          center
          distanceFactor={16}
          style={{ pointerEvents: 'none' }}
        >
          <div className="leader-callout" data-testid={`leader-label-${part.id}`}>
            <span
              className="leader-dot"
              style={{ background: groupInfo.tint }}
            />
            <span className="leader-text">{content.title}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

export function F22Model() {
  const { isPhone } = useViewport();
  const clipAxis = useExplorerStore((s) => s.clipAxis);
  const clipPosition = useExplorerStore((s) => s.clipPosition);

  const clippingPlanes = useMemo(() => {
    if (clipAxis === 'none') return [];
    const normal =
      clipAxis === 'x'
        ? new THREE.Vector3(-1, 0, 0)
        : clipAxis === 'y'
          ? new THREE.Vector3(0, -1, 0)
          : new THREE.Vector3(0, 0, -1);
    return [new THREE.Plane(normal, clipPosition)];
  }, [clipAxis, clipPosition]);

  return (
    <group name="f22-airframe">
      {F22_BUILT_PARTS.map((part) => (
        <F22PartNode
          key={part.id}
          part={part}
          clippingPlanes={clippingPlanes}
          isPhone={isPhone}
        />
      ))}
      <AnimatedWeaponsBays clippingPlanes={clippingPlanes} />
    </group>
  );
}
