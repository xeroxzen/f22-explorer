import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_COMPONENTS } from '../content/registry.js';
import type { ComponentContent, SpecStatus } from '../content/schema.js';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import { ENGINE_START_STEPS } from '../sim/engineSim.js';
import {
  useExplorerStore,
  type CameraPresetId,
  type ClipAxis,
  type WeaponsLoadoutId,
} from '../store/explorerStore.js';
import { BottomSheet } from './BottomSheet.js';
import { formatApproxThrustPair } from './formatApprox.js';
import { useViewport } from './useViewport.js';

const EXPLORE_CAMS: readonly { id: CameraPresetId; label: string }[] = [
  { id: 'three-quarter', label: '3/4' },
  { id: 'front', label: 'Front' },
  { id: 'top', label: 'Top' },
  { id: 'side', label: 'Side' },
  { id: 'rear', label: 'Rear' },
];

const CLIP_AXES: readonly ClipAxis[] = ['none', 'x', 'y', 'z'];

const LOADOUTS: readonly { id: WeaponsLoadoutId; label: string }[] = [
  { id: 'air-to-air', label: '6× AIM-120' },
  { id: 'jdam', label: '2× JDAM + 2× AIM-120' },
  { id: 'sdb', label: '8× SDB (2× BRU-61/A) + 2× AIM-120' },
];

function shortBadgeText(status: SpecStatus): string {
  switch (status) {
    case 'SOURCED':
      return 'SOURCED';
    case 'APPROXIMATE':
      return 'APPROX';
    case 'ASSUMED':
      return 'ASSUMED';
    case 'NOT_PUBLICLY_DISCLOSED':
      return 'N/D';
  }
}

function badgeClass(status: SpecStatus): string {
  switch (status) {
    case 'SOURCED':
      return 'badge-sourced';
    case 'APPROXIMATE':
      return 'badge-approximate';
    case 'ASSUMED':
      return 'badge-assumed';
    case 'NOT_PUBLICLY_DISCLOSED':
      return 'badge-classified';
  }
}

function ControlStickPad() {
  const padRef = useRef<HTMLDivElement>(null);
  const stickPitch = useExplorerStore((s) => s.stickPitch);
  const stickRoll = useExplorerStore((s) => s.stickRoll);
  const setStick = useExplorerStore((s) => s.setStick);

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setStick(ny, nx);
  };

  return (
    <div
      ref={padRef}
      className="stick-pad"
      data-testid="control-stick-pad"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        updateFromPointer(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) updateFromPointer(e);
      }}
      role="application"
      aria-label="Flight control stick (pitch and roll)"
    >
      <div className="stick-cross-h" />
      <div className="stick-cross-v" />
      <span className="stick-axis-lbl top">NOSE UP</span>
      <span className="stick-axis-lbl bottom">NOSE DN</span>
      <span className="stick-axis-lbl left">ROLL L</span>
      <span className="stick-axis-lbl right">ROLL R</span>
      <div
        className="stick-knob"
        style={{ left: `${50 + stickRoll * 42}%`, top: `${50 - stickPitch * 42}%` }}
      />
    </div>
  );
}

