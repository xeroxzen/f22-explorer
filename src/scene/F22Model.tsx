import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CockpitDetail } from './CockpitDetail.js';
import { ExhaustPlume } from './ExhaustPlume.js';
import { WeaponsBaysDetail } from './WeaponsBaysDetail.js';
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
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const hiddenPartIds = useExplorerStore((s) => s.hiddenPartIds);
  const isolatedPartId = useExplorerStore((s) => s.isolatedPartId);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const setHoveredPart = useExplorerStore((s) => s.setHoveredPart);

  const isSelected = selectedPartId === part.id;
  const isHovered = hoveredPartId === part.id;

  // Hide coarse placeholder cockpit boxes (and closed tub box) when inside detailed Cockpit Seat View
  const replacedByCockpitDetail =
    explodeFactor <= 0.05 &&
    cameraPreset === 'cockpit' &&
    (part.id === 'hotas-controls' ||
      part.id === 'cockpit-displays-hud' ||
      part.id === 'cockpit-tub' ||
      part.id === 'canopy');

  // Hide static closed door / generic ordnance cylinder when detailed open-bay stores take over
  const replacedByAnimatedBay =
    explodeFactor <= 0.05 &&
    ((part.id === 'main-bay-doors' && mainBayOpen) ||
      (part.id === 'side-bay-doors' && sideBaysOpen) ||
      (part.id === 'internal-ordnance-display' && mainBayOpen));

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

      // Expand 2D nozzle exit area with AB / power setting
      if (part.id === 'nozzle-2d-left' || part.id === 'nozzle-2d-right') {
        const es = useExplorerStore.getState().engineSim;
        const eng = part.id === 'nozzle-2d-left' ? es.left : es.right;
        const targetSy =
          useExplorerStore.getState().explodeFactor > 0.05
            ? 1
            : 0.88 + eng.nozzleOpenFraction * 0.44;
        p.scale.y += (targetSy - p.scale.y) * alpha;
      }
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
    cameraPreset !== 'cockpit' &&
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
          {!replacedByCockpitDetail && (
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
          )}

          {part.id === 'cockpit-displays-hud' && (
            <CockpitDetail clippingPlanes={clippingPlanes} />
          )}
        </group>
      </group>

      {showLeaderLabel && content && (
        <Html
          position={[part.anchor[0], part.anchor[1] + 0.45, part.anchor[2]]}
          center
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
      <WeaponsBaysDetail clippingPlanes={clippingPlanes} />
      <ExhaustPlume clippingPlanes={clippingPlanes} />
    </group>
  );
}
