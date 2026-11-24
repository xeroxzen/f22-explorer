import { create } from 'zustand';
import { soundEngine } from '../audio/soundEngine.js';

export type QualityTier = 'low' | 'med' | 'high';

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
  readonly showInspector: boolean;
  readonly bottomSheetHeightPx: number;
  readonly rightDrawerWidthPx: number;
  readonly mobileControlsHidden: boolean;

  setSceneReady: (ready: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  toggleSoundMute: () => void;
  setSoundMuted: (muted: boolean) => void;
  selectPart: (partId: string | null) => void;
  setShowInspector: (open: boolean) => void;
  setBottomSheetHeightPx: (px: number) => void;
  setRightDrawerWidthPx: (px: number) => void;
  setMobileControlsHidden: (hidden: boolean) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  sceneReady: false,
  qualityTier: detectDefaultQualityTier(),
  soundMuted: true,
  selectedPartId: null,
  showInspector: false,
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
  setShowInspector: (showInspector) =>
    set((s) => ({
      showInspector,
      selectedPartId: showInspector ? s.selectedPartId : null,
      mobileControlsHidden: showInspector ? false : s.mobileControlsHidden,
    })),
  setBottomSheetHeightPx: (bottomSheetHeightPx) => set({ bottomSheetHeightPx }),
  setRightDrawerWidthPx: (rightDrawerWidthPx) => set({ rightDrawerWidthPx }),
  setMobileControlsHidden: (mobileControlsHidden) =>
    set({ mobileControlsHidden }),
}));
