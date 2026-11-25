import { CONSTANTS_REGISTRY as R } from './config/registry.js';
import type { SingleEngineState } from './engineSim.js';

/**
 * SAE ARP755 standard turbine engine station numbering:
 *   0  — Ambient
 *   2  — Engine inlet
 *   13 — Fan exit (bypass duct)
 *   25 — HPC inlet (fan core exit)
 *   3  — HPC exit
 *   4  — Combustor exit (TIT)
 *   45 — HPT exit
 *   5  — LPT exit
 *   6  — Mixer exit / AB inlet (mass-weighted bypass + core enthalpy mix)
 *   7  — AB exit
 *   8  — Nozzle throat
 */
export type BraytonStationId =
  | '0'
  | '2'
  | '13'
  | '25'
  | '3'
  | '4'
  | '45'
  | '5'
  | '6'
  | '7'
  | '8';

export interface BraytonStationState {
  readonly id: BraytonStationId;
  readonly stationCode: string;
  readonly name: string;
  readonly totalTempK: number;
  readonly totalTempC: number;
  readonly totalPressureKpa: number;
  readonly pressureRatioToAmbient: number;
  readonly label: 'COMPUTED';
}

export interface BraytonCycleResult {
  readonly regime: SingleEngineState['regime'];
  readonly disclaimer: string;
  readonly stations: Readonly<Record<BraytonStationId, BraytonStationState>>;
  readonly orderedStations: readonly BraytonStationState[];
  readonly bypassRatio: number;
  /** Fuel-to-core-air ratios computed from assumed JP-8 LHV [kg_fuel / kg_core_air]. */
  readonly fuelAirRatioCore: number;
  readonly fuelAirRatioAb: number;
  /** First-law control-volume fluxes per unit core air mass flow [J / kg_core_air]. */
  readonly inletEnthalpyFluxJKg: number;
  readonly fuelHeatReleaseJKg: number;
  readonly exitEnthalpyFluxJKg: number;
  readonly nozzlePressureRatio: number;
}

const KPA_DIVISOR = 1000; // SOURCED: exact SI Pa -> kPa factor

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function makeStation(
  id: BraytonStationId,
  name: string,
  totalTempK: number,
  totalPressurePa: number,
  ambientPressurePa: number
): BraytonStationState {
  return {
    id,
    stationCode: `Stn ${id}`,
    name,
    totalTempK,
    totalTempC: totalTempK - R.KELVIN_OFFSET.value,
    totalPressureKpa: totalPressurePa / KPA_DIVISOR,
    pressureRatioToAmbient: totalPressurePa / ambientPressurePa,
    label: 'COMPUTED',
  };
}

/**
 * Ideal twin-spool mixed-flow augmented turbofan Brayton cycle per SAE ARP755 station
 * with textbook component efficiencies and mass-weighted bypass + core enthalpy mixer.
 * Pressure ratios and TIT are ASSUMED teaching values ("F119 cycle not publicly disclosed").
 */
