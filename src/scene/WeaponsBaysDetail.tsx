import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { fsToZ } from './f22Geometry.js';
import { RENDERED_STORE_SPECS } from './storeDimensions.js';
import { useExplorerStore } from '../store/explorerStore.js';

const DEG = Math.PI / 180;

/**
 * AIM-120 AMRAAM educational store: slender body, ogive nose, 4 mid-body fins + 4 tail fins.
 * Total axial length = 3.66 m (USAF AIM-120 Fact Sheet: 12 ft).
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
  const s = RENDERED_STORE_SPECS.aim120;
  const noseZ = -(s.bodyLengthM / 2 + s.noseLengthM / 2);
  return (
    <group position={position} onClick={onSelect}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s.radiusM, s.radiusM, s.bodyLengthM, 12]} />
        <meshStandardMaterial color="#dce3ec" metalness={0.3} roughness={0.42} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, noseZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[s.radiusM, s.noseLengthM, 12]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.2} roughness={0.35} clippingPlanes={clippingPlanes} />
      </mesh>
      {[0, Math.PI / 2].map((rz, i) => (
        <mesh key={`mid-${i}`} position={[0, 0, -0.15]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.44, 0.014, 0.34]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
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
 * AIM-9X Sidewinder educational store: slender body, dark IR dome, 4 forward canards + 4 aft fins.
 * Total axial length = 3.02 m (USAF AIM-9 Fact Sheet: 9 ft 11 in).
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
  const s = RENDERED_STORE_SPECS.aim9x;
  const domeZ = -s.bodyLengthM / 2;
  return (
    <group position={position} onClick={onSelect}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s.radiusM, s.radiusM, s.bodyLengthM, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.3} roughness={0.4} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, domeZ]}>
        <sphereGeometry args={[s.radiusM, 12, 10]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.18} clippingPlanes={clippingPlanes} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`can-${i}`} position={[0, 0, -1.16]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.36, 0.012, 0.22]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`rol-${i}`} position={[0, 0, 1.28]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.45, 0.012, 0.30]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * GBU-32 1,000-lb JDAM educational store: heavy Mk-83 body, nose fuse, mid-body strakes + JDAM tail kit.
 * Total axial length = 3.04 m (USAF JDAM Fact Sheet: 119.5 in).
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
  const s = RENDERED_STORE_SPECS.gbu32;
  const noseZ = -(s.bodyLengthM / 2 + s.noseLengthM / 2);
  const tailZ = s.bodyLengthM / 2 + s.tailLengthM / 2;
  return (
    <group position={position} onClick={onSelect}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s.radiusM * 0.94, s.radiusM, s.bodyLengthM, 14]} />
        <meshStandardMaterial color="#4b5548" metalness={0.35} roughness={0.58} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, noseZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[s.radiusM * 0.94, s.noseLengthM, 14]} />
        <meshStandardMaterial color="#4b5548" metalness={0.35} roughness={0.58} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, -s.bodyLengthM / 2 + 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s.radiusM * 0.96, s.radiusM * 0.96, 0.06, 14]} />
        <meshStandardMaterial color="#eab308" roughness={0.5} clippingPlanes={clippingPlanes} />
      </mesh>
      {[0, Math.PI / 2].map((rz, i) => (
        <mesh key={`str-${i}`} position={[0, 0, 0.08]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.48, 0.018, 0.92]} />
          <meshStandardMaterial color="#374151" metalness={0.45} roughness={0.5} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      <mesh position={[0, 0, tailZ]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s.radiusM, s.radiusM * 0.62, s.tailLengthM, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.45} clippingPlanes={clippingPlanes} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`jtail-${i}`} position={[0, 0, tailZ + 0.12]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.58, 0.018, 0.28]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.45} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * GBU-39B Small Diameter Bomb (SDB) educational store: compact body + stowed pop-out diamond wing pack.
 * Total axial length = 1.80 m (USAF GBU-39B Fact Sheet: 70.8 in).
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
  const s = RENDERED_STORE_SPECS.gbu39;
  const noseZ = -(s.bodyLengthM / 2 + s.noseLengthM / 2);
  return (
    <group position={position} onClick={onSelect}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[s.radiusM, s.radiusM, s.bodyLengthM, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.45} roughness={0.42} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, 0, noseZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[s.radiusM, s.noseLengthM, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.45} clippingPlanes={clippingPlanes} />
      </mesh>
      <mesh position={[0, s.radiusM + 0.012, 0.02]}>
        <boxGeometry args={[0.11, 0.032, 0.92]} />
        <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
      </mesh>
      {[Math.PI / 4, -Math.PI / 4].map((rz, i) => (
        <mesh key={`stail-${i}`} position={[0, 0, s.bodyLengthM / 2 - 0.08]} rotation={[0, 0, rz]}>
          <boxGeometry args={[0.28, 0.012, 0.16]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * BRU-61/A pneumatic 4-store carriage rack holding 4 × GBU-39B SDBs.
 */
function Bru61SdbRack({
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
      {/* Central BRU-61/A strongback beam */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[0.16, 0.07, 3.65]} />
        <meshStandardMaterial color="#334155" metalness={0.55} roughness={0.42} clippingPlanes={clippingPlanes} />
      </mesh>
      {/* Fore & aft sway-brace crossbars */}
      {[-0.96, 0.96].map((rz, i) => (
        <mesh key={`bar-${i}`} position={[0, 0.09, rz]}>
          <boxGeometry args={[0.38, 0.04, 0.12]} />
          <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.45} clippingPlanes={clippingPlanes} />
        </mesh>
      ))}
      {/* 4 × GBU-39B SDBs mounted on the rack (2 forward, 2 aft) */}
      {[-0.145, 0.145].flatMap((ox, i) =>
        [-0.96, 0.96].map((oz, j) => (
          <Gbu39SdbMesh
            key={`${i}-${j}`}
            position={[ox, -0.02, oz]}
            clippingPlanes={clippingPlanes}
            onSelect={onSelect}
          />
        ))
      )}
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
              {/* 2 × BRU-61/A racks, 4 × GBU-39B SDB per rack = 8 SDBs */}
              <Bru61SdbRack position={[-0.38, 0, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Bru61SdbRack position={[0.38, 0, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Aim120Mesh position={[-0.88, 0.04, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
              <Aim120Mesh position={[0.88, 0.04, 0]} clippingPlanes={cp} onSelect={pickOrdnance} />
            </group>
          )}
        </>
      )}

      {/* Side Weapons Bay Doors + Extending AIM-9X Sidewinders */}
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
