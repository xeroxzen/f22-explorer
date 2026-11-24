import { useEffect, useState } from 'react';
import { HangarCanvas } from './scene/HangarCanvas.js';
import { SYSTEM_GROUP_COLORS, type SystemGroup } from './scene/f22Geometry.js';
import { applyDeepLinkFromUrl, buildCurrentShareUrl } from './store/deepLink.js';
import {
  useExplorerStore,
  type CameraPresetId,
  type ClipAxis,
  type QualityTier,
} from './store/explorerStore.js';
import { AreasControlPanel } from './ui/AreasControlPanel.js';
import { EngineControlPanel } from './ui/EngineControlPanel.js';
import { EngineHudOverlay } from './ui/EngineHudOverlay.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { PartTreePanel } from './ui/PartTreePanel.js';
import { TourOverlay } from './ui/TourOverlay.js';
import { useViewport } from './ui/useViewport.js';

const QUALITY_TIERS: readonly QualityTier[] = ['low', 'med', 'high'];
const CLIP_AXES: readonly ClipAxis[] = ['none', 'x', 'y', 'z'];
const CAMERA_PRESETS: readonly { id: CameraPresetId; label: string }[] = [
  { id: 'three-quarter', label: '3/4' },
  { id: 'front', label: 'Front' },
  { id: 'top', label: 'Top' },
  { id: 'side', label: 'Side' },
  { id: 'rear', label: 'Rear' },
  { id: 'cockpit', label: 'Cockpit' },
];
const SYSTEM_GROUPS = Object.keys(SYSTEM_GROUP_COLORS) as SystemGroup[];

