import { create } from 'zustand';
import { soundEngine } from '../audio/soundEngine.js';
import type { TourId } from '../content/tours.js';
import {
  abortOrShutdownEngines,
  createEnginePresetState,
  createInitialEngineSimState,
  setEngineThrottle,
  startEngineSequence,
  stepEngineSim,
  type EngineSimState,
} from '../sim/engineSim.js';
import type { VlmSolveResult } from '../sim/vlmSolver.js';

export type QualityTier = 'low' | 'med' | 'high';
export type ClipAxis = 'none' | 'x' | 'y' | 'z';
export type ExplorerMode = 'explore' | 'cockpit' | 'weapons' | 'engines' | 'airflow';
export type CameraPresetId =
  | 'three-quarter'
  | 'front'
  | 'top'
  | 'side'
  | 'rear'
  | 'cockpit'
  | 'bays'
  | 'thermal-cutaway';
export type WeaponsLoadoutId = 'air-to-air' | 'jdam' | 'sdb';

export interface QualityPreset {
  readonly dpr: number | [number, number];
  readonly bloom: boolean;
  readonly shadows: boolean;
  readonly antialias: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: { dpr: 1, bloom: false, shadows: false, antialias: false },
  med: { dpr: [1, 1.25], bloom: true, shadows: false, antialias: true },
  high: { dpr: [1, 1.5], bloom: true, shadows: true, antialias: true },
};

export function detectDefaultQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'high';
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPhone = w <= 600 || (h <= 500 && w <= 950);
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return isPhone || coarse ? 'low' : 'high';
}

export interface ExplorerState {
  readonly sceneReady: boolean;
  readonly qualityTier: QualityTier;
  readonly soundMuted: boolean;
  readonly selectedPartId: string | null;
  readonly hoveredPartId: string | null;
  readonly showInspector: boolean;
  readonly showPartTree: boolean;
  readonly showAreasPanel: boolean;
  readonly showEnginesPanel: boolean;
  readonly explodeFactor: number;
  readonly showSystemTints: boolean;
  readonly showThermalColors: boolean;
  readonly skinAltitudeM: number;
  readonly skinMach: number;
  readonly aeroAlphaDeg: number;
  readonly aeroBetaDeg: number;
  readonly aeroMach: number;
  readonly aeroPolhamus: boolean;
  readonly aeroShowCp: boolean;
  readonly aeroShowLiftRibbon: boolean;
  readonly aeroShowStreamlines: boolean;
  readonly aeroShowForces: boolean;
  readonly vlmResult: VlmSolveResult | null;
  readonly xrayMode: boolean;
  readonly clipAxis: ClipAxis;
  readonly clipPosition: number;
  readonly hiddenPartIds: readonly string[];
  readonly isolatedPartId: string | null;
  readonly cameraPreset: CameraPresetId;
  readonly cameraPresetNonce: number;
  readonly bottomSheetHeightPx: number;
  readonly rightDrawerWidthPx: number;
  readonly mobileControlsHidden: boolean;

  // Phase 3: Area inspection & control surfaces
  readonly canopyOpen: boolean;
  readonly mainBayOpen: boolean;
  readonly sideBaysOpen: boolean;
  readonly weaponsLoadout: WeaponsLoadoutId;
  readonly gearDeployed: boolean;
  readonly stickPitch: number;
  readonly stickRoll: number;
  readonly rudderYaw: number;
  readonly airbrake: number;
  readonly flaps: number;
  readonly nozzlePitch: number;

  // Phase 4: Engine start sequence & twin-F119 spool simulation
  readonly engineSim: EngineSimState;

  // Phase 5 / v1.1: Mode-based UI, guided tours, accessibility & adaptive quality
  readonly activeMode: ExplorerMode;
  readonly modePanelOpen: boolean;
  readonly showOverflowMenu: boolean;
  readonly activeTourId: TourId | null;
  readonly tourStepIndex: number;
  readonly showTourPicker: boolean;
  readonly savedTourProgress: Partial<Record<TourId, number>>;
  readonly reducedMotion: boolean;
  readonly qualityLockedByUser: boolean;

