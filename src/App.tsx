import { useEffect } from 'react';
import { HangarCanvas } from './scene/HangarCanvas.js';
import { SYSTEM_GROUP_COLORS, type SystemGroup } from './scene/f22Geometry.js';
import { applyDeepLinkFromUrl } from './store/deepLink.js';
import {
  useExplorerStore,
  type ExplorerMode,
} from './store/explorerStore.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { ModePanel } from './ui/ModePanel.js';
import { OverflowMenu } from './ui/OverflowMenu.js';
import { TourOverlay } from './ui/TourOverlay.js';
import { useViewport } from './ui/useViewport.js';

const MODES: readonly { id: ExplorerMode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'engines', label: 'Engines' },
];

const SYSTEM_GROUPS = Object.keys(SYSTEM_GROUP_COLORS) as SystemGroup[];

export function App() {
  const { isPhone } = useViewport();
  const activeMode = useExplorerStore((s) => s.activeMode);
  const modePanelOpen = useExplorerStore((s) => s.modePanelOpen);
  const showOverflowMenu = useExplorerStore((s) => s.showOverflowMenu);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);

  const setActiveMode = useExplorerStore((s) => s.setActiveMode);
  const setModePanelOpen = useExplorerStore((s) => s.setModePanelOpen);
  const setShowOverflowMenu = useExplorerStore((s) => s.setShowOverflowMenu);

  // Restore shareable deep-link query params on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      applyDeepLinkFromUrl(window.location.search);
    }
  }, []);

  // Global keyboard accessibility: Escape closes active overlays
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const s = useExplorerStore.getState();
      if (s.showOverflowMenu) s.setShowOverflowMenu(false);
      else if (s.showTourPicker) s.setShowTourPicker(false);
      else if (s.showInspector) s.setShowInspector(false);
      else if (s.modePanelOpen) s.setModePanelOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="app-root">
      <HangarCanvas />

      {/* Unified Top Bar: Desktop = Brand + 4-Mode Switcher + ⋯ Menu; Mobile = Compact 48px Header */}
      <header className={`top-bar ${isPhone ? 'mobile-header' : ''}`} data-testid="top-bar">
        <div className="brand">
          <span className="brand-title">F-22 RAPTOR</span>
        </div>

        {!isPhone && (
          <nav className="mode-switcher" aria-label="Explorer modes" data-testid="mode-switcher">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mode-btn ${activeMode === m.id && modePanelOpen ? 'active' : ''}`}
                onClick={() => {
                  if (activeMode === m.id && modePanelOpen) {
                    setModePanelOpen(false);
                  } else {
                    setActiveMode(m.id);
                  }
                }}
                data-testid={`mode-${m.id}`}
                aria-pressed={activeMode === m.id && modePanelOpen}
              >
                {m.label}
              </button>
            ))}
          </nav>
        )}

        <button
          type="button"
          className={`ctrl-btn ${showOverflowMenu ? 'active' : ''}`}
          onClick={() => setShowOverflowMenu(!showOverflowMenu)}
          data-testid="overflow-menu-btn"
          aria-expanded={showOverflowMenu}
          aria-label="Open settings, tours, share, and credits menu"
        >
          ⋯ Menu
        </button>
      </header>

      <OverflowMenu />
      <ModePanel />
      <InspectorPanel />
      <TourOverlay />

      {!isPhone && explodeFactor > 0.1 && (
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

      {/* Mobile Fixed 4-Tab Bottom Mode Bar (no legacy top controls or floating explode bar) */}
      {isPhone && (
        <nav
          className="mobile-mode-bar"
          aria-label="Mobile explorer modes"
          data-testid="mobile-mode-bar"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`mobile-tab ${activeMode === m.id && modePanelOpen ? 'active' : ''}`}
              onClick={() => {
                if (activeMode === m.id && modePanelOpen) {
                  setModePanelOpen(false);
                } else {
                  setActiveMode(m.id);
                }
              }}
              data-testid={`mobile-mode-${m.id}`}
              aria-pressed={activeMode === m.id && modePanelOpen}
            >
              {m.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
