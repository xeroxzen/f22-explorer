import { useMemo } from 'react';
import * as THREE from 'three';
import { computeBraytonCycle, partIdToBraytonStation } from '../sim/braytonCycle.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { fsToZ } from './f22Geometry.js';
import { temperatureToInfernoHex } from './thermalColormap.js';

interface Props {
  readonly partId: string;
  readonly clippingPlanes: readonly THREE.Plane[];
  readonly isSelected: boolean;
  readonly isHovered: boolean;
}

const STAGE_Z_CENTER: Record<string, number> = {
  fan: fsToZ(12.96),
  hpc: fsToZ(13.69),
  combustor: fsToZ(14.34),
  hpt: fsToZ(14.80),
  lpt: fsToZ(15.20),
  augmentor: fsToZ(15.99),
  'nozzle-flaps': fsToZ(16.72),
};

const NEUTRAL_STAGE_METAL: Record<string, { color: string; metalness: number; roughness: number }> = {
  fan: { color: '#9aa4b2', metalness: 0.84, roughness: 0.28 },
  hpc: { color: '#7d8896', metalness: 0.86, roughness: 0.26 },
  combustor: { color: '#6b645c', metalness: 0.72, roughness: 0.38 },
  hpt: { color: '#8f8275', metalness: 0.85, roughness: 0.28 },
  lpt: { color: '#7e766e', metalness: 0.85, roughness: 0.30 },
  augmentor: { color: '#4d5561', metalness: 0.76, roughness: 0.38 },
  'nozzle-flaps': { color: '#39404b', metalness: 0.80, roughness: 0.34 },
};

function parseF119Stage(partId: string): { stage: string; side: -1 | 1 } | null {
  if (!partId.startsWith('f119-')) return null;
  const isLeft = partId.endsWith('-left');
  const isRight = partId.endsWith('-right');
  if (!isLeft && !isRight) return null;
  const stage = partId.slice('f119-'.length, isLeft ? -'-left'.length : -'-right'.length);
  if (!(stage in STAGE_Z_CENTER)) return null;
  return { stage, side: isLeft ? -1 : 1 };
}

export function isF119CutawayPart(partId: string): boolean {
  return parseF119Stage(partId) !== null;
}

/**
 * Recognizable parametric F119-PW-100 cutaway stage geometry (ASSUMED geometry):
 * fan blades + spinner, 6-stage HPC drums, annular combustor + fuel nozzles,
 * single-stage HPT & counter-rotating LPT disks, augmentor flameholders & spray bars,
 * and 2D convergent-divergent nozzle flaps.
 */
