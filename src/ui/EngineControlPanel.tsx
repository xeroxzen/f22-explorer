import { useEffect, useRef, useState } from 'react';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import { ENGINE_START_STEPS } from '../sim/engineSim.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { BottomSheet } from './BottomSheet.js';
import { formatApproxThrustPair } from './formatApprox.js';
import { useViewport } from './useViewport.js';

function EngineControlBody({ isPhone }: { readonly isPhone: boolean }) {
  const engineSim = useExplorerStore((s) => s.engineSim);
  const startEngines = useExplorerStore((s) => s.startEngines);
  const abortOrShutdown = useExplorerStore((s) => s.abortOrShutdown);
  const setThrottle = useExplorerStore((s) => s.setThrottle);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setCanopyOpen = useExplorerStore((s) => s.setCanopyOpen);
  const activeStepRef = useRef<HTMLLIElement>(null);
  const [stepsExpandedMobile, setStepsExpandedMobile] = useState(false);

  const isOff = engineSim.phase === 'OFF';
  const isRunning = engineSim.phase === 'RUNNING';
  const isShutdown = engineSim.phase === 'SHUTDOWN';
  const isStarting = !isOff && !isRunning && !isShutdown;
  const milThresh = R.ENGINE_MIL_THROTTLE_THRESHOLD.value;
  const activeStepIdx = ENGINE_START_STEPS.findIndex((st) => st.phase === engineSim.phase);

  useEffect(() => {
    if (!isPhone || !isRunning) {
      activeStepRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [engineSim.phase, isPhone, isRunning]);

  const throttleSection = (
    <section className="areas-section" data-testid="throttle-section">
      <div className="areas-heading">
        <span>Throttle &amp; Afterburner</span>
        <span className="spec-badge badge-assumed">{engineSim.left.regime}</span>
      </div>

      <label className="areas-slider">
        <span>
          Throttle ({Math.round(engineSim.throttle * 100)}%) —{' '}
          {engineSim.throttle > milThresh
            ? 'AFTERBURNER (>75%)'
            : engineSim.throttle >= milThresh - 0.01
              ? 'MILITARY DRY (75%)'
              : 'IDLE → MIL (0–75%)'}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={engineSim.throttle}
          disabled={!isRunning}
          onChange={(e) => setThrottle(Number(e.target.value))}
          data-testid="throttle-slider"
          aria-label="Engine throttle lever"
        />
      </label>

      <div className="areas-btn-row">
        <button
          type="button"
          className={`mini-btn ${isRunning && engineSim.throttle < 0.05 ? 'active' : ''}`}
          disabled={!isRunning}
          onClick={() => setThrottle(0)}
          data-testid="throttle-idle-btn"
        >
          Idle (0%)
        </button>
        <button
          type="button"
          className={`mini-btn ${isRunning && Math.abs(engineSim.throttle - milThresh) < 0.04 ? 'active' : ''}`}
          disabled={!isRunning}
          onClick={() => setThrottle(milThresh)}
          data-testid="throttle-mil-btn"
        >
          Mil Dry (75%)
        </button>
        <button
          type="button"
          className={`mini-btn ${isRunning && engineSim.throttle > 0.95 ? 'active' : ''}`}
          disabled={!isRunning}
          onClick={() => setThrottle(1)}
          data-testid="throttle-ab-btn"
        >
          Max AB (100%)
        </button>
      </div>

      <div className="areas-readouts">
        <span>L N2: {engineSim.left.n2Pct.toFixed(0)}%</span>
        <span>R N2: {engineSim.right.n2Pct.toFixed(0)}%</span>
        <span>Noz: {Math.round(engineSim.left.nozzleOpenFraction * 100)}%</span>
        <span>AB: {engineSim.left.afterburnerOn ? 'ON' : 'OFF'}</span>
      </div>
      {isRunning && (
        <div className="areas-note" style={{ marginTop: 6 }}>
          Est. per engine (APPROX):{' '}
          <strong>
            {formatApproxThrustPair(engineSim.left.thrustLbf, engineSim.left.thrustKn)}
          </strong>
        </div>
      )}
    </section>
  );

  const startControlsSection = (
    <section className="areas-section">
      <div className="areas-heading">
        <span>Twin F119-PW-100 Start</span>
        <span className={`spec-badge ${engineSim.outdoors ? 'badge-sourced' : 'badge-assumed'}`}>
          {engineSim.outdoors ? 'OUTDOOR RUN-UP PAD' : 'INDOOR HANGAR'}
        </span>
      </div>

      <div className="areas-btn-row">
        <button
          type="button"
          className={`mini-btn ${isStarting || isRunning ? 'active' : ''}`}
          disabled={!isOff && !isShutdown}
          onClick={startEngines}
          data-testid="start-engines-btn"
        >
          {isOff ? 'Start Sequence' : isRunning ? 'Running' : isShutdown ? 'Restart' : 'Starting…'}
        </button>
        <button
          type="button"
          className="mini-btn"
          disabled={isOff || isShutdown}
          onClick={abortOrShutdown}
          data-testid="shutdown-engines-btn"
        >
          {isStarting ? 'Abort Start' : 'Shutdown'}
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={() => setCameraPreset('rear')}
          data-testid="engine-rear-cam-btn"
        >
          Nozzles View
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={() => {
            setCanopyOpen(false);
            setCameraPreset('cockpit');
          }}
          data-testid="engine-cockpit-cam-btn"
        >
          Cockpit MFD
        </button>
      </div>

      <p className="areas-note">
        35,000-lbf class per engine (<strong>SOURCED</strong>). Start timings, N2% spool
        lags, and thrust curves are <strong>ASSUMED</strong> teaching approximations; exhaust
        plumes are a visual approximation (not CFD).
      </p>
    </section>
  );

  const collapseStepsOnMobile = isPhone && isRunning && !stepsExpandedMobile;

  const stepsSection = (
    <section className="areas-section">
      <div className="areas-heading">
        <span>Start Sequence Steps</span>
        <span className="spec-badge badge-assumed">TIMINGS ASSUMED</span>
      </div>

      {collapseStepsOnMobile ? (
        <button
          type="button"
          className="engine-step-summary-btn"
          onClick={() => setStepsExpandedMobile(true)}
          data-testid="engine-steps-collapsed-summary"
          aria-expanded={false}
        >
          <span>✓ Start complete ({ENGINE_START_STEPS.length}/{ENGINE_START_STEPS.length} steps)</span>
          <span className="engine-step-expand-lbl">Show steps ▾</span>
        </button>
      ) : (
        <>
          {isPhone && isRunning && (
            <button
              type="button"
              className="mini-btn"
              style={{ marginBottom: 6 }}
              onClick={() => setStepsExpandedMobile(false)}
              aria-expanded={true}
            >
              Collapse steps ▴
            </button>
          )}
          <ol className="engine-step-list" data-testid="engine-step-list">
            {ENGINE_START_STEPS.map((step) => {
              const isDone =
                isRunning || (activeStepIdx >= 0 && step.index < activeStepIdx);
              const isActive = engineSim.phase === step.phase;
              const cls = isActive
                ? 'engine-step active'
                : isDone
                  ? 'engine-step done'
                  : 'engine-step';
              return (
                <li
                  key={step.phase}
                  ref={isActive ? activeStepRef : undefined}
                  className={cls}
                  data-step-phase={step.phase}
                  data-step-active={isActive ? 'true' : 'false'}
                >
                  <div className="engine-step-top">
                    <span className="engine-step-dot">
                      {isDone && !isActive ? '✓' : isActive ? '▶' : '○'}
                    </span>
                    <span className="engine-step-title">{step.title}</span>
                    {step.durationS > 0 && (
                      <span className="engine-step-time">{step.durationS.toFixed(1)}s</span>
                    )}
                  </div>
                  {isActive && <div className="engine-step-detail">{step.detail}</div>}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );

  // Mobile RUNNING layout: pin Throttle controls at the top, collapse step list to a 1-line summary
  if (isPhone && isRunning) {
    return (
      <div className="areas-body">
        {throttleSection}
        {stepsSection}
        {startControlsSection}
      </div>
    );
  }

  return (
    <div className="areas-body">
      {startControlsSection}
      {throttleSection}
      {stepsSection}
    </div>
  );
}

export function EngineControlPanel() {
  const { isPhone } = useViewport();
  const showEnginesPanel = useExplorerStore((s) => s.showEnginesPanel);
  const setShowEnginesPanel = useExplorerStore((s) => s.setShowEnginesPanel);

  if (!showEnginesPanel) return null;

  if (isPhone) {
    return (
      <BottomSheet
        title="Engine Start & Power"
        kicker="F119-PW-100 · TEACHING MODEL"
        onClose={() => setShowEnginesPanel(false)}
        testId="engines-panel"
      >
        <EngineControlBody isPhone={true} />
      </BottomSheet>
    );
  }

  return (
    <aside className="part-tree-panel" data-testid="engines-panel">
      <div className="inspector-header">
        <div>
          <span className="inspector-kicker">F119-PW-100 · TEACHING MODEL</span>
          <h2 className="inspector-title">Engine Start &amp; Power</h2>
        </div>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={() => setShowEnginesPanel(false)}
          aria-label="Close engines panel"
          data-testid="engines-close-btn"
        >
          ✕
        </button>
      </div>
      <div className="inspector-scroll">
        <EngineControlBody isPhone={false} />
      </div>
    </aside>
  );
}