function ExploreModeBody() {
  const cameraPreset = useExplorerStore((s) => s.cameraPreset);
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const xrayMode = useExplorerStore((s) => s.xrayMode);
  const clipAxis = useExplorerStore((s) => s.clipAxis);
  const clipPosition = useExplorerStore((s) => s.clipPosition);
  const gearDeployed = useExplorerStore((s) => s.gearDeployed);
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const hiddenPartIds = useExplorerStore((s) => s.hiddenPartIds);
  const isolatedPartId = useExplorerStore((s) => s.isolatedPartId);

  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setExplodeFactor = useExplorerStore((s) => s.setExplodeFactor);
  const toggleExplode = useExplorerStore((s) => s.toggleExplode);
  const setXrayMode = useExplorerStore((s) => s.setXrayMode);
  const setClipAxis = useExplorerStore((s) => s.setClipAxis);
  const setClipPosition = useExplorerStore((s) => s.setClipPosition);
  const setGearDeployed = useExplorerStore((s) => s.setGearDeployed);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const showAllParts = useExplorerStore((s) => s.showAllParts);

  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, ComponentContent[]>();
    for (const part of ALL_COMPONENTS) {
      if (q && !part.title.toLowerCase().includes(q) && !part.id.toLowerCase().includes(q)) {
        continue;
      }
      const list = map.get(part.category) ?? [];
      list.push(part);
      map.set(part.category, list);
    }
    return Array.from(map.entries());
  }, [query]);

  return (
    <div className="areas-body">
      {/* Camera Views */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Camera Views</span>
        </div>
        <div className="areas-btn-row">
          {EXPLORE_CAMS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`mini-btn ${cameraPreset === c.id ? 'active' : ''}`}
              onClick={() => setCameraPreset(c.id)}
              data-testid={`cam-${c.id}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Disassembly & Cutaway Controls */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Disassembly &amp; View</span>
          <span className="spec-badge badge-approximate">
            {Math.round(explodeFactor * 100)}%
          </span>
        </div>

        <label className="areas-slider">
          <span>Explode ({Math.round(explodeFactor * 100)}%)</span>
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

        <div className="areas-btn-row" style={{ marginTop: 6 }}>
          <button
            type="button"
            className={`mini-btn ${explodeFactor > 0.5 ? 'active' : ''}`}
            onClick={toggleExplode}
            data-testid="explode-toggle-btn"
          >
            {explodeFactor > 0.5 ? 'Assemble' : 'Explode 100%'}
          </button>
          <button
            type="button"
            className={`mini-btn ${xrayMode ? 'active' : ''}`}
            onClick={() => setXrayMode(!xrayMode)}
            data-testid="xray-toggle-btn"
            aria-pressed={xrayMode}
          >
            X-Ray
          </button>
          <button
            type="button"
            className={`mini-btn ${gearDeployed ? 'active' : ''}`}
            onClick={() => setGearDeployed(!gearDeployed)}
            data-testid="gear-toggle-btn"
          >
            {gearDeployed ? 'Gear Down' : 'Gear Up'}
          </button>
        </div>

        <div className="areas-btn-row" style={{ marginTop: 8 }}>
          <span className="dock-label">Section:</span>
          {CLIP_AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              className={`mini-btn ${clipAxis === axis ? 'active' : ''}`}
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
            style={{ width: '100%', marginTop: 6 }}
            data-testid="clip-slider"
          />
        )}
      </section>

      {/* Parts List (using ONLY existing provenance labels — no new badge vocabulary) */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Parts ({ALL_COMPONENTS.length})</span>
          {(hiddenPartIds.length > 0 || isolatedPartId !== null) && (
            <button type="button" className="mini-btn" onClick={showAllParts}>
              Show All
            </button>
          )}
        </div>

        <input
          type="search"
          className="tree-search"
          placeholder="Filter parts (e.g. F119, APG-77, fuel)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter parts"
          data-testid="part-tree-search"
        />

        <div className="part-tree-groups" data-testid="part-tree-list">
          {grouped.map(([category, items]) => (
            <div key={category} className="tree-group">
              <div className="tree-group-title">{category}</div>
              {items.map((part) => {
                const isSelected = selectedPartId === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    className={`tree-row-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectPart(part.id)}
                    data-testid={`tree-part-${part.id}`}
                  >
                    <span className="tree-row-name">{part.title}</span>
                    <span className={`spec-badge ${badgeClass(part.geometryLabel)}`}>
                      {shortBadgeText(part.geometryLabel)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CockpitModeBody() {
  const canopyOpen = useExplorerStore((s) => s.canopyOpen);
  const stickPitch = useExplorerStore((s) => s.stickPitch);
  const stickRoll = useExplorerStore((s) => s.stickRoll);
  const rudderYaw = useExplorerStore((s) => s.rudderYaw);
  const airbrake = useExplorerStore((s) => s.airbrake);
  const flaps = useExplorerStore((s) => s.flaps);
  const nozzlePitch = useExplorerStore((s) => s.nozzlePitch);

  const setCanopyOpen = useExplorerStore((s) => s.setCanopyOpen);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setRudderYaw = useExplorerStore((s) => s.setRudderYaw);
  const setAirbrake = useExplorerStore((s) => s.setAirbrake);
  const setFlaps = useExplorerStore((s) => s.setFlaps);
  const setNozzlePitch = useExplorerStore((s) => s.setNozzlePitch);
  const resetControlSurfaces = useExplorerStore((s) => s.resetControlSurfaces);
  const selectPart = useExplorerStore((s) => s.selectPart);

  return (
    <div className="areas-body">
      <section className="areas-section">
        <div className="areas-heading">
          <span>Cockpit &amp; Canopy</span>
          <span className="spec-badge badge-sourced">CODE ONE 6-LCD</span>
        </div>
        <div className="areas-btn-row">
          <button
            type="button"
            className={`mini-btn ${canopyOpen ? 'active' : ''}`}
            onClick={() => {
              const next = !canopyOpen;
              setCanopyOpen(next);
              if (next) setCameraPreset('three-quarter');
            }}
            data-testid="canopy-toggle-btn"
          >
            {canopyOpen ? 'Close Canopy' : 'Open Canopy'}
          </button>
          <button
            type="button"
            className="mini-btn active"
            onClick={() => setCameraPreset('cockpit')}
            data-testid="cockpit-cam-btn"
          >
            Seat View
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => selectPart('cockpit-displays-hud')}
          >
            Inspect Displays
          </button>
        </div>
        <p className="areas-note">
          Generic educational schematics only; operational symbology is not publicly disclosed.
        </p>
      </section>

      <section className="areas-section">
        <div className="areas-heading">
          <span>Flight Controls</span>
          <span className="spec-badge badge-assumed">LIMITS ASSUMED</span>
        </div>
        <ControlStickPad />
        <div className="areas-readouts">
          <span>Stab: {(stickPitch * R.F22_STABILATOR_MAX_DEG.value).toFixed(0)}°</span>
          <span>Ail: {(stickRoll * R.F22_AILERON_MAX_DEG.value).toFixed(0)}°</span>
          <span>
            Noz: {(nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value).toFixed(0)}° (SOURCED)
          </span>
        </div>
        <label className="areas-slider">
          <span>Rudder Yaw ({(rudderYaw * R.F22_RUDDER_MAX_DEG.value).toFixed(0)}°)</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={rudderYaw}
            onChange={(e) => setRudderYaw(Number(e.target.value))}
            data-testid="rudder-slider"
          />
        </label>
        <label className="areas-slider">
          <span>Split-Rudder Airbrake ({Math.round(airbrake * 100)}%)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={airbrake}
            onChange={(e) => setAirbrake(Number(e.target.value))}
            data-testid="airbrake-slider"
          />
        </label>
        <label className="areas-slider">
          <span>LEF / Flaperons ({Math.round(flaps * 100)}%)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={flaps}
            onChange={(e) => setFlaps(Number(e.target.value))}
            data-testid="flaps-slider"
          />
        </label>
        <label className="areas-slider">
          <span>2D Nozzle Pitch ({(nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value).toFixed(0)}°)</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={nozzlePitch}
            onChange={(e) => setNozzlePitch(Number(e.target.value))}
            data-testid="nozzle-slider"
          />
        </label>
        <button
          type="button"
          className="mini-btn"
          onClick={resetControlSurfaces}
          data-testid="reset-surfaces-btn"
        >
          Center Controls
        </button>
      </section>
    </div>
  );
}

function WeaponsModeBody() {
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const weaponsLoadout = useExplorerStore((s) => s.weaponsLoadout);
  const setMainBayOpen = useExplorerStore((s) => s.setMainBayOpen);
  const setSideBaysOpen = useExplorerStore((s) => s.setSideBaysOpen);
  const setWeaponsLoadout = useExplorerStore((s) => s.setWeaponsLoadout);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const selectPart = useExplorerStore((s) => s.selectPart);

  return (
    <div className="areas-body">
      <section className="areas-section">
        <div className="areas-heading">
          <span>Internal Weapons Bays</span>
          <span className="spec-badge badge-sourced">SOURCED</span>
        </div>
        <div className="areas-btn-row">
          <button
            type="button"
            className={`mini-btn ${mainBayOpen ? 'active' : ''}`}
            onClick={() => setMainBayOpen(!mainBayOpen)}
            data-testid="main-bay-toggle-btn"
          >
            {mainBayOpen ? 'Close Main Bay' : 'Open Main Bay'}
          </button>
          <button
            type="button"
            className={`mini-btn ${sideBaysOpen ? 'active' : ''}`}
            onClick={() => setSideBaysOpen(!sideBaysOpen)}
            data-testid="side-bays-toggle-btn"
          >
            {sideBaysOpen ? 'Close Side Bays' : 'Open Side Bays'}
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              setMainBayOpen(true);
              setSideBaysOpen(true);
              setCameraPreset('bays');
            }}
            data-testid="bays-cam-btn"
          >
            Inspect Bays
          </button>
        </div>
      </section>

      <section className="areas-section">
        <div className="areas-heading">
          <span>Public USAF / NAVAIR Loadouts</span>
        </div>
        <div className="areas-loadouts">
          {LOADOUTS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`mini-btn ${weaponsLoadout === l.id ? 'active' : ''}`}
              onClick={() => setWeaponsLoadout(l.id)}
              data-testid={`loadout-${l.id}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="areas-btn-row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="mini-btn"
            onClick={() => selectPart('internal-ordnance-display')}
          >
            Inspect Stores
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => selectPart('gun-port-door')}
          >
            M61A2 Gun Port
          </button>
        </div>
      </section>
    </div>
  );
}

function EnginesModeBody({ isPhone }: { readonly isPhone: boolean }) {
  const engineSim = useExplorerStore((s) => s.engineSim);
  const startEngines = useExplorerStore((s) => s.startEngines);
  const abortOrShutdown = useExplorerStore((s) => s.abortOrShutdown);
  const setThrottle = useExplorerStore((s) => s.setThrottle);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setActiveMode = useExplorerStore((s) => s.setActiveMode);
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

  // Inline thrust & telemetry readout (lives INSIDE the Engines panel — zero floating overlay!)
  const telemetrySection = (
    <section className="areas-section" data-testid="engine-inline-hud">
      <div className="areas-heading">
        <span>Live Telemetry ({engineSim.outdoors ? 'Outdoor Pad' : 'Hangar'})</span>
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
    </section>
  );

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
    </section>
  );

  const startControlsSection = (
    <section className="areas-section">
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
          Nozzles
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={() => setActiveMode('cockpit')}
          data-testid="engine-cockpit-cam-btn"
        >
          Cockpit MFD
        </button>
      </div>
      <p className="areas-note">
        35,000-lbf class (SOURCED). Timings &amp; spool curves ASSUMED; plume is a visual
        approximation (not CFD).
      </p>
    </section>
  );

  const collapseStepsOnMobile = isPhone && isRunning && !stepsExpandedMobile;
  const stepsSection = (
    <section className="areas-section">
      <div className="areas-heading">
        <span>Start Sequence</span>
        <span className="spec-badge badge-assumed">ASSUMED</span>
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
        <ol className="engine-step-list" data-testid="engine-step-list">
          {ENGINE_START_STEPS.map((step) => {
            const isDone = isRunning || (activeStepIdx >= 0 && step.index < activeStepIdx);
            const isActive = engineSim.phase === step.phase;
            return (
              <li
                key={step.phase}
                ref={isActive ? activeStepRef : undefined}
                className={isActive ? 'engine-step active' : isDone ? 'engine-step done' : 'engine-step'}
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
      )}
    </section>
  );

  if (isPhone && isRunning) {
    return (
      <div className="areas-body">
        {throttleSection}
        {telemetrySection}
        {stepsSection}
        {startControlsSection}
      </div>
    );
  }

  return (
    <div className="areas-body">
      {telemetrySection}
      {startControlsSection}
      {throttleSection}
      {stepsSection}
    </div>
  );
}

const MODE_HEADERS = {
  explore: { kicker: 'EXPLORE MODE', title: 'Airframe & Disassembly' },
  cockpit: { kicker: 'COCKPIT MODE', title: 'Displays & Flight Controls' },
  weapons: { kicker: 'WEAPONS MODE', title: 'Internal Bays & Stores' },
  engines: { kicker: 'ENGINES MODE', title: 'Twin F119-PW-100' },
} as const;

export function ModePanel() {
  const { isPhone } = useViewport();
  const activeMode = useExplorerStore((s) => s.activeMode);
  const modePanelOpen = useExplorerStore((s) => s.modePanelOpen);
  const showInspector = useExplorerStore((s) => s.showInspector);
  const setModePanelOpen = useExplorerStore((s) => s.setModePanelOpen);

  if (!modePanelOpen) return null;
  // On phone, only ONE bottom sheet at a time: Inspector takes precedence when a part is selected
  if (isPhone && showInspector) return null;

  const hdr = MODE_HEADERS[activeMode];
  const body =
    activeMode === 'explore' ? (
      <ExploreModeBody />
    ) : activeMode === 'cockpit' ? (
      <CockpitModeBody />
    ) : activeMode === 'weapons' ? (
      <WeaponsModeBody />
    ) : (
      <EnginesModeBody isPhone={isPhone} />
    );

  if (isPhone) {
    return (
      <BottomSheet
        title={hdr.title}
        kicker={hdr.kicker}
        onClose={() => setModePanelOpen(false)}
        testId={`mode-panel-${activeMode}`}
      >
        {body}
      </BottomSheet>
    );
  }

  return (
    <aside className="part-tree-panel" data-testid={`mode-panel-${activeMode}`}>
      <div className="inspector-header">
        <div>
          <span className="inspector-kicker">{hdr.kicker}</span>
          <h2 className="inspector-title">{hdr.title}</h2>
        </div>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={() => setModePanelOpen(false)}
          aria-label="Collapse mode panel"
          data-testid="mode-panel-close-btn"
        >
          ✕
        </button>
      </div>
      <div className="inspector-scroll">{body}</div>
    </aside>
  );
}
