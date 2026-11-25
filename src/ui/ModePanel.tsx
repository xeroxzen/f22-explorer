import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_COMPONENTS } from '../content/registry.js';
import type { ComponentContent, SpecStatus } from '../content/schema.js';
import { INFERNO_CSS_GRADIENT, THERMAL_MAX_K, THERMAL_MIN_K } from '../scene/thermalColormap.js';
import { computeBraytonCycle } from '../sim/braytonCycle.js';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import { ENGINE_START_STEPS } from '../sim/engineSim.js';
import { computeSkinHeating } from '../sim/skinHeating.js';
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
    case 'COMPUTED':
      return 'COMPUTED';
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
    case 'COMPUTED':
      return 'badge-computed';
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
  const showSystemTints = useExplorerStore((s) => s.showSystemTints);
  const showThermalColors = useExplorerStore((s) => s.showThermalColors);
  const xrayMode = useExplorerStore((s) => s.xrayMode);
  const clipAxis = useExplorerStore((s) => s.clipAxis);
  const clipPosition = useExplorerStore((s) => s.clipPosition);
  const gearDeployed = useExplorerStore((s) => s.gearDeployed);
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const hiddenPartIds = useExplorerStore((s) => s.hiddenPartIds);
  const isolatedPartId = useExplorerStore((s) => s.isolatedPartId);

  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setExplodeFactor = useExplorerStore((s) => s.setExplodeFactor);
  const setExplodeStage = useExplorerStore((s) => s.setExplodeStage);
  const setShowSystemTints = useExplorerStore((s) => s.setShowSystemTints);
  const setShowThermalColors = useExplorerStore((s) => s.setShowThermalColors);
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

      {/* Staged Disassembly & Cutaway Controls */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Staged Explode &amp; Cutaway</span>
          <span className="spec-badge badge-approximate" data-testid="explode-stage-badge">
            {explodeFactor < 0.02
              ? 'Assembled'
              : explodeFactor <= 0.35
                ? 'Stage 1: Skin'
                : explodeFactor <= 0.68
                  ? 'Stage 2: Systems'
                  : 'Stage 3: Engine'}
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
          {([0, 1, 2, 3] as const).map((st) => {
            const active =
              (st === 0 && explodeFactor < 0.05) ||
              (st === 1 && explodeFactor >= 0.05 && explodeFactor <= 0.45) ||
              (st === 2 && explodeFactor > 0.45 && explodeFactor <= 0.8) ||
              (st === 3 && explodeFactor > 0.8);
            return (
              <button
                key={st}
                type="button"
                className={`mini-btn ${active ? 'active' : ''}`}
                onClick={() => setExplodeStage(st)}
                data-testid={`explode-stage-${st}`}
              >
                {st === 0 ? 'Assembled' : `S${st}`}
              </button>
            );
          })}
        </div>

        <div className="areas-btn-row" style={{ marginTop: 6 }}>
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
            className={`mini-btn ${showSystemTints ? 'active' : ''}`}
            onClick={() => setShowSystemTints(!showSystemTints)}
            data-testid="system-tints-toggle-btn"
            aria-pressed={showSystemTints}
          >
            System Tints
          </button>
          <button
            type="button"
            className={`mini-btn ${showThermalColors ? 'active' : ''}`}
            onClick={() => setShowThermalColors(!showThermalColors)}
            data-testid="thermal-toggle-btn"
            aria-pressed={showThermalColors}
          >
            Thermal
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
  const explodeFactor = useExplorerStore((s) => s.explodeFactor);
  const showThermalColors = useExplorerStore((s) => s.showThermalColors);
  const skinAltitudeM = useExplorerStore((s) => s.skinAltitudeM);
  const skinMach = useExplorerStore((s) => s.skinMach);
  const startEngines = useExplorerStore((s) => s.startEngines);
  const abortOrShutdown = useExplorerStore((s) => s.abortOrShutdown);
  const setThrottle = useExplorerStore((s) => s.setThrottle);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setActiveMode = useExplorerStore((s) => s.setActiveMode);
  const setExplodeStage = useExplorerStore((s) => s.setExplodeStage);
  const setShowThermalColors = useExplorerStore((s) => s.setShowThermalColors);
  const setSkinAltitudeM = useExplorerStore((s) => s.setSkinAltitudeM);
  const setSkinMach = useExplorerStore((s) => s.setSkinMach);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const activeStepRef = useRef<HTMLLIElement>(null);
  const [stepsExpandedMobile, setStepsExpandedMobile] = useState(false);

  const brayton = useMemo(() => computeBraytonCycle(engineSim.left), [engineSim.left]);
  const skinHeat = useMemo(
    () => computeSkinHeating(skinAltitudeM, skinMach),
    [skinAltitudeM, skinMach]
  );

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

  const thermalCutawaySection = (
    <section className="areas-section" data-testid="thermal-cycle-panel">
      <div className="areas-heading">
        <span>F119 Thermal Cutaway (Brayton)</span>
        <span className="spec-badge badge-computed">COMPUTED</span>
      </div>
      <div className="areas-btn-row" style={{ marginBottom: 6 }}>
        <button
          type="button"
          className={`mini-btn ${explodeFactor > 0.8 ? 'active' : ''}`}
          onClick={() => {
            if (explodeFactor > 0.8) {
              setExplodeStage(0);
              setCameraPreset('rear');
            } else {
              setExplodeStage(3);
              setShowThermalColors(true);
              setCameraPreset('thermal-cutaway');
            }
          }}
          data-testid="f119-cutaway-btn"
        >
          {explodeFactor > 0.8 ? 'Assemble Jet' : 'F119 Cutaway'}
        </button>
        <button
          type="button"
          className={`mini-btn ${showThermalColors ? 'active' : ''}`}
          onClick={() => {
            const next = !showThermalColors;
            setShowThermalColors(next);
            if (next) {
              setExplodeStage(3);
              setCameraPreset('thermal-cutaway');
            }
          }}
          data-testid="engines-thermal-toggle-btn"
        >
          Thermal Map
        </button>
        <button
          type="button"
          className="mini-btn"
          onClick={() => selectPart('f119-combustor-left')}
          data-testid="inspect-combustor-btn"
        >
          Inspect Stn 4
        </button>
      </div>
      <div className="thermal-legend-bar" style={{ background: INFERNO_CSS_GRADIENT }} />
      <div className="thermal-legend-ticks" data-testid="thermal-legend">
        <span>{THERMAL_MIN_K} K ({Math.round(THERMAL_MIN_K - 273.15)} °C)</span>
        <span>1200 K (927 °C)</span>
        <span>{THERMAL_MAX_K} K ({Math.round(THERMAL_MAX_K - 273.15)} °C)</span>
      </div>
      <div className="brayton-grid">
        {(['2', '13', '3', '4', '45', '5', '6', '7', '8'] as const).map((code) => {
          const st = brayton.stations[code];
          return (
            <div key={st.id} className="brayton-cell">
              <span className="brayton-code">{st.stationCode}</span>
              <span className="brayton-val">{Math.round(st.totalTempK)} K</span>
              <span className="brayton-sub">{Math.round(st.totalTempC)} °C</span>
            </div>
          );
        })}
      </div>
      <p className="areas-note">
        F119 cycle not publicly disclosed — ideal Brayton model on ASSUMED teaching inputs.
      </p>
    </section>
  );

  const skinHeatingSection = (
    <section className="areas-section" data-testid="skin-heating-panel">
      <div className="areas-heading">
        <span>Aerodynamic Skin Heating</span>
        <span className="spec-badge badge-computed">COMPUTED</span>
      </div>
      <div className="skin-formula-row">
        <span className="skin-formula">T₀ = T · (1 + 0.2 · M²)</span>
        <span className="spec-badge badge-sourced">SOURCED</span>
      </div>
      <label className="areas-slider">
        <span>Altitude (ISA): {(skinAltitudeM / 1000).toFixed(1)} km (T = {Math.round(skinHeat.staticTempK)} K / {Math.round(skinHeat.staticTempC)} °C)</span>
        <input
          type="range"
          min={0}
          max={20000}
          step={500}
          value={skinAltitudeM}
          onChange={(e) => setSkinAltitudeM(Number(e.target.value))}
          data-testid="skin-altitude-slider"
        />
      </label>
      <label className="areas-slider">
        <span>Mach Number: M {skinMach.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={skinMach}
          onChange={(e) => setSkinMach(Number(e.target.value))}
          data-testid="skin-mach-slider"
        />
      </label>
      <div className="skin-heat-readout" data-testid="skin-temp-readout">
        <div>
          <div className="engine-hud-label">LEADING-EDGE STAGNATION T₀</div>
          <div className="engine-hud-val">
            {Math.round(skinHeat.stagnationTempK)} K ({Math.round(skinHeat.stagnationTempC)} °C)
          </div>
        </div>
        <div className="engine-hud-sub">
          +{Math.round(skinHeat.deltaTempK)} K ram rise
        </div>
      </div>
    </section>
  );

  if (isPhone && isRunning) {
    return (
      <div className="areas-body">
        {throttleSection}
        {telemetrySection}
        {stepsSection}
        {thermalCutawaySection}
        {skinHeatingSection}
        {startControlsSection}
      </div>
    );
  }

  return (
    <div className="areas-body">
      {telemetrySection}
      {startControlsSection}
      {throttleSection}
      {thermalCutawaySection}
      {skinHeatingSection}
      {stepsSection}
    </div>
  );
}

function AirflowModeBody() {
  const aeroAlphaDeg = useExplorerStore((s) => s.aeroAlphaDeg);
  const aeroBetaDeg = useExplorerStore((s) => s.aeroBetaDeg);
  const aeroMach = useExplorerStore((s) => s.aeroMach);
  const aeroPolhamus = useExplorerStore((s) => s.aeroPolhamus);
  const aeroShowCp = useExplorerStore((s) => s.aeroShowCp);
  const aeroShowLiftRibbon = useExplorerStore((s) => s.aeroShowLiftRibbon);
  const aeroShowStreamlines = useExplorerStore((s) => s.aeroShowStreamlines);
  const aeroShowForces = useExplorerStore((s) => s.aeroShowForces);
  const flaps = useExplorerStore((s) => s.flaps);
  const rudderYaw = useExplorerStore((s) => s.rudderYaw);
  const stickPitch = useExplorerStore((s) => s.stickPitch);
  const stickRoll = useExplorerStore((s) => s.stickRoll);
  const vlmResult = useExplorerStore((s) => s.vlmResult);

  const setAeroAlphaDeg = useExplorerStore((s) => s.setAeroAlphaDeg);
  const setAeroBetaDeg = useExplorerStore((s) => s.setAeroBetaDeg);
  const setAeroMach = useExplorerStore((s) => s.setAeroMach);
  const setAeroPolhamus = useExplorerStore((s) => s.setAeroPolhamus);
  const setAeroShowCp = useExplorerStore((s) => s.setAeroShowCp);
  const setAeroShowLiftRibbon = useExplorerStore((s) => s.setAeroShowLiftRibbon);
  const setAeroShowStreamlines = useExplorerStore((s) => s.setAeroShowStreamlines);
  const setAeroShowForces = useExplorerStore((s) => s.setAeroShowForces);
  const setFlaps = useExplorerStore((s) => s.setFlaps);
  const setRudderYaw = useExplorerStore((s) => s.setRudderYaw);
  const resetControlSurfaces = useExplorerStore((s) => s.resetControlSurfaces);

  // Build 2D spanwise lift SVG polyline
  const spanPts = vlmResult?.spanwiseWingLift ?? [];
  const halfSpan = R.F22_WINGSPAN_M.value / 2;
  const maxCcl = Math.max(0.6, ...spanPts.map((p) => Math.abs(p.cClOverCref)));
  const spanPoly = spanPts
    .map((p) => {
      const sx = 12 + ((p.xSpanM + halfSpan) / (2 * halfSpan)) * 276;
      const sy = 56 - (p.cClOverCref / maxCcl) * 44;
      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');

  // Linear + optional Polhamus AoA sweep curve (-10..+20 deg) for quick visual reference
  const clSlopeApprox =
    vlmResult && Math.abs(vlmResult.alphaDeg) > 0.5
      ? vlmResult.clPotential / ((vlmResult.alphaDeg * Math.PI) / 180)
      : 2.35;
  const sweepPts = Array.from({ length: 16 }, (_, i) => {
    const aDeg = -10 + i * 2;
    const aRad = (aDeg * Math.PI) / 180;
    const clPot = clSlopeApprox * aRad;
    const clVort = aeroPolhamus
      ? R.VLM_POLHAMUS_KV_APPROX.value * Math.sign(aRad) * Math.cos(aRad) * Math.sin(aRad) * Math.sin(aRad)
      : 0;
    const sx = 14 + ((aDeg + 10) / 30) * 272;
    const sy = 54 - ((clPot + clVort) / 1.4) * 42;
    return `${sx.toFixed(1)},${Math.max(6, Math.min(72, sy)).toFixed(1)}`;
  }).join(' ');
  const curAlphaX = 14 + ((aeroAlphaDeg + 10) / 30) * 272;
  const curClY = Math.max(6, Math.min(72, 54 - ((vlmResult?.cl ?? 0) / 1.4) * 42));

  return (
    <div className="areas-body">
      {/* Always-visible Model Limits Panel */}
      <section className="airflow-limits-box" data-testid="airflow-limits-panel">
        <div className="areas-heading" style={{ marginBottom: 4 }}>
          <span>Model Limits (Linear VLM)</span>
          <span className="spec-badge badge-computed">COMPUTED</span>
        </div>
        <p className="areas-note" style={{ margin: 0 }}>
          Inviscid, attached potential flow: no stall, separation, viscosity, or thickness. Linear
          Prandtl–Glauert valid only to <strong>M ≤ 0.70</strong>. Chine vortex lift is not
          captured (Polhamus toggle is an approximate leading-edge suction analogy). Results apply
          to our <strong>reference planform</strong>, not the real F-22.
        </p>
      </section>

      {vlmResult && !vlmResult.valid && (
        <div className="vlm-validity-banner" data-testid="vlm-validity-warning" role="alert">
          {vlmResult.validityMessage}
        </div>
      )}

      {/* Live COMPUTED Coefficients */}
      <section className="areas-section" data-testid="vlm-coeffs-panel">
        <div className="areas-heading">
          <span>Aero Coefficients</span>
          <span className="spec-badge badge-computed">COMPUTED</span>
        </div>
        <div className="brayton-grid">
          <div className="brayton-cell">
            <span className="brayton-code">C_L</span>
            <span className="brayton-val" data-testid="vlm-cl">{(vlmResult?.cl ?? 0).toFixed(3)}</span>
            <span className="brayton-sub">{aeroPolhamus ? 'Polhamus' : 'Potential'}</span>
          </div>
          <div className="brayton-cell">
            <span className="brayton-code">C_Di</span>
            <span className="brayton-val">{(vlmResult?.cdi ?? 0).toFixed(4)}</span>
            <span className="brayton-sub">e={(vlmResult?.oswaldE ?? 0).toFixed(2)}</span>
          </div>
          <div className="brayton-cell">
            <span className="brayton-code">Roll C_l</span>
            <span className="brayton-val" data-testid="vlm-croll">{(vlmResult?.cRoll ?? 0).toFixed(4)}</span>
            <span className="brayton-sub">RWD +</span>
          </div>
          <div className="brayton-cell">
            <span className="brayton-code">Pitch C_m</span>
            <span className="brayton-val">{(vlmResult?.cPitch ?? 0).toFixed(3)}</span>
            <span className="brayton-sub">Yaw {(vlmResult?.cYaw ?? 0).toFixed(3)}</span>
          </div>
        </div>

        {/* 2D Spanwise Lift Distribution Chart */}
        <div className="aero-chart-wrap" data-testid="spanwise-lift-chart">
          <div className="overflow-lbl" style={{ marginBottom: 2 }}>
            Spanwise Lift c·c_l / c_ref (-6.8 m → +6.8 m)
          </div>
          <svg viewBox="0 0 300 68" width="100%" height="64" role="img" aria-label="Spanwise lift distribution">
            <line x1="12" y1="56" x2="288" y2="56" stroke="#475569" strokeWidth="1" />
            <line x1="150" y1="8" x2="150" y2="62" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
            {spanPoly && (
              <polyline points={spanPoly} fill="none" stroke="#38bdf8" strokeWidth="2" />
            )}
          </svg>
        </div>

        {/* 2D AoA Sweep Chart (CL vs Alpha) */}
        <div className="aero-chart-wrap" data-testid="aoa-sweep-chart">
          <div className="overflow-lbl" style={{ marginBottom: 2 }}>
            C_L vs AoA (-10° → +20°){aeroPolhamus ? ' · Polhamus Vortex Lift' : ''}
          </div>
          <svg viewBox="0 0 300 76" width="100%" height="68" role="img" aria-label="Lift coefficient vs angle of attack">
            <line x1="14" y1="54" x2="286" y2="54" stroke="#475569" strokeWidth="1" />
            <line x1="105" y1="6" x2="105" y2="72" stroke="#334155" strokeWidth="1" strokeDasharray="2,2" />
            <polyline points={sweepPts} fill="none" stroke="#22c55e" strokeWidth="2" />
            <circle cx={curAlphaX} cy={curClY} r="4" fill="#f8fafc" stroke="#22c55e" strokeWidth="2" />
          </svg>
        </div>
      </section>

      {/* Legends: ΔCp + Force Arrows */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Overlays &amp; Legends</span>
        </div>
        <div className="areas-btn-row" style={{ marginBottom: 6 }}>
          <button
            type="button"
            className={`mini-btn ${aeroShowCp ? 'active' : ''}`}
            onClick={() => setAeroShowCp(!aeroShowCp)}
          >
            ΔCp Panels
          </button>
          <button
            type="button"
            className={`mini-btn ${aeroShowLiftRibbon ? 'active' : ''}`}
            onClick={() => setAeroShowLiftRibbon(!aeroShowLiftRibbon)}
          >
            Lift Ribbon
          </button>
          <button
            type="button"
            className={`mini-btn ${aeroShowStreamlines ? 'active' : ''}`}
            onClick={() => setAeroShowStreamlines(!aeroShowStreamlines)}
          >
            Streamlines
          </button>
          <button
            type="button"
            className={`mini-btn ${aeroShowForces ? 'active' : ''}`}
            onClick={() => setAeroShowForces(!aeroShowForces)}
          >
            Arrows
          </button>
        </div>
        <div className="cp-legend-bar" />
        <div className="thermal-legend-ticks">
          <span>-1.4 ΔCp (Suction)</span>
          <span>0</span>
          <span>+1.4 ΔCp (Pressure)</span>
        </div>
        <div className="force-legend-row">
          <span><i style={{ background: '#22c55e' }} />Lift</span>
          <span><i style={{ background: '#ef4444' }} />Ind. Drag</span>
          <span><i style={{ background: '#f59e0b' }} />Roll</span>
          <span><i style={{ background: '#a855f7' }} />Pitch</span>
        </div>
      </section>

      {/* Flow Condition Sliders */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Flow Conditions</span>
          <button
            type="button"
            className={`mini-btn ${aeroPolhamus ? 'active' : ''}`}
            onClick={() => setAeroPolhamus(!aeroPolhamus)}
            data-testid="polhamus-toggle-btn"
          >
            Polhamus Vortex
          </button>
        </div>
        <label className="areas-slider">
          <span>Angle of Attack (α): {aeroAlphaDeg.toFixed(1)}°</span>
          <input
            type="range"
            min={-10}
            max={20}
            step={0.5}
            value={aeroAlphaDeg}
            onChange={(e) => setAeroAlphaDeg(Number(e.target.value))}
            data-testid="aero-alpha-slider"
          />
        </label>
        <label className="areas-slider">
          <span>Sideslip (β): {aeroBetaDeg.toFixed(1)}°</span>
          <input
            type="range"
            min={-15}
            max={15}
            step={0.5}
            value={aeroBetaDeg}
            onChange={(e) => setAeroBetaDeg(Number(e.target.value))}
            data-testid="aero-beta-slider"
          />
        </label>
        <label className="areas-slider">
          <span>Mach (valid ≤ 0.70): M {aeroMach.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.02}
            value={aeroMach}
            onChange={(e) => setAeroMach(Number(e.target.value))}
            data-testid="aero-mach-slider"
          />
        </label>
      </section>

      {/* Reused Control Stick & Surface Deflections -> Live Aero Response */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Flight Controls → Aero</span>
          <button type="button" className="mini-btn" onClick={resetControlSurfaces}>
            Center
          </button>
        </div>
        <ControlStickPad />
        <div className="areas-note" style={{ marginTop: 4 }}>
          Stick Pitch {(stickPitch * 100).toFixed(0)}% · Roll {(stickRoll * 100).toFixed(0)}%
        </div>
        <label className="areas-slider">
          <span>Flaperons / LEFs: {Math.round(flaps * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={flaps}
            onChange={(e) => setFlaps(Number(e.target.value))}
            data-testid="aero-flaps-slider"
          />
        </label>
        <label className="areas-slider">
          <span>Rudders: {Math.round(rudderYaw * 100)}%</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={rudderYaw}
            onChange={(e) => setRudderYaw(Number(e.target.value))}
            data-testid="aero-rudder-slider"
          />
        </label>
      </section>
    </div>
  );
}

const MODE_HEADERS = {
  explore: { kicker: 'EXPLORE MODE', title: 'Airframe & Disassembly' },
  cockpit: { kicker: 'COCKPIT MODE', title: 'Displays & Flight Controls' },
  weapons: { kicker: 'WEAPONS MODE', title: 'Internal Bays & Stores' },
  engines: { kicker: 'ENGINES MODE', title: 'Twin F119-PW-100' },
  airflow: { kicker: 'AIRFLOW MODE', title: 'VLM Aerodynamics' },
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
    ) : activeMode === 'engines' ? (
      <EnginesModeBody isPhone={isPhone} />
    ) : (
      <AirflowModeBody />
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
