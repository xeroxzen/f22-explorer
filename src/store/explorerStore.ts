import { create } from 'zustand';
import { soundEngine } from '../audio/soundEngine.js';

export type QualityTier = 'low' | 'med' | 'high';
export type ClipAxis = 'none' | 'x' | 'y' | 'z';
export type CameraPresetId = 'three-quarter' | 'front' | 'top' | 'side' | 'rear' | 'cockpit';

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
  readonly explodeFactor: number;
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

  setSceneReady: (ready: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  toggleSoundMute: () => void;
  setSoundMuted: (muted: boolean) => void;
  selectPart: (partId: string | null) => void;
  setHoveredPart: (partId: string | null) => void;
  setShowInspector: (open: boolean) => void;
  setShowPartTree: (open: boolean) => void;
  setExplodeFactor: (value: number) => void;
  toggleExplode: () => void;
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
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  sceneReady: false,
  qualityTier: detectDefaultQualityTier(),
  soundMuted: true,
  selectedPartId: null,
  hoveredPartId: null,
  showInspector: false,
  showPartTree: false,
  explodeFactor: 0,
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

  setSceneReady: (sceneReady) => set({ sceneReady }),
  setQualityTier: (qualityTier) => set({ qualityTier }),
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
      mobileControlsHidden: false,
    }),
  setHoveredPart: (hoveredPartId) => set({ hoveredPartId }),
  setShowInspector: (showInspector) =>
    set((s) => ({
      showInspector,
      selectedPartId: showInspector ? s.selectedPartId : null,
      mobileControlsHidden: showInspector ? false : s.mobileControlsHidden,
    })),
  setShowPartTree: (showPartTree) =>
    set((s) => ({
      showPartTree,
      mobileControlsHidden: showPartTree ? false : s.mobileControlsHidden,
    })),
  setExplodeFactor: (value) =>
    set({ explodeFactor: Math.max(0, Math.min(1, value)) }),
  toggleExplode: () =>
    set((s) => ({ explodeFactor: s.explodeFactor > 0.5 ? 0 : 1 })),
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
}));
