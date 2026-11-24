import { useRef } from 'react';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import {
  useExplorerStore,
  type WeaponsLoadoutId,
} from '../store/explorerStore.js';
import { BottomSheet } from './BottomSheet.js';
import { useViewport } from './useViewport.js';

const LOADOUTS: readonly { id: WeaponsLoadoutId; label: string }[] = [
  { id: 'air-to-air', label: '6× AIM-120' },
  { id: 'jdam', label: '2× JDAM + 2× AIM-120' },
  { id: 'sdb', label: '8× SDB + 2× AIM-120' },
];

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

  const knobLeft = `${50 + stickRoll * 42}%`;
  const knobTop = `${50 - stickPitch * 42}%`;

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
      <div className="stick-knob" style={{ left: knobLeft, top: knobTop }} />
    </div>
  );
}

function AreasControlBody() {
  const canopyOpen = useExplorerStore((s) => s.canopyOpen);
  const mainBayOpen = useExplorerStore((s) => s.mainBayOpen);
  const sideBaysOpen = useExplorerStore((s) => s.sideBaysOpen);
  const weaponsLoadout = useExplorerStore((s) => s.weaponsLoadout);
  const gearDeployed = useExplorerStore((s) => s.gearDeployed);
  const stickPitch = useExplorerStore((s) => s.stickPitch);
  const stickRoll = useExplorerStore((s) => s.stickRoll);
  const rudderYaw = useExplorerStore((s) => s.rudderYaw);
  const airbrake = useExplorerStore((s) => s.airbrake);
  const flaps = useExplorerStore((s) => s.flaps);
  const nozzlePitch = useExplorerStore((s) => s.nozzlePitch);

  const setCanopyOpen = useExplorerStore((s) => s.setCanopyOpen);
  const setMainBayOpen = useExplorerStore((s) => s.setMainBayOpen);
  const setSideBaysOpen = useExplorerStore((s) => s.setSideBaysOpen);
  const setWeaponsLoadout = useExplorerStore((s) => s.setWeaponsLoadout);
  const setGearDeployed = useExplorerStore((s) => s.setGearDeployed);
  const setRudderYaw = useExplorerStore((s) => s.setRudderYaw);
  const setAirbrake = useExplorerStore((s) => s.setAirbrake);
  const setFlaps = useExplorerStore((s) => s.setFlaps);
  const setNozzlePitch = useExplorerStore((s) => s.setNozzlePitch);
  const resetControlSurfaces = useExplorerStore((s) => s.resetControlSurfaces);
  const setCameraPreset = useExplorerStore((s) => s.setCameraPreset);
  const setExplodeFactor = useExplorerStore((s) => s.setExplodeFactor);

  return (
    <div className="areas-body">
      {/* Cockpit Section */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Cockpit</span>
          <span className="spec-badge badge-assumed">CANOPY 38° ASSUMED</span>
        </div>
        <div className="areas-btn-row">
          <button
            type="button"
            className={`mini-btn ${canopyOpen ? 'active' : ''}`}
            onClick={() => setCanopyOpen(!canopyOpen)}
            data-testid="canopy-toggle-btn"
          >
            {canopyOpen ? 'Close Canopy' : 'Open Canopy'}
          </button>
          <button
            type="button"
            className="mini-btn"
            onClick={() => {
              setExplodeFactor(0);
              setCanopyOpen(true);
              setCameraPreset('cockpit');
            }}
            data-testid="cockpit-cam-btn"
          >
            Seat View
          </button>
        </div>
        <p className="areas-note">
          Generic schematic of 6 LCDs + HUD + ICP; real symbology is classified.
        </p>
      </section>

      {/* Internal Weapons Bays */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Internal Weapons Bays</span>
          <span className="spec-badge badge-sourced">USAF LOADOUTS</span>
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
              setExplodeFactor(0);
              setMainBayOpen(true);
              setSideBaysOpen(true);
              setCameraPreset('bays');
            }}
            data-testid="bays-cam-btn"
          >
            Inspect Bays
          </button>
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
      </section>

      {/* Landing Gear */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Landing Gear</span>
          <span className="spec-badge badge-assumed">KINEMATICS ASSUMED</span>
        </div>
        <div className="areas-btn-row">
          <button
            type="button"
            className={`mini-btn ${gearDeployed ? 'active' : ''}`}
            onClick={() => setGearDeployed(!gearDeployed)}
            data-testid="gear-toggle-btn"
          >
            {gearDeployed ? 'Retract Gear' : 'Extend Gear'}
          </button>
        </div>
      </section>

      {/* Control Stick & Surfaces */}
      <section className="areas-section">
        <div className="areas-heading">
          <span>Control Stick &amp; Surfaces</span>
          <span className="spec-badge badge-assumed">AERO LIMITS ASSUMED</span>
        </div>

        <ControlStickPad />

        <div className="areas-readouts">
          <span>
            Stab: {(stickPitch * R.F22_STABILATOR_MAX_DEG.value).toFixed(0)}°
          </span>
          <span>
            Ail: {(stickRoll * R.F22_AILERON_MAX_DEG.value).toFixed(0)}°
          </span>
          <span>
            Nozzle:{' '}
            {(nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value).toFixed(0)}°{' '}
            <em className="sourced-tag">SOURCED</em>
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
          <span>
            2D Nozzle Pitch ({(nozzlePitch * R.F119_NOZZLE_VECTOR_MAX_DEG.value).toFixed(0)}° · SOURCED)
          </span>
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

export function AreasControlPanel() {
  const { isPhone } = useViewport();
  const showAreasPanel = useExplorerStore((s) => s.showAreasPanel);
  const setShowAreasPanel = useExplorerStore((s) => s.setShowAreasPanel);

  if (!showAreasPanel) return null;

  if (isPhone) {
    return (
      <BottomSheet
        title="Areas & Controls"
        kicker="COCKPIT · BAYS · GEAR · STICK"
        onClose={() => setShowAreasPanel(false)}
        testId="areas-panel"
      >
        <AreasControlBody />
      </BottomSheet>
    );
  }

  return (
    <aside className="part-tree-panel" data-testid="areas-panel">
      <div className="inspector-header">
        <div>
          <span className="inspector-kicker">COCKPIT · BAYS · GEAR · STICK</span>
          <h2 className="inspector-title">Areas &amp; Controls</h2>
        </div>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={() => setShowAreasPanel(false)}
          aria-label="Close areas panel"
          data-testid="areas-close-btn"
        >
          ✕
        </button>
      </div>
      <div className="inspector-scroll">
        <AreasControlBody />
      </div>
    </aside>
  );
}
