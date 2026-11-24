import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  F22_PART_PLACEMENTS,
  type MaterialRole,
  type PartPlacement,
} from './f22Layout.js';
import { registerDebugHitbox } from './debugBridge.js';
import { useExplorerStore } from '../store/explorerStore.js';

const MATERIAL_PALETTE: Record<
  MaterialRole,
  { color: string; metalness: number; roughness: number; opacity?: number }
> = {
  'stealth-skin': { color: '#6b7582', metalness: 0.48, roughness: 0.42 },
  'stealth-dark': { color: '#47515e', metalness: 0.42, roughness: 0.48 },
  'canopy-gold': { color: '#d4a33a', metalness: 0.72, roughness: 0.14, opacity: 0.62 },
  titanium: { color: '#8d96a2', metalness: 0.75, roughness: 0.34 },
  'engine-core': { color: '#586270', metalness: 0.82, roughness: 0.28 },
  'nozzle-ceramic': { color: '#343940', metalness: 0.65, roughness: 0.45 },
  'bay-white': { color: '#cfd6de', metalness: 0.15, roughness: 0.62 },
  'ordnance-body': { color: '#aeb7c2', metalness: 0.35, roughness: 0.45 },
  'gear-strut': { color: '#bfc7d1', metalness: 0.78, roughness: 0.28 },
  'cockpit-dark': { color: '#262d36', metalness: 0.3, roughness: 0.65 },
};

/**
 * Create a tapered diamond-chined extruded geometry fitting strictly within [sx, sy, sz]
 * centered at the local origin.
 */
function buildChinedProfileGeometry(
  sx: number,
  sy: number,
  sz: number,
  frontScale: number,
  rearScale: number
): THREE.BufferGeometry {
  const hwF = (sx / 2) * frontScale;
  const hhF = (sy / 2) * frontScale;
  const hwR = (sx / 2) * rearScale;
  const hhR = (sy / 2) * rearScale;
  const hz = sz / 2;

  // 6-point chined stealth cross-section: top-left, top-right, right-chine, bottom-right, bottom-left, left-chine
  const ring = (hw: number, hh: number, z: number): [number, number, number][] => [
    [-hw * 0.55, hh, z],
    [hw * 0.55, hh, z],
    [hw, 0, z],
    [hw * 0.65, -hh, z],
    [-hw * 0.65, -hh, z],
    [-hw, 0, z],
  ];

  const f = ring(hwF, hhF, -hz);
  const r = ring(hwR, hhR, hz);
  const pos: number[] = [];

  const pushTri = (a: number[], b: number[], c: number[]) => {
    pos.push(a[0]!, a[1]!, a[2]!, b[0]!, b[1]!, b[2]!, c[0]!, c[1]!, c[2]!);
  };

  // Side quads
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    pushTri(f[i]!, r[i]!, r[j]!);
    pushTri(f[i]!, r[j]!, f[j]!);
  }
  // Front cap
  const fCenter = [0, 0, -hz];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    pushTri(fCenter, f[j]!, f[i]!);
  }
  // Rear cap
  const rCenter = [0, 0, hz];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    pushTri(rCenter, r[i]!, r[j]!);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create a clipped-diamond / trapezoidal swept wing or stabilator slab fitting strictly
 * inside local [-sx/2..sx/2, -sy/2..sy/2, -sz/2..sz/2].
 */
