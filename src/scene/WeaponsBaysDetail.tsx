import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { fsToZ } from './f22Geometry.js';
import { useExplorerStore } from '../store/explorerStore.js';

const DEG = Math.PI / 180;

/**
 * AIM-120 AMRAAM educational store: slender body, ogive nose, 4 mid-body fins + 4 tail fins.
 */
function Aim120Mesh({
  position,
  clippingPlanes,
  onSelect,
}: {
  readonly position: [number, number, number];
  readonly clippingPlanes: THREE.Plane[];
  readonly onSelect: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={position} onClick={onSelect}>
      {/* Missile body (3.66 m) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.082, 0.082, 3.15, 12]} />
        <meshStandardMaterial color="#dce3ec" metalness={0.3} roughness={0.42} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Ogive nose cone */}
      <mesh position={[0, 0, -1.80]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.082, 0.48, 12]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.2} roughness={0.35} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* 4 Mid-body clipped-delta fins */}
      {[0, Math.PI / 2].map((rz, i) => (
        <mesh key={`mid-${i}`} position={[0, 0, -0.15]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.44, 0.014, 0.34]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {/* 4 Aft tail control fins */}
      {[0, Math.PI / 2].map((rz, i) => (
        <mesh key={`tail-${i}`} position={[0, 0, 1.42]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.48, 0.014, 0.28]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * AIM-9 Sidewinder educational store: slender body, dark IR dome, 4 forward canards + 4 aft rollerons.
 */
function Aim9Mesh({
  position,
  clippingPlanes,
  onSelect,
}: {
  readonly position: [number, number, number];
  readonly clippingPlanes: THREE.Plane[];
  readonly onSelect: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={position} onClick={onSelect}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 2.86, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.3} roughness={0.4} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Dark IR seeker dome */}
      <mesh position={[0, 0, -1.46]}>
        <sphereGeometry args={[0.062, 12, 10]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.18} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* 4 Forward steering canards */}
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`can-${i}`} position={[0, 0, -1.16]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.36, 0.012, 0.22]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {/* 4 Aft tail fins / rollerons */}
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`rol-${i}`} position={[0, 0, 1.24]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.50, 0.012, 0.34]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * GBU-32 1,000 lb JDAM educational store: heavy body, nose fuse, mid-body strakes + JDAM tail kit.
 */
function Gbu32JdamMesh({
  position,
  clippingPlanes,
  onSelect,
}: {
  readonly position: [number, number, number];
  readonly clippingPlanes: THREE.Plane[];
  readonly onSelect: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={position} onClick={onSelect}>
      {/* Main Mk-83 bomb body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.165, 0.175, 2.15, 14]} />
        <meshStandardMaterial color="#4b5548" metalness={0.35} roughness={0.58} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Ogive nose + yellow band */}
      <mesh position={[0, 0, -1.32]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.165, 0.56, 14]} />
        <meshStandardMaterial color="#4b5548" metalness={0.35} roughness={0.58} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, -1.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.168, 0.168, 0.06, 14]} />
        <meshStandardMaterial color="#eab308" roughness={0.5} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Mid-body JDAM strakes */}
      {[0, Math.PI / 2].map((rz, i) => (
        <mesh key={`str-${i}`} position={[0, 0, 0.1]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.46, 0.018, 0.95]} />
          <meshStandardMaterial color="#374151" metalness={0.45} roughness={0.5} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {/* Tapered JDAM guidance tail kit + cruciform tail fins */}
      <mesh position={[0, 0, 1.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.175, 0.11, 0.55, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.45} clippingPlanes={clippingPlanes} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`jtail-${i}`} position={[0, 0, 1.44]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.58, 0.018, 0.30]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.45} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * GBU-39 Small Diameter Bomb (SDB) educational store: compact body + stowed pop-out diamond wing pack.
 */
function Gbu39SdbMesh({
  position,
  clippingPlanes,
  onSelect,
}: {
  readonly position: [number, number, number];
  readonly clippingPlanes: THREE.Plane[];
  readonly onSelect: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group position={position} onClick={onSelect}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.088, 0.088, 1.45, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.45} roughness={0.42} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, -0.88]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.088, 0.34, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.45} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Stowed dorsal diamond pop-out wing pack */}
      <mesh position={[0, 0.095, 0.02]}>
        <boxGeometry args={[0.11, 0.032, 0.92]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* 4 Compact aft tail fins */}
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`stail-${i}`} position={[0, 0, 0.66]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.28, 0.012, 0.16]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

