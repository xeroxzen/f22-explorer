import { useEffect } from 'react';
import { getComponentContent } from '../content/registry.js';
import {
  GUIDED_TOURS,
  getGuidedTour,
  type TourId,
  type TourStep,
} from '../content/tours.js';
import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';
import { useExplorerStore } from '../store/explorerStore.js';

function applyTourStepToStore(step: TourStep): void {
  const s = useExplorerStore.getState();
  if (step.explodeFactor !== undefined) s.setExplodeFactor(step.explodeFactor);
  if (step.canopyOpen !== undefined) s.setCanopyOpen(step.canopyOpen);
  if (step.mainBayOpen !== undefined) s.setMainBayOpen(step.mainBayOpen);
  if (step.sideBaysOpen !== undefined) s.setSideBaysOpen(step.sideBaysOpen);
  if (step.weaponsLoadout !== undefined) s.setWeaponsLoadout(step.weaponsLoadout);

  // Real engine state machine integration for the Engine Start guided tour
  if (step.engineAction) {
    if (step.engineAction === 'off') {
      s.setEnginePreset('off');
    } else if (step.engineAction === 'start-apu') {
      s.setEnginePreset('off');
      s.startEngines();
      // Step real state machine into APU_START
      for (let i = 0; i < 20; i++) s.tickEngineSim(0.1);
    } else if (step.engineAction === 'advance-eng1-motor') {
      if (s.engineSim.phase === 'OFF') s.startEngines();
      for (let i = 0; i < 60 && useExplorerStore.getState().engineSim.phase !== 'ENG1_MOTOR'; i++) {
        useExplorerStore.getState().tickEngineSim(0.1);
      }
      useExplorerStore.getState().tickEngineSim(0.5);
    } else if (step.engineAction === 'advance-eng1-idle') {
      if (s.engineSim.phase === 'OFF') s.startEngines();
      for (let i = 0; i < 140 && useExplorerStore.getState().engineSim.phase !== 'ENG2_MOTOR'; i++) {
        useExplorerStore.getState().tickEngineSim(0.1);
      }
      useExplorerStore.getState().tickEngineSim(0.5);
    } else if (step.engineAction === 'advance-both-idle') {
      if (s.engineSim.phase === 'OFF') s.startEngines();
      for (let i = 0; i < 250 && useExplorerStore.getState().engineSim.phase !== 'RUNNING'; i++) {
        useExplorerStore.getState().tickEngineSim(0.1);
      }
      useExplorerStore.getState().setThrottle(0);
    } else if (step.engineAction === 'throttle-mil') {
      if (useExplorerStore.getState().engineSim.phase !== 'RUNNING') {
        s.setEnginePreset('mil');
      } else {
        s.setThrottle(R.ENGINE_MIL_THROTTLE_THRESHOLD.value);
        for (let i = 0; i < 80; i++) useExplorerStore.getState().tickEngineSim(0.1);
      }
    } else if (step.engineAction === 'throttle-ab') {
      if (useExplorerStore.getState().engineSim.phase !== 'RUNNING') {
        s.setEnginePreset('ab');
      } else {
        s.setThrottle(1);
        for (let i = 0; i < 60; i++) useExplorerStore.getState().tickEngineSim(0.1);
      }
    }
  }

  s.setCameraPreset(step.cameraPreset);
}

