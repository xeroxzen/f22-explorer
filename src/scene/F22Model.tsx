import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  F22_BUILT_PARTS,
  SYSTEM_GROUP_COLORS,
  type BuiltPartMesh,
  type MaterialRole,
} from './f22Geometry.js';
import { registerDebugHitbox } from './debugBridge.js';
import { getComponentContent } from '../content/registry.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { useViewport } from '../ui/useViewport.js';

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

interface PartNodeProps {
  readonly part: BuiltPartMesh;
  readonly clippingPlanes: readonly THREE.Plane[];
  readonly isPhone: boolean;
}

function F22PartNode({ part, clippingPlanes, isPhone }: PartNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const hoveredPartId = useExplorerStore((s) => s.hoveredPartId);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const xrayMode = useExplorerStore((s) => s.xrayMode);
  const hiddenPartIds = useExplorerStore((s) => s.hiddenPartIds);
  const isolatedPartId = useExplorerStore((s) => s.isolatedPartId);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const setHoveredPart = useExplorerStore((s) => s.setHoveredPart);

  const isSelected = selectedPartId === part.id;
  const isHovered = hoveredPartId === part.id;
  const isHidden =
    hiddenPartIds.includes(part.id) ||
    (isolatedPartId !== null && isolatedPartId !== part.id);

  // Smooth directional explode displacement
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const f = useExplorerStore.getState().explodeFactor;
    const tx = part.explode[0] * f;
    const ty = part.explode[1] * f;
    const tz = part.explode[2] * f;
    const alpha = Math.min(1, delta * 10);
    g.position.x += (tx - g.position.x) * alpha;
    g.position.y += (ty - g.position.y) * alpha;
    g.position.z += (tz - g.position.z) * alpha;
  });

  useEffect(() => {
    registerDebugHitbox(part.id, groupRef.current, groupRef.current);
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

  // Blend base metallic color toward educational system-group tint as explode increases
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
      ref={groupRef}
      name={part.id}
      visible={!isHidden}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
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
    </group>
  );
}