export function WeaponsBaysDetail({
  clippingPlanes,
}: {
  readonly clippingPlanes: readonly THREE.Plane[];
}) {
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const weaponsLoadout = useExplorerStore((s) => s.weaponsLoadout);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const selectPart = useExplorerStore((s) => s.selectPart);

  const mainLeftRef = useRef<THREE.Group>(null);
  const mainRightRef = useRef<THREE.Group>(null);
  const sideLeftRef = useRef<THREE.Group>(null);
  const sideRightRef = useRef<THREE.Group>(null);
  const aim9LeftRef = useRef<THREE.Group>(null);
  const aim9RightRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const alpha = Math.min(1, delta * 8);
    const mainAngle = mainBayOpen ? 102 * DEG : 0;
    const sideAngle = sideBaysOpen ? 105 * DEG : 0;
    const railAngle = sideBaysOpen ? 26 * DEG : 0;

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

  const pickOrdnance = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPart('internal-ordnance-display');
  };
  const pickSideBay = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPart(id);
  };

  return (
    <group name="animated-weapons-bays">
      {/* Main Weapons Bay Doors + Distinguishable Clickable Stores */}
      {mainBayOpen && (
        <>
          <group ref={mainLeftRef} position={[-1.06, 1.23, zMain]}>
            <mesh position={[0.53, 0, 0]} onClick={(e) => { e.stopPropagation(); selectPart('main-bay-doors'); }}>
              <boxGeometry args={[1.05, 0.06, 4.30]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={mainRightRef} position={[1.06, 1.23, zMain]}>
            <mesh position={[-0.53, 0, 0]} onClick={(e) => { e.stopPropagation(); selectPart('main-bay-doors'); }}>
              <boxGeometry args={[1.05, 0.06, 4.30]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>

          {weaponsLoadout === 'air-to-air' && (
            <group position={[0, 1.30, zMain]}>
              {[-0.78, -0.47, -0.16, 0.16, 0.47, 0.78].map((ox, i) => (
                <Aim120Mesh
                  key={i}
                  position={[ox, 0, 0]}
                  clippingPlanes={cp}
                  onSelect={pickOrdnance}
                />
              ))}
            </group>
          )}

          {weaponsLoadout === 'jdam' && (
            <group position={[0, 1.28, zMain]}>
              <Gbu32JdamMesh position={[-0.40, -0.02, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Gbu32JdamMesh position={[0.40, -0.02, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Aim120Mesh position={[-0.86, 0.04, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Aim120Mesh position={[0.86, 0.04, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
            </group>
          )}

          {weaponsLoadout === 'sdb' && (
            <group position={[0, 1.30, zMain]}>
              {[-0.52, -0.22, 0.22, 0.52].flatMap((ox, i) =>
                [-0.98, 0.98].map((oz, j) => (
                  <Gbu39SdbMesh
                    key={`${i}-${j}`}
                    position={[ox, 0, oz]}
                    clippingPlanes={cp}
                    onSelect={pickOrdnance}
                  />
                ))
              )}
              <Aim120Mesh position={[-0.88, 0.04, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Aim120Mesh position={[0.88, 0.04, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
            </group>
          )}
        </>
      )}

      {/* Side Weapons Bay Doors + Extending AIM-9 Sidewinders */}
      {sideBaysOpen && (
        <>
          <group ref={sideLeftRef} position={[-1.72, 1.56, zSide]}>
            <mesh position={[0, -0.16, 0]} onClick={(e) => { e.stopPropagation(); selectPart('side-bay-doors'); }}>
              <boxGeometry args={[0.06, 0.32, 3.40]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={sideRightRef} position={[1.72, 1.56, zSide]}>
            <mesh position={[0, -0.16, 0]} onClick={(e) => { e.stopPropagation(); selectPart('side-bay-doors'); }}>
              <boxGeometry args={[0.06, 0.32, 3.40]} />
              <meshStandardMaterial color="#6b7685" metalness={0.5} roughness={0.42} clippingPlanes={cp} />
            </mesh>
          </group>
          <group ref={aim9LeftRef} position={[-1.48, 1.40, zSide + 0.8]}>
            <Aim9Mesh
              position={[-0.26, 0, -0.8]}
              clippingPlanes={cp}
              onSelect={pickSideBay('side-weapons-bay-left')}
            />
          </group>
          <group ref={aim9RightRef} position={[1.48, 1.40, zSide + 0.8]}>
            <Aim9Mesh
              position={[0.26, 0, -0.8]}
              clippingPlanes={cp}
              onSelect={pickSideBay('side-weapons-bay-right')}
            />
          </group>
        </>
      )}
    </group>
  );
}
