import { CONSTANTS_REGISTRY as R } from './config/registry.js';

export interface SkinHeatingResult {
  readonly altitudeM: number;
  readonly mach: number;
  readonly staticTempK: number;
  readonly staticTempC: number;
  readonly stagnationTempK: number;
  readonly stagnationTempC: number;
  readonly deltaTempK: number;
  readonly formulaLabel: 'SOURCED';
  readonly resultLabel: 'COMPUTED';
}

const MAX_MACH = 2; // SOURCED: panel Mach envelope (0..2)

/**
 * ISO 2533 / ICAO International Standard Atmosphere static temperature (0–20 km).
 */
export function computeIsaStaticTempK(altitudeM: number): number {
  const h = Math.max(0, Math.min(R.ISA_STRATOSPHERE_CEILING_M.value, altitudeM));
  if (h <= R.ISA_TROPOPAUSE_ALT_M.value) {
    return R.ISA_SEA_LEVEL_TEMP_K.value - R.ISA_TROPOSPHERE_LAPSE_K_M.value * h;
  }
  return R.ISA_TROPOPAUSE_TEMP_K.value;
}

/**
 * Leading-edge aerodynamic stagnation temperature:
 *   T0 = T * (1 + ((gamma - 1) / 2) * M^2) = T * (1 + 0.2 * M^2)  [SOURCED formula, gamma = 1.4]
 * Result is labeled COMPUTED.
 */
export function computeSkinHeating(altitudeM: number, mach: number): SkinHeatingResult {
  const clampedAlt = Math.max(0, Math.min(R.ISA_STRATOSPHERE_CEILING_M.value, altitudeM));
  const clampedMach = Math.max(0, Math.min(MAX_MACH, mach));
  const staticTempK = computeIsaStaticTempK(clampedAlt);
  const recoveryCoeff = (R.AIR_GAMMA_COLD.value - 1) / 2;
  const stagnationTempK = staticTempK * (1 + recoveryCoeff * clampedMach * clampedMach);

  return {
    altitudeM: clampedAlt,
    mach: clampedMach,
    staticTempK,
    staticTempC: staticTempK - R.KELVIN_OFFSET.value,
    stagnationTempK,
    stagnationTempC: stagnationTempK - R.KELVIN_OFFSET.value,
    deltaTempK: stagnationTempK - staticTempK,
    formulaLabel: 'SOURCED',
    resultLabel: 'COMPUTED',
  };
}