function buildSweptPlanformGeometry(
  sx: number,
  sy: number,
  sz: number,
  side: -1 | 1,
  leTipOffsetFrac: number,
  teTipOffsetFrac: number
): THREE.BufferGeometry {
  const hx = sx / 2;
  const hz = sz / 2;
  // Root edge is toward X=0; tip edge is outward
  const xRoot = side === 1 ? -hx : hx;
  const xTip = side === 1 ? hx : -hx;

  const zRootLE = -hz;
  const zRootTE = hz;
  const zTipLE = -hz + sz * leTipOffsetFrac;
  const zTipTE = hz - sz * teTipOffsetFrac;

  const shape = new THREE.Shape();
  shape.moveTo(xRoot, zRootLE);
  shape.lineTo(xTip, zTipLE);
  shape.lineTo(xTip, zTipTE);
  shape.lineTo(xRoot, zRootTE);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: sy,
    bevelEnabled: false,
  });
  // ExtrudeGeometry extrudes in +Z from XY plane; rotate so shape lies in XZ and thickness is Y
  geo.rotateX(Math.PI / 2);
  geo.translate(0, sy / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create an outward-canted (28°) vertical stabilizer or rudder slab fitting strictly
 * inside local [-sx/2..sx/2, -sy/2..sy/2, -sz/2..sz/2].
 */
function buildCantedFinGeometry(
  sx: number,
  sy: number,
  sz: number,
  side: -1 | 1,
  thicknessX = 0.14
): THREE.BufferGeometry {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  // Root is inboard-bottom, tip is outboard-top (cant ~28 deg)
  const rootX = side === 1 ? -hx + thicknessX : hx - thicknessX;
  const tipX = side === 1 ? hx - thicknessX : -hx + thicknessX;
  const halfT = thicknessX / 2;

  // 8 vertices of a canted tapered fin prism
  const v = [
    // Root quad (y = -hy)
    [rootX - halfT, -hy, -hz], // 0: root LE left
    [rootX + halfT, -hy, -hz], // 1: root LE right
    [rootX + halfT, -hy, hz], // 2: root TE right
    [rootX - halfT, -hy, hz], // 3: root TE left
    // Tip quad (y = +hy, swept aft at LE)
    [tipX - halfT * 0.7, hy, -hz + sz * 0.42], // 4: tip LE left
    [tipX + halfT * 0.7, hy, -hz + sz * 0.42], // 5: tip LE right
    [tipX + halfT * 0.7, hy, hz - sz * 0.08], // 6: tip TE right
    [tipX - halfT * 0.7, hy, hz - sz * 0.08], // 7: tip TE left
  ];

  const pos: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => {
    const pa = v[a]!;
    const pb = v[b]!;
    const pc = v[c]!;
    const pd = v[d]!;
    pos.push(
      pa[0]!, pa[1]!, pa[2]!,
      pb[0]!, pb[1]!, pb[2]!,
      pc[0]!, pc[1]!, pc[2]!,
      pa[0]!, pa[1]!, pa[2]!,
      pc[0]!, pc[1]!, pc[2]!,
      pd[0]!, pd[1]!, pd[2]!
    );
  };

  quad(0, 3, 2, 1); // bottom
  quad(4, 5, 6, 7); // top
  quad(0, 1, 5, 4); // LE
  quad(2, 3, 7, 6); // TE
  quad(1, 2, 6, 5); // +X face
  quad(3, 0, 4, 7); // -X face

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

interface PartMeshProps {
  readonly part: PartPlacement;
  readonly clippingPlanes: readonly THREE.Plane[];
}

function F22PartNode({ part, clippingPlanes }: PartMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const hoveredPartId = useExplorerStore((s) => s.hoveredPartId);
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

  // Smoothly interpolate explode position
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const targetExplode = useExplorerStore.getState().explodeFactor;
    const tx = part.center[0] + part.explode[0] * targetExplode;
    const ty = part.center[1] + part.explode[1] * targetExplode;
    const tz = part.center[2] + part.explode[2] * targetExplode;
    const alpha = Math.min(1, delta * 10);
    g.position.x += (tx - g.position.x) * alpha;
    g.position.y += (ty - g.position.y) * alpha;
    g.position.z += (tz - g.position.z) * alpha;
  });

  // Register with debugBridge for screen-space projection & collision checks
  useEffect(() => {
    registerDebugHitbox(part.id, groupRef.current, groupRef.current);
    return () => registerDebugHitbox(part.id, null, null);
  }, [part.id]);

  const [sx, sy, sz] = part.size;
  const side = part.side ?? 1;

  const customGeo = useMemo(() => {
    switch (part.shape) {
      case 'radome':
        return buildChinedProfileGeometry(sx, sy, sz, 0.04, 1.0);
      case 'fuselage-fwd':
        return buildChinedProfileGeometry(sx, sy, sz, 0.72, 1.0);
      case 'fuselage-center':
        return buildChinedProfileGeometry(sx, sy, sz, 0.96, 1.0);
      case 'fuselage-aft':
        return buildChinedProfileGeometry(sx, sy, sz, 1.0, 0.88);
      case 'wing':
        return buildSweptPlanformGeometry(sx, sy, sz, side, 0.56, 0.18);
      case 'lef':
        return buildSweptPlanformGeometry(sx, sy, sz, side, 0.55, 0.05);
      case 'flaperon':
        return buildSweptPlanformGeometry(sx, sy, sz, side, 0.05, 0.25);
      case 'aileron':
        return buildSweptPlanformGeometry(sx, sy, sz, side, 0.05, 0.35);
      case 'stabilator':
        return buildSweptPlanformGeometry(sx, sy, sz, side, 0.48, 0.16);
      case 'vtail':
        return buildCantedFinGeometry(sx, sy, sz, side, 0.16);
      case 'rudder':
        return buildCantedFinGeometry(sx, sy, sz, side, 0.12);
      default:
        return null;
    }
  }, [part.shape, sx, sy, sz, side]);

  useEffect(() => {
    return () => {
      customGeo?.dispose();
    };
  }, [customGeo]);

  const pal = MATERIAL_PALETTE[part.material];
  const xrayGhost = xrayMode && part.isOuterSkin;
  const transparent = xrayGhost || pal.opacity !== undefined;
  const opacity = xrayGhost ? 0.18 : (pal.opacity ?? 1);
  const emissive = isSelected ? '#0ea5e9' : isHovered ? '#38bdf8' : '#000000';
  const emissiveIntensity = isSelected ? 0.42 : isHovered ? 0.2 : 0;

  const matProps = {
    color: pal.color,
    metalness: pal.metalness,
    roughness: pal.roughness,
    transparent,
    opacity,
    depthWrite: !xrayGhost,
    emissive,
    emissiveIntensity,
    clippingPlanes: clippingPlanes as THREE.Plane[],
    clipShadows: true,
    side: clippingPlanes.length > 0 ? THREE.DoubleSide : THREE.FrontSide,
  };

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

  const renderMeshes = () => {
    if (customGeo) {
      return (
        <mesh geometry={customGeo} castShadow receiveShadow>
          <meshStandardMaterial {...matProps} />
        </mesh>
      );
    }

    switch (part.shape) {
      case 'canopy':
        return (
          <mesh position={[0, -sy * 0.5, 0]} scale={[sx / 2, sy, sz / 2]} castShadow>
            {/* Half-ellipsoid bubble canopy dome seated flush on cockpit sill */}
            <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial
              color={pal.color}
              metalness={0.65}
              roughness={0.12}
              clearcoat={1}
              clearcoatRoughness={0.1}
              transparent
              opacity={xrayGhost ? 0.16 : 0.62}
              emissive={emissive}
              emissiveIntensity={emissiveIntensity}
              clippingPlanes={clippingPlanes as THREE.Plane[]}
            />
          </mesh>
        );

      case 'engine':
        return (
          <group>
            {/* Cylindrical F119 core & afterburner case */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[sx * 0.46, sx * 0.48, sz * 0.96, 20]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            {/* Front fan spinner ring */}
            <mesh position={[0, 0, -sz * 0.45]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[sx * 0.44, sx * 0.44, 0.16, 16]} />
              <meshStandardMaterial color="#9aa6b5" metalness={0.85} roughness={0.22} clippingPlanes={clippingPlanes as THREE.Plane[]} />
            </mesh>
          </group>
        );

      case 'nozzle':
        return (
          <group>
            {/* Rectangular 2D convergent-divergent outer petals */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[sx, sy, sz]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
          </group>
        );

      case 'tail-booms':
        return (
          <group>
            <mesh position={[-1.56, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.36, sy, sz]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            <mesh position={[1.56, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.36, sy, sz]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
          </group>
        );

      case 'bay-doors':
        if (part.id === 'side-bay-doors') {
          return (
            <group>
              <mesh position={[-1.74, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.08, sy, sz]} />
                <meshStandardMaterial {...matProps} />
              </mesh>
              <mesh position={[1.74, 0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.08, sy, sz]} />
                <meshStandardMaterial {...matProps} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[sx, sy, sz]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );

      case 'ordnance':
        // 6 × AIM-120 educational schematic shapes inside main bay envelope
        return (
          <group>
            {[-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((ox, i) => (
              <mesh key={i} position={[ox, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.085, 0.085, sz * 0.95, 12]} />
                <meshStandardMaterial {...matProps} />
              </mesh>
            ))}
          </group>
        );

      case 'cannon': {
        const r = Math.min(sx, sy) * 0.48;
        return (
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[r * 0.85, r, sz, 12]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );
      }

      case 'gear-nose':
      case 'gear-main': {
        const wheelR = part.shape === 'gear-nose' ? 0.24 : 0.34;
        const wheelW = part.shape === 'gear-nose' ? 0.12 : 0.2;
        const strutH = sy - wheelR * 2;
        return (
          <group>
            {/* Oleo shock strut */}
            <mesh position={[0, wheelR, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.09, Math.max(0.2, strutH), 12]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            {/* Tire(s) resting cleanly at local -sy/2 (Y = 0.00 m hangar floor) */}
            {part.shape === 'gear-nose' ? (
              <>
                <mesh position={[-0.14, -sy / 2 + wheelR, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[wheelR, wheelR, wheelW, 18]} />
                  <meshStandardMaterial color="#1f242b" roughness={0.85} metalness={0.1} clippingPlanes={clippingPlanes as THREE.Plane[]} />
                </mesh>
                <mesh position={[0.14, -sy / 2 + wheelR, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                  <cylinderGeometry args={[wheelR, wheelR, wheelW, 18]} />
                  <meshStandardMaterial color="#1f242b" roughness={0.85} metalness={0.1} clippingPlanes={clippingPlanes as THREE.Plane[]} />
                </mesh>
              </>
            ) : (
              <mesh position={[0, -sy / 2 + wheelR, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[wheelR, wheelR, wheelW, 20]} />
                <meshStandardMaterial color="#1f242b" roughness={0.85} metalness={0.1} clippingPlanes={clippingPlanes as THREE.Plane[]} />
              </mesh>
            )}
          </group>
        );
      }

      case 'displays':
        return (
          <group>
            {/* Instrument glare shield + 6 schematic LCDs + HUD combiner */}
            <mesh position={[0, -0.04, 0]} castShadow>
              <boxGeometry args={[sx, sy * 0.65, sz * 0.7]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            <mesh position={[0, 0.1, -0.08]}>
              <boxGeometry args={[0.26, 0.16, 0.02]} />
              <meshStandardMaterial color="#22c55e" transparent opacity={0.45} emissive="#22c55e" emissiveIntensity={0.6} clippingPlanes={clippingPlanes as THREE.Plane[]} />
            </mesh>
          </group>
        );

      default:
        return (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[sx, sy, sz]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      name={part.id}
      position={[part.center[0], part.center[1], part.center[2]]}
      visible={!isHidden}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {renderMeshes()}
    </group>
  );
}

export function F22Model() {
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
      {F22_PART_PLACEMENTS.map((part) => (
        <F22PartNode key={part.id} part={part} clippingPlanes={clippingPlanes} />
      ))}
    </group>
  );
}