export function App() {
  const { isPhone } = useViewport();
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const soundMuted = useExplorerStore((s) => s.soundMuted);
  const showInspector = useExplorerStore((s) => s.showInspector);
  const showPartTree = useExplorerStore((s) => s.showPartTree);
  const showAreasPanel = useExplorerStore((s) => s.showAreasPanel);
  const showEnginesPanel = useExplorerStore((s) => s.showEnginesPanel);
  const showTourPicker = useExplorerStore((s) => s.showTourPicker);
  const activeTourId = useExplorerStore((s) => s.activeTourId);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const xrayMode = useExplorerStore((s) => s.xrayMode);
  const clipAxis = useExplorerStore((s) => s.clipAxis);
  const clipPosition = useExplorerStore((s) => s.clipPosition);
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const mobileControlsHidden = useExplorerStore((s) => s.mobileControlsHidden);

  const setQualityTier = useExplorerStore((s) => s.setQualityTier);
  const toggleSoundMute = useExplorerStore((s) => s.toggleSoundMute);
  const setShowInspector = useExplorerStore((s) => s.setShowInspector);
  const setShowPartTree = useExplorerStore((s) => s.setShowPartTree);
  const setShowAreasPanel = useExplorerStore((s) => s.setShowAreasPanel);
  const setShowEnginesPanel = useExplorerStore((s) => s.setShowEnginesPanel);
  const setShowTourPicker = useExplorerStore((s) => s.setShowTourPicker);
  const setExplodeFactor = useExplorerStore((s) => s.setExplodeFactor);
  const toggleExplode = useExplorerStore((s) => s.toggleExplode);
  const setXrayMode = useExplorerStore((s) => s.setXrayMode);
  const setClipAxis = useExplorerStore((s) => s.setClipAxis);
  const setClipPosition = useExplorerStore((s) => s.setClipPosition);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setMobileControlsHidden = useExplorerStore((s) => s.setMobileControlsHidden);
  const [shareCopied, setShareCopied] = useState(false);

  // Restore shareable deep-link query params on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      applyDeepLinkFromUrl(window.location.search);
    }
  }, []);

  // Global keyboard accessibility: Escape closes active panels/dialogs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = useExplorerStore.getState();
      if (s.showTourPicker) s.setShowTourPicker(false);
      else if (s.showInspector) s.setShowInspector(false);
      else if (s.showEnginesPanel) s.setShowEnginesPanel(false);
      else if (s.showAreasPanel) s.setShowAreasPanel(false);
      else if (s.showPartTree) s.setShowPartTree(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isPhone && mobileControlsHidden) {
      setMobileControlsHidden(false);
    }
  }, [isPhone, mobileControlsHidden, setMobileControlsHidden]);

  const hideChrome =
    isPhone &&
    mobileControlsHidden &&
    !showInspector &&
    !showPartTree &&
    !showAreasPanel &&
    !showEnginesPanel;

  return (
    <div className={`app-root ${hideChrome ? 'immersive' : ''}`}>
      <HangarCanvas />

      {!hideChrome && (
        <header className="top-bar" data-testid="top-bar">
          <div className="brand">
            <span className="brand-title">F-22 RAPTOR</span>
            <span className="brand-sub">INTERACTIVE 3D EXPLORER · PUBLIC SOURCES ONLY</span>
          </div>

          <div className="top-controls">
            {!isPhone && (
              <div className="segmented" role="group" aria-label="Camera views">
                {CAMERA_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`seg-btn ${cameraPreset === p.id ? 'active' : ''}`}
                    onClick={() => setCameraPreset(p.id)}
                    data-testid={`cam-${p.id}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            <div className="segmented" role="group" aria-label="Graphics quality">
              {QUALITY_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  className={`seg-btn ${qualityTier === tier ? 'active' : ''}`}
                  onClick={() => setQualityTier(tier)}
                  data-testid={`quality-${tier}`}
                >
                  {tier.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`ctrl-btn ${showTourPicker || activeTourId !== null ? 'active' : ''}`}
              onClick={() => setShowTourPicker(!showTourPicker)}
              data-testid="tours-toggle-btn"
              aria-pressed={showTourPicker || activeTourId !== null}
            >
              Tours
            </button>

            <button
              type="button"
              className={`ctrl-btn ${showEnginesPanel ? 'active' : ''}`}
              onClick={() => {
                const next = !showEnginesPanel;
                setShowEnginesPanel(next);
                if (isPhone && next) setShowInspector(false);
              }}
              data-testid="engines-toggle-btn"
              aria-pressed={showEnginesPanel}
            >
              Engines
            </button>

            <button
              type="button"
              className={`ctrl-btn ${showAreasPanel ? 'active' : ''}`}
              onClick={() => {
                const next = !showAreasPanel;
                setShowAreasPanel(next);
                if (isPhone && next) setShowInspector(false);
              }}
              data-testid="areas-toggle-btn"
              aria-pressed={showAreasPanel}
            >
              Areas &amp; Stick
            </button>

            <button
              type="button"
              className={`ctrl-btn ${showPartTree ? 'active' : ''}`}
              onClick={() => {
                const next = !showPartTree;
                setShowPartTree(next);
                if (isPhone && next) setShowInspector(false);
              }}
              data-testid="part-tree-toggle-btn"
              aria-pressed={showPartTree}
            >
              Parts
            </button>

            <button
              type="button"
              className={`ctrl-btn ${showInspector ? 'active' : ''}`}
              onClick={() => {
                const next = !showInspector;
                setShowInspector(next);
                if (isPhone && next) setShowPartTree(false);
              }}
              data-testid="inspector-toggle-btn"
              aria-pressed={showInspector}
            >
              Inspector
            </button>

            <button
              type="button"
              className={`ctrl-btn ${!soundMuted ? 'active' : ''}`}
              onClick={toggleSoundMute}
              data-testid="sound-toggle-btn"
              aria-pressed={!soundMuted}
            >
              {soundMuted ? 'Audio: Muted' : 'Audio: On'}
            </button>

            {!isPhone && (
              <button
                type="button"
                className={`ctrl-btn ${shareCopied ? 'active' : ''}`}
                onClick={() => {
                  const url = buildCurrentShareUrl();
                  if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', url);
                    if (navigator.clipboard?.writeText) {
                      void navigator.clipboard.writeText(url);
                    }
                  }
                  setShareCopied(true);
                  window.setTimeout(() => setShareCopied(false), 1800);
                }}
                data-testid="share-link-btn"
                aria-label="Copy shareable deep link to current view"
              >
                {shareCopied ? 'Link Copied' : 'Share'}
              </button>
            )}

            {isPhone && (
              <button
                type="button"
                className="ctrl-btn"
                onClick={() => setMobileControlsHidden(true)}
                data-testid="immersive-toggle-btn"
              >
                Hide UI
              </button>
            )}
          </div>
        </header>
      )}

      {hideChrome && (
        <button
          type="button"
          className="immersive-restore-btn"
          onClick={() => setMobileControlsHidden(false)}
          data-testid="immersive-restore-btn"
        >
          Show UI
        </button>
      )}

      <EngineControlPanel />
      <EngineHudOverlay />
      <TourOverlay />
      <AreasControlPanel />
      <PartTreePanel />
      <InspectorPanel />

      {!hideChrome && !isPhone && explodeFactor > 0.1 && (
        <div className="system-legend" data-testid="system-legend">
          {SYSTEM_GROUPS.map((g) => (
            <span key={g} className="legend-item">
              <span
                className="legend-swatch"
                style={{ background: SYSTEM_GROUP_COLORS[g].tint }}
              />
              {SYSTEM_GROUP_COLORS[g].label}
            </span>
          ))}
        </div>
      )}

      {!hideChrome &&
        !(isPhone && (showInspector || showPartTree || showAreasPanel || showEnginesPanel)) && (
        <section className="bottom-dock" data-testid="disassembly-dock">
          <button
            type="button"
            className={`ctrl-btn ${explodeFactor > 0.5 ? 'active' : ''}`}
            onClick={toggleExplode}
            data-testid="explode-toggle-btn"
          >
            {explodeFactor > 0.5 ? 'Assemble' : 'Explode'}
          </button>

          <label className="dock-slider">
            <span>Explode {Math.round(explodeFactor * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explodeFactor}
              onChange={(e) => setExplodeFactor(Number(e.target.value))}
              data-testid="explode-slider"
            />
          </label>

          <button
            type="button"
            className={`ctrl-btn ${xrayMode ? 'active' : ''}`}
            onClick={() => setXrayMode(!xrayMode)}
            data-testid="xray-toggle-btn"
            aria-pressed={xrayMode}
          >
            X-Ray
          </button>

          {!isPhone && (
            <div className="dock-clip">
              <span className="dock-label">Section:</span>
              <div className="segmented" role="group" aria-label="Section cut plane">
                {CLIP_AXES.map((axis) => (
                  <button
                    key={axis}
                    type="button"
                    className={`seg-btn ${clipAxis === axis ? 'active' : ''}`}
                    onClick={() => setClipAxis(axis)}
                    data-testid={`clip-${axis}`}
                  >
                    {axis === 'none' ? 'Off' : axis.toUpperCase()}
                  </button>
                ))}
              </div>
              {clipAxis !== 'none' && (
                <input
                  type="range"
                  min={-9}
                  max={9}
                  step={0.1}
                  value={clipPosition}
                  onChange={(e) => setClipPosition(Number(e.target.value))}
                  aria-label="Section cut offset"
                  data-testid="clip-slider"
                />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
