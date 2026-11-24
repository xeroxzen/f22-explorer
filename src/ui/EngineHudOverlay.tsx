import { useExplorerStore } from '../store/explorerStore.js';
import { useViewport } from './useViewport.js';

/**
 * Outside HUD-style engine telemetry overlay showing per-engine thrust (lbf/kN),
 * N2%, nozzle opening, and AB status. Driven by the same EngineSimState as the
 * 3D nozzles, exhaust plumes, and cockpit Right Secondary MFD.
 */
export function EngineHudOverlay() {
  const { isPhone } = useViewport();
  const engineSim = useExplorerStore((s) => s.engineSim);
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const showInspector = useExplorerStore((s) => s.showInspector);
  const showEnginesPanel = useExplorerStore((s) => s.showEnginesPanel);

  if (!engineSim.outdoors || cameraPreset === 'cockpit') return null;
  if (isPhone && (showInspector || showEnginesPanel)) return null;

  const fmtLbf = (v: number) => `${Math.round(v).toLocaleString('en-US')} lbf`;
  const fmtKn = (v: number) => `${v.toFixed(1)} kN`;

  return (
    <aside
      className={`engine-hud ${isPhone ? 'compact' : ''}`}
      data-testid="engine-hud-overlay"
      aria-label="Live engine telemetry"
    >
      <div className="engine-hud-head">
        <span className="engine-hud-title">OUTDOOR RUN-UP PAD · F119</span>
        <span className="spec-badge badge-approximate">APPROXIMATE</span>
      </div>

      <div className="engine-hud-grid">
        <div className="engine-hud-col">
          <div className="engine-hud-label">ENG 1 (L) · {engineSim.left.regime}</div>
          <div className="engine-hud-val" data-testid="hud-eng1-thrust">
            {fmtLbf(engineSim.left.thrustLbf)} · {fmtKn(engineSim.left.thrustKn)}
          </div>
          <div className="engine-hud-sub">
            N2 {engineSim.left.n2Pct.toFixed(0)}% · NOZ {Math.round(engineSim.left.nozzleOpenFraction * 100)}% · AB{' '}
            {engineSim.left.afterburnerOn ? 'ON' : 'OFF'}
          </div>
        </div>

        <div className="engine-hud-col">
          <div className="engine-hud-label">ENG 2 (R) · {engineSim.right.regime}</div>
          <div className="engine-hud-val" data-testid="hud-eng2-thrust">
            {fmtLbf(engineSim.right.thrustLbf)} · {fmtKn(engineSim.right.thrustKn)}
          </div>
          <div className="engine-hud-sub">
            N2 {engineSim.right.n2Pct.toFixed(0)}% · NOZ {Math.round(engineSim.right.nozzleOpenFraction * 100)}% · AB{' '}
            {engineSim.right.afterburnerOn ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      <div className="engine-hud-foot">
        35,000-lbf class (SOURCED) · Plume visual approx (not CFD)
      </div>
    </aside>
  );
}
