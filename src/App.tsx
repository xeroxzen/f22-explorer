import { useEffect } from 'react';
import { HangarCanvas } from './scene/HangarCanvas.js';
import { useExplorerStore, type QualityTier } from './store/explorerStore.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { useViewport } from './ui/useViewport.js';

const QUALITY_TIERS: readonly QualityTier[] = ['low', 'med', 'high'];

export function App() {
  const { isPhone } = useViewport();
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const soundMuted = useExplorerStore((s) => s.soundMuted);
  const showInspector = useExplorerStore((s) => s.showInspector);
  const mobileControlsHidden = useExplorerStore((s) => s.mobileControlsHidden);
  const setQualityTier = useExplorerStore((s) => s.setQualityTier);
  const toggleSoundMute = useExplorerStore((s) => s.toggleSoundMute);
  const setShowInspector = useExplorerStore((s) => s.setShowInspector);
  const setMobileControlsHidden = useExplorerStore((s) => s.setMobileControlsHidden);

  useEffect(() => {
    if (!isPhone && mobileControlsHidden) {
      setMobileControlsHidden(false);
    }
  }, [isPhone, mobileControlsHidden, setMobileControlsHidden]);

  const hideChrome = isPhone && mobileControlsHidden && !showInspector;

  return (
    <div className={`app-root ${hideChrome ? 'immersive' : ''}`}>
      <HangarCanvas />

      {!hideChrome && (
        <header className="top-bar" data-testid="top-bar">
          <div className="brand">
            <span className="brand-title">F-22 RAPTOR</span>
            <span className="brand-sub">INTERACTIVE EXPLORER · PHASE 0 HANGAR</span>
          </div>

          <div className="top-controls">
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
              className={`ctrl-btn ${!soundMuted ? 'active' : ''}`}
              onClick={toggleSoundMute}
              data-testid="sound-toggle-btn"
              aria-pressed={!soundMuted}
            >
              {soundMuted ? 'Audio: Muted' : 'Audio: On'}
            </button>

            <button
              type="button"
              className={`ctrl-btn ${showInspector ? 'active' : ''}`}
              onClick={() => setShowInspector(!showInspector)}
              data-testid="inspector-toggle-btn"
              aria-pressed={showInspector}
            >
              Inspector
            </button>

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

      <InspectorPanel />

      {!hideChrome && (
        <footer className="status-pill" data-testid="status-pill">
          Public sources only · Unclassified educational model · Hangar ready
        </footer>
      )}
    </div>
  );
}