export function TourOverlay() {
  const activeTourId = useExplorerStore((s) => s.activeTourId);
  const tourStepIndex = useExplorerStore((s) => s.tourStepIndex);
  const showTourPicker = useExplorerStore((s) => s.showTourPicker);
  const savedTourProgress = useExplorerStore((s) => s.savedTourProgress);
  const startTour = useExplorerStore((s) => s.startTour);
  const setTourStepIndex = useExplorerStore((s) => s.setTourStepIndex);
  const closeTour = useExplorerStore((s) => s.closeTour);
  const setShowTourPicker = useExplorerStore((s) => s.setShowTourPicker);
  const selectPart = useExplorerStore((s) => s.selectPart);

  const activeTour = activeTourId ? getGuidedTour(activeTourId) : null;
  const currentStep = activeTour ? activeTour.steps[tourStepIndex] : null;

  useEffect(() => {
    if (currentStep) {
      applyTourStepToStore(currentStep);
    }
  }, [currentStep]);

  // Keyboard navigation for active tour (ArrowRight / ArrowLeft / Escape)
  useEffect(() => {
    if (!activeTour) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTour();
      } else if (e.key === 'ArrowRight' && tourStepIndex < activeTour.steps.length - 1) {
        setTourStepIndex(tourStepIndex + 1);
      } else if (e.key === 'ArrowLeft' && tourStepIndex > 0) {
        setTourStepIndex(tourStepIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTour, tourStepIndex, setTourStepIndex, closeTour]);

  if (showTourPicker && !activeTour) {
    return (
      <section
        className="tour-picker"
        data-testid="tour-picker"
        role="dialog"
        aria-label="Choose a guided tour"
      >
        <div className="tour-card-head">
          <div>
            <span className="inspector-kicker">GUIDED EDUCATIONAL TOURS</span>
            <h2 className="tour-title">Choose a Walkthrough</h2>
          </div>
          <button
            type="button"
            className="inspector-close-btn"
            onClick={() => setShowTourPicker(false)}
            aria-label="Close tour picker"
            data-testid="tour-picker-close-btn"
          >
            ✕
          </button>
        </div>

        <div className="tour-picker-grid">
          {GUIDED_TOURS.map((tour) => {
            const savedIdx = savedTourProgress[tour.id] ?? 0;
            const canResume = savedIdx > 0 && savedIdx < tour.steps.length;
            return (
              <div key={tour.id} className="tour-choice">
                <div className="tour-choice-title">
                  {tour.title} ({tour.steps.length} steps)
                </div>
                <p className="tour-choice-sub">{tour.subtitle}</p>
                <div className="tour-choice-actions">
                  <button
                    type="button"
                    className="mini-btn active"
                    onClick={() => startTour(tour.id, 0)}
                    data-testid={`start-tour-${tour.id}`}
                  >
                    {canResume ? 'Restart' : 'Start Tour'}
                  </button>
                  {canResume && (
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => startTour(tour.id, savedIdx)}
                      data-testid={`resume-tour-${tour.id}`}
                    >
                      Resume (Step {savedIdx + 1})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (!activeTour || !currentStep) return null;

  const content = getComponentContent(currentStep.partId);
  const primarySource = content?.sources[0];
  const isFirst = tourStepIndex === 0;
  const isLast = tourStepIndex === activeTour.steps.length - 1;

  return (
    <section
      className="tour-card"
      data-testid="tour-card"
      data-tour-id={activeTour.id}
      data-tour-step={tourStepIndex + 1}
      role="region"
      aria-label={`Guided tour: ${activeTour.title}`}
    >
      <div className="tour-card-head">
        <div>
          <span className="inspector-kicker">
            TOUR: {activeTour.title.toUpperCase()} · STEP {tourStepIndex + 1} /{' '}
            {activeTour.steps.length}
          </span>
          <h2 className="tour-title">{currentStep.title}</h2>
        </div>
        <div className="tour-head-actions">
          <select
            className="tour-select"
            aria-label="Switch guided tour"
            value={activeTour.id}
            onChange={(e) => startTour(e.target.value as TourId, 0)}
            data-testid="tour-switcher"
          >
            {GUIDED_TOURS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mini-btn"
            onClick={closeTour}
            data-testid="tour-skip-btn"
            aria-label="Skip or pause tour"
          >
            Skip
          </button>
        </div>
      </div>

      <p className="tour-body">{currentStep.focusNote}</p>

      {content && (
        <div className="tour-citation" data-testid="tour-citation">
          <div className="tour-citation-row">
            <strong>{content.title}</strong>
            <span className="spec-badge badge-sourced">EX: {content.existenceLabel}</span>
            <span className="spec-badge badge-approximate">GEOM: {content.geometryLabel}</span>
            <button
              type="button"
              className="mini-btn"
              onClick={() => selectPart(content.id)}
              data-testid="tour-inspect-part-btn"
            >
              Open Inspector
            </button>
          </div>
          {primarySource && (
            <div className="tour-citation-src">
              Source: {primarySource.title} (accessed {primarySource.accessed})
            </div>
          )}
        </div>
      )}

      <div className="tour-nav">
        <button
          type="button"
          className="mini-btn"
          disabled={isFirst}
          onClick={() => setTourStepIndex(tourStepIndex - 1)}
          data-testid="tour-prev-btn"
        >
          ← Back
        </button>
        <div className="tour-dots" aria-hidden="true">
          {activeTour.steps.map((st, idx) => (
            <span
              key={st.id}
              className={`tour-dot ${idx === tourStepIndex ? 'active' : idx < tourStepIndex ? 'done' : ''}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="mini-btn active"
          onClick={() => (isLast ? closeTour() : setTourStepIndex(tourStepIndex + 1))}
          data-testid="tour-next-btn"
        >
          {isLast ? 'Finish' : 'Next →'}
        </button>
      </div>
    </section>
  );
}