export function F119CutawayDetail({
  partId,
  clippingPlanes,
  isSelected,
  isHovered,
}: Props) {
  const engineSim = useExplorerStore((s) => s.engineSim);
  const showThermalColors = useExplorerStore((s) => s.showThermalColors);

  const parsed = parseF119Stage(partId);
  const stationId = partIdToBraytonStation(partId);

  const matProps = useMemo(() => {
    if (!parsed) return null;
    const base = NEUTRAL_STAGE_METAL[parsed.stage] ?? NEUTRAL_STAGE_METAL.fan!;
    const eng = parsed.side === -1 ? engineSim.left : engineSim.right;

    let color = base.color;
    let emissive = '#000000';
    let emissiveIntensity = 0;

    if (showThermalColors && stationId) {
      const cycle = computeBraytonCycle(eng);
      const st = cycle.stations[stationId];
      color = temperatureToInfernoHex(st.totalTempK);
      if (st.totalTempK > 700) {
        emissive = color;
        emissiveIntensity = Math.min(0.85, (st.totalTempK - 700) / 1700);
      }
    }

    // In thermal mode, preserve the Inferno temperature color intact (selection uses a separate outline ring below)
    if (!showThermalColors) {
      if (isSelected) {
        emissive = '#0ea5e9';
        emissiveIntensity = Math.max(emissiveIntensity, 0.45);
      } else if (isHovered) {
        emissive = '#38bdf8';
        emissiveIntensity = Math.max(emissiveIntensity, 0.22);
      }
    }

    return {
      color,
      metalness: showThermalColors ? 0.35 : base.metalness,
      roughness: showThermalColors ? 0.42 : base.roughness,
      emissive,
      emissiveIntensity,
    };
  }, [parsed, stationId, engineSim.left, engineSim.right, showThermalColors, isSelected, isHovered]);

  if (!parsed || !matProps) return null;
  const cp = clippingPlanes as THREE.Plane[];
  const xEng = parsed.side * 0.72;
  const yEng = 1.70;
  const zEng = STAGE_Z_CENTER[parsed.stage]!;

  const primaryMat = (
    <meshStandardMaterial
      color={matProps.color}
      metalness={matProps.metalness}
      roughness={matProps.roughness}
      emissive={matProps.emissive}
      emissiveIntensity={matProps.emissiveIntensity}
      clippingPlanes={cp}
    />
  );

  const accentMat = (
    <meshStandardMaterial
      color={showThermalColors ? matProps.color : '#525c69'}
      metalness={0.78}
      roughness={0.34}
      emissive={matProps.emissive}
      emissiveIntensity={matProps.emissiveIntensity * 0.75}
      clippingPlanes={cp}
    />
  );

  return (
    <group position={[xEng, yEng, zEng]} name={`detail-${partId}`}>
      {showThermalColors && (isSelected || isHovered) && (
        <mesh>
          <torusGeometry args={[0.53, isSelected ? 0.022 : 0.014, 8, 28]} />
          <meshBasicMaterial
            color={isSelected ? '#38bdf8' : '#7dd3fc'}
            transparent
            opacity={isSelected ? 0.95 : 0.65}
            toneMapped={false}
          />
        </mesh>
      )}
      {parsed.stage === 'fan' && (
        <>
          {/* Nose spinner cone & central hub */}
          <mesh position={[0, 0, -0.32]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.14, 0.24, 14]} />
            {accentMat}
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.16, 0.54, 14]} />
            {accentMat}
          </mesh>
          {/* 3 axial fan rotor stages with 12 pitched blades each */}
          {[-0.17, 0.0, 0.17].map((dz, sIdx) => (
            <group key={sIdx} position={[0, 0, dz]}>
              {Array.from({ length: 12 }, (_, bIdx) => {
                const ang = (bIdx / 12) * Math.PI * 2 + sIdx * 0.22;
                return (
                  <group key={bIdx} rotation={[0, 0, ang]}>
                    <mesh position={[0.29, 0, 0]} rotation={[0.42, 0, 0]}>
                      <boxGeometry args={[0.31, 0.024, 0.11]} />
                      {primaryMat}
                    </mesh>
                  </group>
                );
              })}
            </group>
          ))}
          {/* Outer fan case shroud ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.47, 0.46, 0.56, 20, 1, true]} />
            <meshStandardMaterial
              color={matProps.color}
              metalness={matProps.metalness}
              roughness={matProps.roughness}
              emissive={matProps.emissive}
              emissiveIntensity={matProps.emissiveIntensity * 0.6}
              transparent
              opacity={0.42}
              side={THREE.DoubleSide}
              clippingPlanes={cp}
            />
          </mesh>
        </>
      )}

      {parsed.stage === 'hpc' && (
        <>
          {/* Central HP spool drum shaft */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.19, 0.68, 14]} />
            {accentMat}
          </mesh>
          {/* 6 tapering high-pressure compressor rotor drums + stator rings */}
          {[-0.27, -0.16, -0.05, 0.06, 0.17, 0.27].map((dz, idx) => {
            const r = 0.41 - idx * 0.015;
            return (
              <group key={idx} position={[0, 0, dz]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[r, r, 0.065, 18]} />
                  {primaryMat}
                </mesh>
                {Array.from({ length: 10 }, (_, bIdx) => {
                  const ang = (bIdx / 10) * Math.PI * 2 + idx * 0.3;
                  return (
                    <group key={bIdx} rotation={[0, 0, ang]}>
                      <mesh position={[r - 0.04, 0, 0]} rotation={[-0.35, 0, 0]}>
                        <boxGeometry args={[0.10, 0.016, 0.06]} />
                        {accentMat}
                      </mesh>
                    </group>
                  );
                })}
              </group>
            );
          })}
        </>
      )}

      {parsed.stage === 'combustor' && (
        <>
          {/* Outer annular Floatwall combustor liner */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.42, 20, 1, true]} />
            <meshStandardMaterial
              color={matProps.color}
              metalness={matProps.metalness}
              roughness={matProps.roughness}
              emissive={matProps.emissive}
              emissiveIntensity={matProps.emissiveIntensity}
              side={THREE.DoubleSide}
              clippingPlanes={cp}
            />
          </mesh>
          {/* Inner annular liner wall */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.42, 16]} />
            {accentMat}
          </mesh>
          {/* 10 radial fuel injector nozzles on front dome */}
          {Array.from({ length: 10 }, (_, i) => {
            const ang = (i / 10) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(ang) * 0.33, Math.sin(ang) * 0.33, -0.18]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.032, 0.045, 0.12, 8]} />
                {primaryMat}
              </mesh>
            );
          })}
        </>
      )}

      {(parsed.stage === 'hpt' || parsed.stage === 'lpt') && (
        <>
          {/* Turbine rotor disk & shaft */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.18, 18]} />
            {accentMat}
          </mesh>
          {/* Single-stage blades (counter-rotating pitch between HPT and LPT) */}
          {Array.from({ length: parsed.stage === 'hpt' ? 16 : 18 }, (_, i) => {
            const count = parsed.stage === 'hpt' ? 16 : 18;
            const ang = (i / count) * Math.PI * 2;
            const bladeLen = parsed.stage === 'hpt' ? 0.18 : 0.21;
            const pitch = parsed.stage === 'hpt' ? 0.45 : -0.45;
            return (
              <group key={i} rotation={[0, 0, ang]}>
                <mesh position={[0.24 + bladeLen * 0.5, 0, 0]} rotation={[pitch, 0, 0]}>
                  <boxGeometry args={[bladeLen, 0.022, 0.14]} />
                  {primaryMat}
                </mesh>
              </group>
            );
          })}
          {/* Outer shroud ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[parsed.stage === 'hpt' ? 0.43 : 0.46, 0.024, 8, 22]} />
            {primaryMat}
          </mesh>
        </>
      )}

      {parsed.stage === 'augmentor' && (
        <>
          {/* Corrugated thermal liner */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.44, 1.04, 20, 1, true]} />
            <meshStandardMaterial
              color={matProps.color}
              metalness={matProps.metalness}
              roughness={matProps.roughness}
              emissive={matProps.emissive}
              emissiveIntensity={matProps.emissiveIntensity}
              transparent
              opacity={0.62}
              side={THREE.DoubleSide}
              clippingPlanes={cp}
            />
          </mesh>
          {/* 3 concentric V-gutter flameholder rings */}
          {[0.18, 0.30, 0.40].map((r, i) => (
            <mesh key={i} position={[0, 0, -0.26]}>
              <torusGeometry args={[r, 0.022, 6, 18]} />
              {primaryMat}
            </mesh>
          ))}
          {/* 6 curved radar-blocking spray bars */}
          {Array.from({ length: 6 }, (_, i) => {
            const ang = (i / 6) * Math.PI * 2;
            return (
              <group key={i} rotation={[0, 0, ang]}>
                <mesh position={[0.21, 0, -0.34]} rotation={[0, 0, 0.18]}>
                  <boxGeometry args={[0.38, 0.036, 0.14]} />
                  {accentMat}
                </mesh>
              </group>
            );
          })}
          {/* Central tailcone bullet */}
          <mesh position={[0, 0, -0.30]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.14, 0.48, 12]} />
            {accentMat}
          </mesh>
        </>
      )}

      {parsed.stage === 'nozzle-flaps' && (
        <>
          {/* Upper & lower 2D pitch-vectoring convergent-divergent nozzle flaps */}
          <mesh position={[0, 0.22, 0]} rotation={[-0.14, 0, 0]}>
            <boxGeometry args={[0.78, 0.06, 0.34]} />
            {primaryMat}
          </mesh>
          <mesh position={[0, -0.22, 0]} rotation={[0.14, 0, 0]}>
            <boxGeometry args={[0.78, 0.06, 0.34]} />
            {primaryMat}
          </mesh>
          {/* Left & right fixed nozzle sidewalls */}
          <mesh position={[-0.40, 0, 0]}>
            <boxGeometry args={[0.05, 0.48, 0.34]} />
            {accentMat}
          </mesh>
          <mesh position={[0.40, 0, 0]}>
            <boxGeometry args={[0.05, 0.48, 0.34]} />
            {accentMat}
          </mesh>
        </>
      )}
    </group>
  );
}
