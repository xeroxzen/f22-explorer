/**
 * Pure-TypeScript F-22 Twin F119-PW-100 Start Sequence & Spool Model.
 *
 * Zero Three.js imports — runs headless in Node/Vitest.
 * All numeric constants live in `src/sim/config/registry.ts` with explicit
 * SOURCED / APPROXIMATE / ASSUMED provenance labels.
 *
 * Educational teaching model only: real F119 control schedules, limits, and
 * fuel maps are classified / not publicly disclosed.
 */
import { CONSTANTS_REGISTRY as R } from './config/registry.js';

export type EngineStartPhase =
  | 'OFF'
  | 'BATTERY_ON'
  | 'APU_START'
  | 'ENG1_MOTOR'
  | 'ENG1_IGNITION'
  | 'ENG1_LIGHTOFF'
  | 'ENG2_MOTOR'
  | 'ENG2_IGNITION'
  | 'ENG2_LIGHTOFF'
  | 'RUNNING'
  | 'SHUTDOWN';

export type EngineRegime = 'OFF' | 'MOTORING' | 'IDLE' | 'MIL' | 'AFTERBURNER';

export interface StartStepMeta {
  readonly phase: EngineStartPhase;
  readonly index: number;
  readonly title: string;
  readonly detail: string;
  readonly durationS: number;
  readonly timingLabel: 'ASSUMED';
  readonly existenceCitation: string;
}

const RAW_START_STEPS: readonly Omit<StartStepMeta, 'index'>[] = [
  {
    phase: 'BATTERY_ON',
    title: 'Battery & Electrical Bus',
    detail: 'Energize DC/avionics buses and FADEC controllers',
    durationS: R.START_BATTERY_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Public F-22 electrical/FADEC architecture',
  },
  {
    phase: 'APU_START',
    title: 'APU Start & Spool',
    detail: 'Start self-contained Auxiliary Power Unit for autonomous ground start',
    durationS: R.START_APU_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Public F-22 APU autonomous start capability',
  },
  {
    phase: 'ENG1_MOTOR',
    title: 'Eng 1 (L) AMAD Motoring',
    detail: 'APU drives Left F119 core via Airframe-Mounted Accessory Drive',
    durationS: R.START_MOTOR_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Public F-22 AMAD gearbox architecture',
  },
  {
    phase: 'ENG1_IGNITION',
    title: 'Eng 1 (L) Ignition & Fuel',
    detail: 'Energize igniters and introduce combustor fuel flow',
    durationS: R.START_IGNITION_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Standard twin-spool turbofan start sequence',
  },
  {
    phase: 'ENG1_LIGHTOFF',
    title: 'Eng 1 (L) Light-Off → Idle',
    detail: 'Combustion light-off and acceleration to self-sustaining idle',
    durationS: R.START_LIGHTOFF_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Standard twin-spool turbofan start sequence',
  },
  {
    phase: 'ENG2_MOTOR',
    title: 'Eng 2 (R) AMAD Motoring',
    detail: 'Drive Right F119 core via AMAD accessory gearbox',
    durationS: R.START_MOTOR_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Public F-22 AMAD gearbox architecture',
  },
  {
    phase: 'ENG2_IGNITION',
    title: 'Eng 2 (R) Ignition & Fuel',
    detail: 'Energize right igniters and introduce combustor fuel flow',
    durationS: R.START_IGNITION_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Standard twin-spool turbofan start sequence',
  },
  {
    phase: 'ENG2_LIGHTOFF',
    title: 'Eng 2 (R) Light-Off → Idle',
    detail: 'Right F119 light-off and stabilization at ground idle',
    durationS: R.START_LIGHTOFF_DURATION_S.value,
    timingLabel: 'ASSUMED',
    existenceCitation: 'Standard twin-spool turbofan start sequence',
  },
  {
    phase: 'RUNNING',
    title: 'Both Engines Idle / Ready',
    detail: 'Twin F119-PW-100 engines online — throttle unlocked (Idle / Mil / AB)',
    durationS: 0,
    timingLabel: 'ASSUMED',
    existenceCitation: 'USAF F-22 Fact Sheet (twin F119-PW-100)',
  },
];

export const ENGINE_START_STEPS: readonly StartStepMeta[] = RAW_START_STEPS.map(
  (step, index) => ({ ...step, index })
);

export interface SingleEngineState {
  readonly lit: boolean;
  /** Generic core spool speed [0..100] % (ASSUMED scale). */
  readonly n2Pct: number;
  /** Normalized afterburner staging [0..1]. */
  readonly abFraction: number;
  /** True when afterburner is lit. */
  readonly afterburnerOn: boolean;
  /** Normalized thrust [0..1] relative to 35,000-lbf class. */
  readonly thrustFraction: number;
  /** Approximate thrust in lbf (capped at sourced 35,000-lbf class). */
  readonly thrustLbf: number;
  /** Approximate thrust in kN. */
  readonly thrustKn: number;
  /** Convergent-divergent 2D nozzle area opening [0..1]. */
  readonly nozzleOpenFraction: number;
  readonly regime: EngineRegime;
}

