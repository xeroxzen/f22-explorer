import { useExplorerStore } from '../store/explorerStore.js';
import { formatApproxThrustPair } from './formatApprox.js';
import { useViewport } from './useViewport.js';

/**
 * Outside HUD-style engine telemetry overlay showing per-engine thrust (lbf/kN
 * rounded to <= 2 significant figures), N2%, nozzle opening, and AB status.
 * Driven by the same EngineSimState as the 3D nozzles, plumes, and cockpit MFD.
 */
export function EngineHudOverlay() {
  const { isPhone } = useViewport();
  const engineSim = useExplorerStore((s) => s.engineSim);
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const showInspector = useExplorerStore((s) => s.showInspector);
  const showEnginesPanel = useExplorerStore((s) => s.showEnginesPanel);

  if (!engineSim.outdoors || cameraPreset === 'cockpit') return null;
  if (isPhone && (showInspector || showEnginesPanel)) return null;

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
            {formatApproxThrustPair(engineSim.left.thrustLbf, engineSim.left.thrustKn)}
          </div>
          <div className="engine-hud-sub">
            N2 {engineSim.left.n2Pct.toFixed(0)}% · NOZ {Math.round(engineSim.left.nozzleOpenFraction * 100)}% · AB{' '}
            {engineSim.left.afterburnerOn ? 'ON' : 'OFF'}
          </div>
        </div>

        <div className="engine-hud-col">
          <div className="engine-hud-label">ENG 2 (R) · {engineSim.right.regime}</div>
          <div className="engine-hud-val" data-testid="hud-eng2-thrust">
            {formatApproxThrustPair(engineSim.right.thrustLbf, engineSim.right.thrustKn)}
          </div>
          <div className="engine-hud-sub">
            N2 {engineSim.right.n2Pct.toFixed(0)}% · NOZ {Math.round(engineSim.right.nozzleOpenFraction * 100)}% · AB{' '}
            {engineSim.right.afterburnerOn ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      <div className="engine-hud-foot">
        35,000-lbf class (SOURCED) · Visual approximation (not CFD)
      </div>
    </aside>
  );
}