export function computeBraytonCycle(
  engine: Pick<SingleEngineState, 'n2Pct' | 'abFraction' | 'lit' | 'regime'>,
  ambientTempK = R.ISA_SEA_LEVEL_TEMP_K.value,
  ambientPressurePa = R.ISA_SEA_LEVEL_PRESSURE_PA.value
): BraytonCycleResult {
  const gammaC = R.AIR_GAMMA_COLD.value;
  const cpC = R.AIR_CP_COLD_J_KG_K.value;
  const gammaH = R.GAS_GAMMA_HOT.value;
  const cpH = R.GAS_CP_HOT_J_KG_K.value;
  const bpr = R.F119_BYPASS_RATIO_APPROX.value;
  const lhv = R.JET_FUEL_LHV_J_KG.value;

  const idleN2 = R.ENGINE_IDLE_N2_PCT.value;
  const milN2 = R.ENGINE_MIL_N2_PCT.value;
  const n2 = engine.n2Pct;

  const idleFrac = clamp01(n2 / Math.max(1, idleN2));
  const milFrac = clamp01((n2 - idleN2) / Math.max(1, milN2 - idleN2));

  const prFan = engine.lit
    ? R.BRAYTON_FAN_PR_IDLE.value +
      (R.BRAYTON_FAN_PR_MIL.value - R.BRAYTON_FAN_PR_IDLE.value) * milFrac
    : 1 + (R.BRAYTON_FAN_PR_IDLE.value - 1) * idleFrac * R.BRAYTON_UNLIT_PR_FRAC.value;

  const prHpc = engine.lit
    ? R.BRAYTON_HPC_PR_IDLE.value +
      (R.BRAYTON_HPC_PR_MIL.value - R.BRAYTON_HPC_PR_IDLE.value) * milFrac
    : 1 + (R.BRAYTON_HPC_PR_IDLE.value - 1) * idleFrac * R.BRAYTON_UNLIT_PR_FRAC.value;

  const coldExp = (gammaC - 1) / gammaC;
  const hotInvExp = gammaH / (gammaH - 1);

  // Stn 0: Ambient & Stn 2: Engine inlet (static ground run-up pad -> adiabatic, no ram rise)
  const t0 = ambientTempK;
  const p0 = ambientPressurePa;
  const t2 = t0;
  const p2 = p0;

  // Stn 13: Fan exit (bypass duct) & Stn 25: HPC inlet (fan core exit)
  const t13 = t2 * (1 + (Math.pow(prFan, coldExp) - 1) / R.BRAYTON_ETA_FAN.value);
  const p13 = p2 * prFan;
  const t25 = t13;
  const p25 = p13;
  const workFanCoreJKg = (1 + bpr) * cpC * (t13 - t2);

  // Stn 3: HPC exit
  const t3 = t25 * (1 + (Math.pow(prHpc, coldExp) - 1) / R.BRAYTON_ETA_HPC.value);
  const p3 = p25 * prHpc;
  const workHpcJKg = cpC * (t3 - t25);

  // Stn 4: Combustor exit (TIT)
  const rawTit = engine.lit
    ? R.BRAYTON_TIT_IDLE_K.value +
      (R.BRAYTON_TIT_MIL_K.value - R.BRAYTON_TIT_IDLE_K.value) * milFrac
    : t3;
  const t4 = Math.max(t3, rawTit);
  const p4 = engine.lit ? p3 * (1 - R.BRAYTON_COMBUSTOR_DP_FRAC.value) : p3;
  const qCombJKg = engine.lit ? Math.max(0, cpH * t4 - cpC * t3) : 0;
  const fuelAirRatioCore = qCombJKg / lhv;

  // Stn 45: HPT exit (work balanced to drive HPC)
  const dtHpt = engine.lit ? workHpcJKg / cpH : 0;
  const t45 = Math.max(t0, t4 - dtHpt);
  const hptTerm = Math.max(
    R.BRAYTON_MIN_TURBINE_TERM.value,
    1 - dtHpt / (R.BRAYTON_ETA_HPT.value * Math.max(1, t4))
  );
  const p45 = p4 * Math.pow(hptTerm, hotInvExp);

  // Stn 5: LPT exit (work balanced to drive Fan)
  const dtLpt = engine.lit ? workFanCoreJKg / cpH : 0;
  const t5 = Math.max(t0, t45 - dtLpt);
  const lptTerm = Math.max(
    R.BRAYTON_MIN_TURBINE_TERM.value,
    1 - dtLpt / (R.BRAYTON_ETA_LPT.value * Math.max(1, t45))
  );
  const p5 = p45 * Math.pow(lptTerm, hotInvExp);

  // Stn 6: Mixer exit / AB inlet (mass-weighted bypass + core enthalpy mix at bypass ratio)
  const cMix = cpH + bpr * cpC;
  const t6 = (cpH * t5 + bpr * cpC * t13) / cMix;
  const p6 = (p5 + bpr * p13) / (1 + bpr);

  // Stn 7: Afterburner (Augmentor) exit
  const abFrac = engine.lit ? clamp01(engine.abFraction) : 0;
  const t7 =
    abFrac > 0 ? Math.max(t6, t6 + abFrac * (R.BRAYTON_AB_TEMP_MAX_K.value - t6)) : t6;
  const p7 = p6 * (1 - abFrac * R.BRAYTON_AB_DP_FRAC.value);
  const qAbJKg = abFrac > 0 ? cMix * (t7 - t6) : 0;
  const fuelAirRatioAb = qAbJKg / lhv;

  // Stn 8: 2D Convergent-Divergent Nozzle throat (adiabatic)
  const t8 = t7;
  const p8 = Math.max(p0, p7 * R.BRAYTON_ETA_NOZZLE.value);

  const stations: Record<BraytonStationId, BraytonStationState> = {
    '0': makeStation('0', 'Ambient', t0, p0, p0),
    '2': makeStation('2', 'Engine Inlet', t2, p2, p0),
    '13': makeStation('13', 'Fan Exit (Bypass)', t13, p13, p0),
    '25': makeStation('25', 'HPC Inlet (Core)', t25, p25, p0),
    '3': makeStation('3', 'HPC Exit', t3, p3, p0),
    '4': makeStation('4', 'Combustor Exit (TIT)', t4, p4, p0),
    '45': makeStation('45', 'HPT Exit', t45, p45, p0),
    '5': makeStation('5', 'LPT Exit', t5, p5, p0),
    '6': makeStation('6', 'Mixer Exit / AB Inlet', t6, p6, p0),
    '7': makeStation('7', 'Afterburner Exit', t7, p7, p0),
    '8': makeStation('8', 'Nozzle Throat', t8, p8, p0),
  };

  const orderedStations: BraytonStationState[] = [
    stations['0'],
    stations['2'],
    stations['13'],
    stations['25'],
    stations['3'],
    stations['4'],
    stations['45'],
    stations['5'],
    stations['6'],
    stations['7'],
    stations['8'],
  ];

  const inletEnthalpyFluxJKg = (1 + bpr) * cpC * t0;
  const fuelHeatReleaseJKg = (fuelAirRatioCore + fuelAirRatioAb) * lhv;
  const exitEnthalpyFluxJKg = cMix * t8;

  return {
    regime: engine.regime,
    disclaimer:
      'F119 cycle not publicly disclosed — SAE ARP755 mixed-flow Brayton teaching model on ASSUMED inputs',
    stations,
    orderedStations,
    bypassRatio: bpr,
    fuelAirRatioCore,
    fuelAirRatioAb,
    inletEnthalpyFluxJKg,
    fuelHeatReleaseJKg,
    exitEnthalpyFluxJKg,
    nozzlePressureRatio: p8 / p0,
  };
}

/**
 * Maps an F119 cutaway part ID (e.g. `f119-combustor-left`) to its SAE ARP755 station ID.
 */
export function partIdToBraytonStation(partId: string): BraytonStationId | null {
  if (partId.startsWith('f119-fan-')) return '13';
  if (partId.startsWith('f119-hpc-')) return '3';
  if (partId.startsWith('f119-combustor-')) return '4';
  if (partId.startsWith('f119-hpt-')) return '45';
  if (partId.startsWith('f119-lpt-')) return '5';
  if (partId.startsWith('f119-augmentor-')) return '7';
  if (partId.startsWith('f119-nozzle-flaps-') || partId.startsWith('nozzle-2d-')) return '8';
  return null;
}