  setSceneReady: (ready: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  toggleSoundMute: () => void;
  setSoundMuted: (muted: boolean) => void;
  selectPart: (partId: string | null) => void;
  setHoveredPart: (partId: string | null) => void;
  setShowInspector: (open: boolean) => void;
  setShowPartTree: (open: boolean) => void;
  setShowAreasPanel: (open: boolean) => void;
  setShowEnginesPanel: (open: boolean) => void;
  setExplodeFactor: (value: number) => void;
  setExplodeStage: (stage: 0 | 1 | 2 | 3) => void;
  toggleExplode: () => void;
  setShowSystemTints: (enabled: boolean) => void;
  setShowThermalColors: (enabled: boolean) => void;
  setSkinAltitudeM: (altM: number) => void;
  setSkinMach: (mach: number) => void;
  setAeroAlphaDeg: (deg: number) => void;
  setAeroBetaDeg: (deg: number) => void;
  setAeroMach: (mach: number) => void;
  setAeroPolhamus: (enabled: boolean) => void;
  setAeroShowCp: (enabled: boolean) => void;
  setAeroShowLiftRibbon: (enabled: boolean) => void;
  setAeroShowStreamlines: (enabled: boolean) => void;
  setAeroShowForces: (enabled: boolean) => void;
  setVlmResult: (result: VlmSolveResult | null) => void;
  setXrayMode: (enabled: boolean) => void;
  setClipAxis: (axis: ClipAxis) => void;
  setClipPosition: (pos: number) => void;
  togglePartHidden: (partId: string) => void;
  isolatePart: (partId: string | null) => void;
  showAllParts: () => void;
  setCameraPreset: (preset: CameraPresetId) => void;
  setBottomSheetHeightPx: (px: number) => void;
  setRightDrawerWidthPx: (px: number) => void;
  setMobileControlsHidden: (hidden: boolean) => void;

  setCanopyOpen: (open: boolean) => void;
  setMainBayOpen: (open: boolean) => void;
  setSideBaysOpen: (open: boolean) => void;
  setWeaponsLoadout: (loadout: WeaponsLoadoutId) => void;
  setGearDeployed: (deployed: boolean) => void;
  setStick: (pitch: number, roll: number) => void;
  setRudderYaw: (yaw: number) => void;
  setAirbrake: (val: number) => void;
  setFlaps: (val: number) => void;
  setNozzlePitch: (val: number) => void;
  resetControlSurfaces: () => void;

  startEngines: () => void;
  abortOrShutdown: () => void;
  setThrottle: (val: number) => void;
  tickEngineSim: (dtS: number) => void;
  setEnginePreset: (preset: 'off' | 'mid-start' | 'idle' | 'mil' | 'ab') => void;

  setActiveMode: (mode: ExplorerMode, autoCamera?: boolean) => void;
  setModePanelOpen: (open: boolean) => void;
  setShowOverflowMenu: (open: boolean) => void;
  startTour: (id: TourId, stepIndex?: number) => void;
  setTourStepIndex: (index: number) => void;
  closeTour: () => void;
  setShowTourPicker: (open: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  stepDownQualityAdaptive: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const useExplorerStore = create<ExplorerState>((set) => ({
  sceneReady: false,
  qualityTier: detectDefaultQualityTier(),
  soundMuted: true,
  selectedPartId: null,
  hoveredPartId: null,
  showInspector: false,
  showPartTree: false,
  showAreasPanel: false,
  showEnginesPanel: false,
  explodeFactor: 0,
  showSystemTints: false,
  showThermalColors: true,
  skinAltitudeM: 12_000,
  skinMach: 1.5,
  aeroAlphaDeg: 8,
  aeroBetaDeg: 0,
  aeroMach: 0.4,
  aeroPolhamus: false,
  aeroShowCp: true,
  aeroShowLiftRibbon: true,
  aeroShowStreamlines: true,
  aeroShowForces: true,
  vlmResult: null,
  xrayMode: false,
  clipAxis: 'none',
  clipPosition: 0,
  hiddenPartIds: [],
  isolatedPartId: null,
  cameraPreset: 'three-quarter',
  cameraPresetNonce: 0,
  bottomSheetHeightPx: 0,
  rightDrawerWidthPx: 0,
  mobileControlsHidden: false,

  canopyOpen: false,
  mainBayOpen: false,
  sideBaysOpen: false,
  weaponsLoadout: 'air-to-air',
  gearDeployed: true,
  stickPitch: 0,
  stickRoll: 0,
  rudderYaw: 0,
  airbrake: 0,
  flaps: 0,
  nozzlePitch: 0,
  engineSim: createInitialEngineSimState(),
  activeMode: 'explore',
  modePanelOpen:
    typeof window !== 'undefined' ? window.innerWidth > 600 : true,
  showOverflowMenu: false,
  activeTourId: null,
  tourStepIndex: 0,
  showTourPicker: false,
  savedTourProgress: {},
  reducedMotion:
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  qualityLockedByUser: false,

  setSceneReady: (sceneReady) => set({ sceneReady }),
  setQualityTier: (qualityTier) => set({ qualityTier, qualityLockedByUser: true }),
  toggleSoundMute: () =>
    set((s) => {
      const next = !s.soundMuted;
      soundEngine.setMuted(next);
      return { soundMuted: next };
    }),
  setSoundMuted: (soundMuted) => {
    soundEngine.setMuted(soundMuted);
    set({ soundMuted });
  },
  selectPart: (selectedPartId) =>
    set({
      selectedPartId,
      showInspector: selectedPartId !== null,
      showOverflowMenu: false,
      mobileControlsHidden: false,
    }),
  setHoveredPart: (hoveredPartId) => set({ hoveredPartId }),
  setShowInspector: (showInspector) =>
    set((s) => ({
      showInspector,
      selectedPartId: showInspector ? s.selectedPartId : null,
      showOverflowMenu: showInspector ? false : s.showOverflowMenu,
      mobileControlsHidden: showInspector ? false : s.mobileControlsHidden,
    })),
  setShowPartTree: (showPartTree) =>
    set((s) => ({
      showPartTree,
      showAreasPanel: showPartTree ? false : s.showAreasPanel,
      showEnginesPanel: showPartTree ? false : s.showEnginesPanel,
      mobileControlsHidden: showPartTree ? false : s.mobileControlsHidden,
    })),
  setShowAreasPanel: (showAreasPanel) =>
    set((s) => ({
      showAreasPanel,
      showPartTree: showAreasPanel ? false : s.showPartTree,
      showEnginesPanel: showAreasPanel ? false : s.showEnginesPanel,
      mobileControlsHidden: showAreasPanel ? false : s.mobileControlsHidden,
    })),
  setShowEnginesPanel: (showEnginesPanel) =>
    set((s) => ({
      showEnginesPanel,
      showPartTree: showEnginesPanel ? false : s.showPartTree,
      showAreasPanel: showEnginesPanel ? false : s.showAreasPanel,
      mobileControlsHidden: showEnginesPanel ? false : s.mobileControlsHidden,
    })),
  setExplodeFactor: (value) => set({ explodeFactor: clamp(value, 0, 1) }),
  setExplodeStage: (stage) =>
    set({
      explodeFactor: stage === 0 ? 0 : stage === 1 ? 0.33 : stage === 2 ? 0.66 : 1,
    }),
  toggleExplode: () =>
    set((s) => ({ explodeFactor: s.explodeFactor > 0.5 ? 0 : 1 })),
  setShowSystemTints: (showSystemTints) => set({ showSystemTints }),
  setShowThermalColors: (showThermalColors) => set({ showThermalColors }),
  setSkinAltitudeM: (altM) => set({ skinAltitudeM: clamp(altM, 0, 20_000) }),
  setSkinMach: (mach) => set({ skinMach: clamp(mach, 0, 2.0) }),
  setAeroAlphaDeg: (deg) => set({ aeroAlphaDeg: clamp(deg, -10, 20) }),
  setAeroBetaDeg: (deg) => set({ aeroBetaDeg: clamp(deg, -15, 15) }),
  setAeroMach: (mach) => set({ aeroMach: clamp(mach, 0, 0.85) }),
  setAeroPolhamus: (aeroPolhamus) => set({ aeroPolhamus }),
  setAeroShowCp: (aeroShowCp) => set({ aeroShowCp }),
  setAeroShowLiftRibbon: (aeroShowLiftRibbon) => set({ aeroShowLiftRibbon }),
  setAeroShowStreamlines: (aeroShowStreamlines) => set({ aeroShowStreamlines }),
  setAeroShowForces: (aeroShowForces) => set({ aeroShowForces }),
  setVlmResult: (vlmResult) => set({ vlmResult }),
  setXrayMode: (xrayMode) => set({ xrayMode }),
  setClipAxis: (clipAxis) => set({ clipAxis, clipPosition: 0 }),
  setClipPosition: (clipPosition) => set({ clipPosition }),
  togglePartHidden: (partId) =>
    set((s) => {
      const exists = s.hiddenPartIds.includes(partId);
      return {
        hiddenPartIds: exists
          ? s.hiddenPartIds.filter((id) => id !== partId)
          : [...s.hiddenPartIds, partId],
        isolatedPartId: null,
      };
    }),
  isolatePart: (partId) =>
    set((s) => ({
      isolatedPartId: s.isolatedPartId === partId ? null : partId,
      hiddenPartIds: [],
    })),
  showAllParts: () => set({ hiddenPartIds: [], isolatedPartId: null }),
  setCameraPreset: (cameraPreset) =>
    set((s) => ({ cameraPreset, cameraPresetNonce: s.cameraPresetNonce + 1 })),
  setBottomSheetHeightPx: (bottomSheetHeightPx) => set({ bottomSheetHeightPx }),
  setRightDrawerWidthPx: (rightDrawerWidthPx) => set({ rightDrawerWidthPx }),
  setMobileControlsHidden: (mobileControlsHidden) =>
    set({ mobileControlsHidden }),

  setCanopyOpen: (canopyOpen) => set({ canopyOpen }),
  setMainBayOpen: (mainBayOpen) => set({ mainBayOpen }),
  setSideBaysOpen: (sideBaysOpen) => set({ sideBaysOpen }),
  setWeaponsLoadout: (weaponsLoadout) => set({ weaponsLoadout }),
  setGearDeployed: (gearDeployed) => set({ gearDeployed }),
  setStick: (pitch, roll) =>
    set({
      stickPitch: clamp(pitch, -1, 1),
      stickRoll: clamp(roll, -1, 1),
      nozzlePitch: clamp(pitch, -1, 1),
    }),
  setRudderYaw: (yaw) => set({ rudderYaw: clamp(yaw, -1, 1) }),
  setAirbrake: (val) => set({ airbrake: clamp(val, 0, 1) }),
  setFlaps: (val) => set({ flaps: clamp(val, 0, 1) }),
  setNozzlePitch: (val) => set({ nozzlePitch: clamp(val, -1, 1) }),
  resetControlSurfaces: () =>
    set({
      stickPitch: 0,
      stickRoll: 0,
      rudderYaw: 0,
      airbrake: 0,
      flaps: 0,
      nozzlePitch: 0,
    }),

  startEngines: () =>
    set((s) => ({
      explodeFactor: 0,
      gearDeployed: true,
      engineSim: startEngineSequence(s.engineSim),
    })),
  abortOrShutdown: () =>
    set((s) => ({
      engineSim: abortOrShutdownEngines(s.engineSim),
    })),
  setThrottle: (val) =>
    set((s) => ({
      engineSim: setEngineThrottle(s.engineSim, val),
    })),
  tickEngineSim: (dtS) =>
    set((s) => {
      if (s.engineSim.phase === 'OFF') return s;
      return { engineSim: stepEngineSim(s.engineSim, dtS) };
    }),
  setEnginePreset: (preset) =>
    set((s) => ({
      gearDeployed: preset === 'off' ? s.gearDeployed : true,
      engineSim: createEnginePresetState(preset),
    })),

  setActiveMode: (mode, autoCamera = true) =>
    set((s) => {
      const nextCam: CameraPresetId =
        mode === 'cockpit'
          ? 'cockpit'
          : mode === 'weapons'
            ? 'bays'
            : mode === 'engines'
              ? 'rear'
              : 'three-quarter';
      return {
        activeMode: mode,
        modePanelOpen: true,
        showOverflowMenu: false,
        showTourPicker: false,
        explodeFactor: mode === 'explore' ? s.explodeFactor : 0,
        mainBayOpen: mode === 'weapons' ? true : s.mainBayOpen,
        sideBaysOpen: mode === 'weapons' ? true : s.sideBaysOpen,
        cameraPreset: autoCamera ? nextCam : s.cameraPreset,
        cameraPresetNonce: autoCamera ? s.cameraPresetNonce + 1 : s.cameraPresetNonce,
      };
    }),
  setModePanelOpen: (modePanelOpen) =>
    set((s) => ({
      modePanelOpen,
      showOverflowMenu: modePanelOpen ? false : s.showOverflowMenu,
    })),
  setShowOverflowMenu: (showOverflowMenu) =>
    set((s) => ({
      showOverflowMenu,
      // Panel rule: opening ⋯ Menu closes overlapping overlays (no menu-over-HUD/Inspector overlap)
      showInspector: showOverflowMenu ? false : s.showInspector,
      showTourPicker: showOverflowMenu ? false : s.showTourPicker,
      activeTourId: showOverflowMenu ? null : s.activeTourId,
    })),

  startTour: (id, stepIndex = 0) =>
    set((s) => ({
      activeTourId: id,
      tourStepIndex: stepIndex,
      showTourPicker: false,
      showOverflowMenu: false,
      modePanelOpen: false,
      showPartTree: false,
      showAreasPanel: false,
      showEnginesPanel: false,
      savedTourProgress: { ...s.savedTourProgress, [id]: stepIndex },
    })),
  setTourStepIndex: (index) =>
    set((s) => ({
      tourStepIndex: Math.max(0, index),
      savedTourProgress: s.activeTourId
        ? { ...s.savedTourProgress, [s.activeTourId]: Math.max(0, index) }
        : s.savedTourProgress,
    })),
  closeTour: () => set({ activeTourId: null, showTourPicker: false }),
  setShowTourPicker: (showTourPicker) =>
    set((s) => ({
      showTourPicker,
      activeTourId: showTourPicker ? null : s.activeTourId,
    })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  stepDownQualityAdaptive: () =>
    set((s) => {
      if (s.qualityLockedByUser) return s;
      const next: QualityTier =
        s.qualityTier === 'high' ? 'med' : s.qualityTier === 'med' ? 'low' : 'low';
      return next === s.qualityTier ? s : { qualityTier: next };
    }),
}));
