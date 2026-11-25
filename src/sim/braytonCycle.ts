import { CONSTANTS_REGISTRY as R } from './config/registry.js';
import type { SingleEngineState } from './engineSim.js';

export type BraytonStationId =
  | 'ambient'
  | 'fan'
  | 'hpc'
  | 'combustor'
  | 'hpt'
  | 'lpt'
  | 'augmentor'
  | 'nozzle';

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
  /** Specific work terms per unit core mass flow [J/kg] for energy-balance verification. */
  readonly workFanCoreJKg: number;
  readonly workHpcJKg: number;
  readonly workHptJKg: number;
  readonly workLptJKg: number;
  readonly energyBalanceResidualJKg: number;
  readonly nozzlePressureRatio: number;
}

const KPA_DIVISOR = 1000; // SOURCED: exact SI Pa -> kPa factor

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function makeStation(
  id: BraytonStationId,
  stationCode: string,
  name: string,
  totalTempK: number,
  totalPressurePa: number,
  ambientPressurePa: number
): BraytonStationState {
  return {
    id,
    stationCode,
    name,
    totalTempK,
    totalTempC: totalTempK - R.KELVIN_OFFSET.value,
    totalPressureKpa: totalPressurePa / KPA_DIVISOR,
    pressureRatioToAmbient: totalPressurePa / ambientPressurePa,
    label: 'COMPUTED',
  };
}

/**
 * Ideal twin-spool augmented turbofan Brayton cycle per station with textbook
 * component efficiencies. Pressure ratios and turbine inlet temperature are
 * ASSUMED teaching values ("F119 cycle not publicly disclosed").
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
  const bpr = R.BRAYTON_BYPASS_RATIO.value;

  const idleN2 = R.ENGINE_IDLE_N2_PCT.value;
  const milN2 = R.ENGINE_MIL_N2_PCT.value;
  const n2 = engine.n2Pct;

  // Map spool N2% smoothly across OFF -> IDLE -> MIL
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

  // Station 0: Ambient
  const t0 = ambientTempK;
  const p0 = ambientPressurePa;

  // Station 2: Fan exit
  const t2 = t0 * (1 + (Math.pow(prFan, coldExp) - 1) / R.BRAYTON_ETA_FAN.value);
  const p2 = p0 * prFan;
  const workFanCoreJKg = (1 + bpr) * cpC * (t2 - t0);

  // Station 3: HPC exit
  const t3 = t2 * (1 + (Math.pow(prHpc, coldExp) - 1) / R.BRAYTON_ETA_HPC.value);
  const p3 = p2 * prHpc;
  const workHpcJKg = cpC * (t3 - t2);

  // Station 4: Combustor exit (TIT)
  const rawTit = engine.lit
    ? R.BRAYTON_TIT_IDLE_K.value +
      (R.BRAYTON_TIT_MIL_K.value - R.BRAYTON_TIT_IDLE_K.value) * milFrac
    : t3;
  const t4 = Math.max(t3, rawTit);
  const p4 = engine.lit ? p3 * (1 - R.BRAYTON_COMBUSTOR_DP_FRAC.value) : p3;

  // Station 4.5: HPT exit — work balanced to drive HPC (w_hpt = w_hpc)
  const workHptJKg = engine.lit ? workHpcJKg : 0;
  const dtHpt = workHptJKg / cpH;
  const t45 = Math.max(t0, t4 - dtHpt);
  const hptTerm = Math.max(
    R.BRAYTON_MIN_TURBINE_TERM.value,
    1 - dtHpt / (R.BRAYTON_ETA_HPT.value * Math.max(1, t4))
  );
  const p45 = p4 * Math.pow(hptTerm, hotInvExp);

  // Station 5: LPT exit — work balanced to drive Fan (w_lpt = (1 + BPR) * w_fan)
  const workLptJKg = engine.lit ? workFanCoreJKg : 0;
  const dtLpt = workLptJKg / cpH;
  const t5 = Math.max(t0, t45 - dtLpt);
  const lptTerm = Math.max(
    R.BRAYTON_MIN_TURBINE_TERM.value,
    1 - dtLpt / (R.BRAYTON_ETA_LPT.value * Math.max(1, t45))
  );
  const p5 = p45 * Math.pow(lptTerm, hotInvExp);

  // Station 6: Augmentor (Afterburner) exit
  const abFrac = engine.lit ? clamp01(engine.abFraction) : 0;
  const t6 =
    abFrac > 0
      ? Math.max(t5, t5 + abFrac * (R.BRAYTON_AB_TEMP_MAX_K.value - t5))
      : t5;
  const p6 = p5 * (1 - abFrac * R.BRAYTON_AB_DP_FRAC.value);

  // Station 8/9: 2D Convergent-Divergent Nozzle
  const t8 = t6;
  const p8 = Math.max(p0, p6 * R.BRAYTON_ETA_NOZZLE.value);

  const stations: Record<BraytonStationId, BraytonStationState> = {
    ambient: makeStation('ambient', 'Stn 0', 'Ambient Intake', t0, p0, p0),
    fan: makeStation('fan', 'Stn 2', '3-Stage Fan Exit', t2, p2, p0),
    hpc: makeStation('hpc', 'Stn 3', '6-Stage HPC Exit', t3, p3, p0),
    combustor: makeStation('combustor', 'Stn 4', 'Combustor Exit (TIT)', t4, p4, p0),
    hpt: makeStation('hpt', 'Stn 4.5', 'HP Turbine Exit', t45, p45, p0),
    lpt: makeStation('lpt', 'Stn 5', 'LP Turbine Exit', t5, p5, p0),
    augmentor: makeStation('augmentor', 'Stn 6', 'Augmentor Exit', t6, p6, p0),
    nozzle: makeStation('nozzle', 'Stn 8', '2D Vectoring Nozzle', t8, p8, p0),
  };

  const orderedStations: BraytonStationState[] = [
    stations.ambient,
    stations.fan,
    stations.hpc,
    stations.combustor,
    stations.hpt,
    stations.lpt,
    stations.augmentor,
    stations.nozzle,
  ];

  const energyBalanceResidualJKg = engine.lit
    ? Math.abs(workHptJKg + workLptJKg - (workHpcJKg + workFanCoreJKg))
    : 0;

  return {
    regime: engine.regime,
    disclaimer: 'F119 cycle not publicly disclosed — ideal Brayton teaching model on ASSUMED inputs',
    stations,
    orderedStations,
    workFanCoreJKg,
    workHpcJKg,
    workHptJKg,
    workLptJKg,
    energyBalanceResidualJKg,
    nozzlePressureRatio: p8 / p0,
  };
}

/**
 * Maps an F119 cutaway part ID (e.g. `f119-combustor-left`) to its Brayton station ID.
 */
export function partIdToBraytonStation(partId: string): BraytonStationId | null {
  if (partId.startsWith('f119-fan-')) return 'fan';
  if (partId.startsWith('f119-hpc-')) return 'hpc';
  if (partId.startsWith('f119-combustor-')) return 'combustor';
  if (partId.startsWith('f119-hpt-')) return 'hpt';
  if (partId.startsWith('f119-lpt-')) return 'lpt';
  if (partId.startsWith('f119-augmentor-')) return 'augmentor';
  if (partId.startsWith('f119-nozzle-flaps-') || partId.startsWith('nozzle-2d-')) return 'nozzle';
  return null;
}