export interface EngineSimState {
  readonly phase: EngineStartPhase;
  readonly phaseElapsedS: number;
  readonly totalElapsedS: number;
  readonly batteryOn: boolean;
  /** APU spool [0..1]. */
  readonly apuSpoolFrac: number;
  /** Pilot throttle lever [0..1]: 0 = Idle, 0.75 = Mil (dry), >0.75..1 = Afterburner. */
  readonly throttle: number;
  readonly left: SingleEngineState;
  readonly right: SingleEngineState;
  /** True when engines are starting/running (jet relocated to outdoor run-up pad). */
  readonly outdoors: boolean;
  readonly totalThrustLbf: number;
  readonly totalThrustKn: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function firstOrderLag(current: number, target: number, tauS: number, dtS: number): number {
  if (dtS <= 0 || tauS <= 0) return target;
  const alpha = 1 - Math.exp(-dtS / tauS);
  return current + (target - current) * alpha;
}

function computeEngineDerived(
  lit: boolean,
  n2Pct: number,
  abFraction: number
): SingleEngineState {
  const idleN2 = R.ENGINE_IDLE_N2_PCT.value;
  const milN2 = R.ENGINE_MIL_N2_PCT.value;
  const idleThrust = R.F119_IDLE_THRUST_FRACTION.value;
  const dryThrust = R.F119_DRY_THRUST_FRACTION.value;
  const abClassLbf = R.F119_AB_THRUST_CLASS_LBF.value;
  const lbfToKn = R.LBF_TO_KN.value;
  const nozIdle = R.ENGINE_NOZZLE_IDLE_OPEN_FRAC.value;
  const nozMil = R.ENGINE_NOZZLE_MIL_OPEN_FRAC.value;
  const nozAb = R.ENGINE_NOZZLE_AB_OPEN_FRAC.value;

  const clampedN2 = clamp(n2Pct, 0, milN2);
  const clampedAb = lit && clampedN2 >= idleN2 ? clamp(abFraction, 0, 1) : 0;

  let thrustFraction = 0;
  let nozzleOpenFraction = nozIdle;
  let regime: EngineRegime = 'OFF';

  if (lit) {
    const dryNorm = clamp((clampedN2 - idleN2) / Math.max(1, milN2 - idleN2), 0, 1);
    const dryCurve = idleThrust + (dryThrust - idleThrust) * (dryNorm * dryNorm);
    const abBoost = (1 - dryThrust) * clampedAb;
    thrustFraction = clamp(dryCurve + abBoost, 0, 1);
    nozzleOpenFraction =
      nozIdle + (nozMil - nozIdle) * dryNorm + (nozAb - nozMil) * clampedAb;

    if (clampedAb > R.ENGINE_AB_ON_THRESHOLD.value) {
      regime = 'AFTERBURNER';
    } else if (dryNorm > R.ENGINE_MIL_REGIME_THRESHOLD.value) {
      regime = 'MIL';
    } else {
      regime = 'IDLE';
    }
  } else if (clampedN2 > 1) {
    regime = 'MOTORING';
  }

  const thrustLbf = clamp(thrustFraction * abClassLbf, 0, abClassLbf);
  const thrustKn = thrustLbf * lbfToKn;

  return {
    lit,
    n2Pct: clampedN2,
    abFraction: clampedAb,
    afterburnerOn: clampedAb > R.ENGINE_AB_ON_THRESHOLD.value,
    thrustFraction,
    thrustLbf,
    thrustKn,
    nozzleOpenFraction,
    regime,
  };
}

export function createInitialEngineSimState(): EngineSimState {
  const offEng = computeEngineDerived(false, 0, 0);
  return {
    phase: 'OFF',
    phaseElapsedS: 0,
    totalElapsedS: 0,
    batteryOn: false,
    apuSpoolFrac: 0,
    throttle: 0,
    left: offEng,
    right: offEng,
    outdoors: false,
    totalThrustLbf: 0,
    totalThrustKn: 0,
  };
}

export function startEngineSequence(state: EngineSimState): EngineSimState {
  if (state.phase !== 'OFF' && state.phase !== 'SHUTDOWN') {
    return state;
  }
  return {
    ...state,
    phase: 'BATTERY_ON',
    phaseElapsedS: 0,
    batteryOn: true,
    throttle: 0,
    outdoors: true,
  };
}

export function abortOrShutdownEngines(state: EngineSimState): EngineSimState {
  if (state.phase === 'OFF') return state;
  return {
    ...state,
    phase: 'SHUTDOWN',
    phaseElapsedS: 0,
    throttle: 0,
    left: computeEngineDerived(false, state.left.n2Pct, 0),
    right: computeEngineDerived(false, state.right.n2Pct, 0),
  };
}

export function setEngineThrottle(state: EngineSimState, throttle: number): EngineSimState {
  return {
    ...state,
    throttle: clamp(throttle, 0, 1),
  };
}

const NEXT_START_PHASE: Partial<Record<EngineStartPhase, { next: EngineStartPhase; dur: number }>> = {
  BATTERY_ON: { next: 'APU_START', dur: R.START_BATTERY_DURATION_S.value },
  APU_START: { next: 'ENG1_MOTOR', dur: R.START_APU_DURATION_S.value },
  ENG1_MOTOR: { next: 'ENG1_IGNITION', dur: R.START_MOTOR_DURATION_S.value },
  ENG1_IGNITION: { next: 'ENG1_LIGHTOFF', dur: R.START_IGNITION_DURATION_S.value },
  ENG1_LIGHTOFF: { next: 'ENG2_MOTOR', dur: R.START_LIGHTOFF_DURATION_S.value },
  ENG2_MOTOR: { next: 'ENG2_IGNITION', dur: R.START_MOTOR_DURATION_S.value },
  ENG2_IGNITION: { next: 'ENG2_LIGHTOFF', dur: R.START_IGNITION_DURATION_S.value },
  ENG2_LIGHTOFF: { next: 'RUNNING', dur: R.START_LIGHTOFF_DURATION_S.value },
};

function stepSingleEngine(
  eng: SingleEngineState,
  targetLit: boolean,
  targetN2: number,
  targetAb: number,
  dtS: number
): SingleEngineState {
  const tauN2 = targetLit
    ? targetN2 >= eng.n2Pct
      ? R.ENGINE_SPOOL_UP_TAU_S.value
      : R.ENGINE_SPOOL_DOWN_TAU_S.value
    : targetN2 > eng.n2Pct
      ? R.ENGINE_SPOOL_UP_TAU_S.value
      : R.SHUTDOWN_COOLDOWN_TAU_S.value;

  const nextN2 = firstOrderLag(eng.n2Pct, targetN2, tauN2, dtS);
  const nextAb = targetLit
    ? firstOrderLag(eng.abFraction, targetAb, R.ENGINE_AB_TAU_S.value, dtS)
    : 0;
  return computeEngineDerived(targetLit, nextN2, nextAb);
}

export function stepEngineSim(state: EngineSimState, dtS: number): EngineSimState {
  if (dtS <= 0) return state;

  let phase = state.phase;
  let phaseElapsedS = state.phaseElapsedS + dtS;
  const totalElapsedS = state.totalElapsedS + dtS;

  const transition = NEXT_START_PHASE[phase];
  if (transition && phaseElapsedS >= transition.dur) {
    phase = transition.next;
    phaseElapsedS = 0;
  }

  const idleN2 = R.ENGINE_IDLE_N2_PCT.value;
  const milN2 = R.ENGINE_MIL_N2_PCT.value;
  const motorN2 = R.START_MOTOR_N2_PCT.value;
  const milThresh = R.ENGINE_MIL_THROTTLE_THRESHOLD.value;

  let batteryOn = state.batteryOn;
  let targetApu = 0;
  let leftLit = false;
  let rightLit = false;
  let leftTargetN2 = 0;
  let rightTargetN2 = 0;
  let leftTargetAb = 0;
  let rightTargetAb = 0;

  switch (phase) {
    case 'OFF':
      batteryOn = false;
      targetApu = 0;
      break;
    case 'BATTERY_ON':
      batteryOn = true;
      targetApu = 0;
      break;
    case 'APU_START':
      batteryOn = true;
      targetApu = 1;
      break;
    case 'ENG1_MOTOR':
      batteryOn = true;
      targetApu = 1;
      leftTargetN2 = motorN2;
      break;
    case 'ENG1_IGNITION':
      batteryOn = true;
      targetApu = 1;
      leftTargetN2 = motorN2;
      break;
    case 'ENG1_LIGHTOFF':
      batteryOn = true;
      targetApu = 1;
      leftLit = true;
      leftTargetN2 = idleN2;
      break;
    case 'ENG2_MOTOR':
      batteryOn = true;
      targetApu = 1;
      leftLit = true;
      leftTargetN2 = idleN2;
      rightTargetN2 = motorN2;
      break;
    case 'ENG2_IGNITION':
      batteryOn = true;
      targetApu = 1;
      leftLit = true;
      leftTargetN2 = idleN2;
      rightTargetN2 = motorN2;
      break;
    case 'ENG2_LIGHTOFF':
      batteryOn = true;
      targetApu = 1;
      leftLit = true;
      leftTargetN2 = idleN2;
      rightLit = true;
      rightTargetN2 = idleN2;
      break;
    case 'RUNNING': {
      batteryOn = true;
      targetApu = 0; // APU automatically disengages once both engines are self-sustaining
      leftLit = true;
      rightLit = true;
      const dryFrac = clamp(state.throttle / milThresh, 0, 1);
      const abFrac =
        state.throttle > milThresh
          ? clamp((state.throttle - milThresh) / (1 - milThresh), 0, 1)
          : 0;
      leftTargetN2 = idleN2 + (milN2 - idleN2) * dryFrac;
      rightTargetN2 = leftTargetN2;
      leftTargetAb = abFrac;
      rightTargetAb = abFrac;
      break;
    }
    case 'SHUTDOWN':
      batteryOn = true;
      targetApu = 0;
      leftLit = false;
      rightLit = false;
      leftTargetN2 = 0;
      rightTargetN2 = 0;
      break;
  }

  const apuTau =
    targetApu > state.apuSpoolFrac
      ? R.ENGINE_APU_SPOOL_TAU_S.value
      : R.SHUTDOWN_COOLDOWN_TAU_S.value * 0.5;
  const apuSpoolFrac = clamp(firstOrderLag(state.apuSpoolFrac, targetApu, apuTau, dtS), 0, 1);

  const left = stepSingleEngine(state.left, leftLit, leftTargetN2, leftTargetAb, dtS);
  const right = stepSingleEngine(state.right, rightLit, rightTargetN2, rightTargetAb, dtS);

  // Finish SHUTDOWN -> OFF once both cores and APU have spooled down
  const cutoffN2 = R.ENGINE_SHUTDOWN_N2_CUTOFF_PCT.value;
  if (
    phase === 'SHUTDOWN' &&
    left.n2Pct < cutoffN2 &&
    right.n2Pct < cutoffN2 &&
    apuSpoolFrac < R.ENGINE_AB_ON_THRESHOLD.value
  ) {
    return createInitialEngineSimState();
  }

  return {
    phase,
    phaseElapsedS,
    totalElapsedS,
    batteryOn,
    apuSpoolFrac,
    throttle: state.throttle,
    left,
    right,
    outdoors: phase !== 'OFF',
    totalThrustLbf: left.thrustLbf + right.thrustLbf,
    totalThrustKn: left.thrustKn + right.thrustKn,
  };
}

/**
 * Helper to jump directly to a steady-state educational regime (used by UI quick-inspect
 * presets and deterministic screenshot/verification scenarios).
 */
export function createEnginePresetState(
  preset: 'off' | 'mid-start' | 'idle' | 'mil' | 'ab'
): EngineSimState {
  if (preset === 'off') return createInitialEngineSimState();
  if (preset === 'mid-start') {
    const left = computeEngineDerived(true, R.ENGINE_IDLE_N2_PCT.value, 0);
    const right = computeEngineDerived(false, R.START_MOTOR_N2_PCT.value, 0);
    const elapsedBeforeEng2 =
      R.START_BATTERY_DURATION_S.value +
      R.START_APU_DURATION_S.value +
      R.START_MOTOR_DURATION_S.value +
      R.START_IGNITION_DURATION_S.value +
      R.START_LIGHTOFF_DURATION_S.value +
      R.START_MOTOR_DURATION_S.value * 0.5;
    return {
      phase: 'ENG2_MOTOR',
      phaseElapsedS: R.START_MOTOR_DURATION_S.value * 0.5,
      totalElapsedS: elapsedBeforeEng2,
      batteryOn: true,
      apuSpoolFrac: 1,
      throttle: 0,
      left,
      right,
      outdoors: true,
      totalThrustLbf: left.thrustLbf + right.thrustLbf,
      totalThrustKn: left.thrustKn + right.thrustKn,
    };
  }
  const throttle =
    preset === 'idle' ? 0 : preset === 'mil' ? R.ENGINE_MIL_THROTTLE_THRESHOLD.value : 1;
  const n2 = preset === 'idle' ? R.ENGINE_IDLE_N2_PCT.value : R.ENGINE_MIL_N2_PCT.value;
  const ab = preset === 'ab' ? 1 : 0;
  const eng = computeEngineDerived(true, n2, ab);
  const fullStartDuration = ENGINE_START_STEPS.reduce((acc, s) => acc + s.durationS, 0);
  return {
    phase: 'RUNNING',
    phaseElapsedS: 0,
    totalElapsedS: fullStartDuration,
    batteryOn: true,
    apuSpoolFrac: 0,
    throttle,
    left: eng,
    right: eng,
    outdoors: true,
    totalThrustLbf: eng.thrustLbf * 2,
    totalThrustKn: eng.thrustKn * 2,
  };
}
