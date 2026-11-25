import { getComponentContent } from '../content/registry.js';
import type { ComponentContent, SpecStatus } from '../content/schema.js';
import { temperatureToInfernoHex } from '../scene/thermalColormap.js';
import {
  computeBraytonCycle,
  partIdToBraytonStation,
  type BraytonCycleResult,
  type BraytonStationId,
} from '../sim/braytonCycle.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { BottomSheet } from './BottomSheet.js';
import { useViewport } from './useViewport.js';

function statusBadgeClass(status: SpecStatus): string {
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

function statusLabel(status: SpecStatus): string {
  return status === 'NOT_PUBLICLY_DISCLOSED' ? 'NOT PUBLICLY DISCLOSED' : status;
}

function formatSnippet(snippet: string, verbatim?: boolean): string {
  const clean = snippet.trim().replace(/^["'“‘]+|["'”’]+$/g, '');
  return verbatim ? `“${clean}”` : clean;
}

function SaeStationDiagram({
  cycle,
  activeStation,
}: {
  readonly cycle: BraytonCycleResult;
  readonly activeStation: BraytonStationId;
}) {
  const nodes: Array<{ id: BraytonStationId; x: number; y: number; label: string }> = [
    { id: '0', x: 16, y: 40, label: '0' },
    { id: '2', x: 42, y: 40, label: '2' },
    { id: '13', x: 74, y: 18, label: '13' },
    { id: '25', x: 74, y: 56, label: '25' },
    { id: '3', x: 108, y: 56, label: '3' },
    { id: '4', x: 142, y: 56, label: '4' },
    { id: '45', x: 174, y: 56, label: '45' },
    { id: '5', x: 204, y: 56, label: '5' },
    { id: '6', x: 234, y: 40, label: '6' },
    { id: '7', x: 264, y: 40, label: '7' },
    { id: '8', x: 292, y: 40, label: '8' },
  ];

  return (
    <div className="sae-diagram-wrap" data-testid="sae-station-diagram">
      <svg viewBox="0 0 310 82" width="100%" height="78" role="img" aria-label="SAE ARP755 station diagram">
        {/* Bypass flow path: 2 -> 13 -> 6 */}
        <polyline points="42,40 74,18 234,18 234,40" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,2" />
        {/* Core flow path: 0 -> 2 -> 25 -> 3 -> 4 -> 45 -> 5 -> 6 -> 7 -> 8 */}
        <polyline points="16,40 42,40 74,56 204,56 234,40 292,40" fill="none" stroke="#94a3b8" strokeWidth="2" />
        <text x="148" y="13" fill="#94a3b8" fontSize="8" textAnchor="middle">
          Bypass Duct (BPR {cycle.bypassRatio.toFixed(1)})
        </text>
        <text x="234" y="75" fill="#94a3b8" fontSize="7.5" textAnchor="middle">
          Mixer → AB → Noz
        </text>
        {nodes.map((n) => {
          const st = cycle.stations[n.id];
          const fill = temperatureToInfernoHex(st.totalTempK);
          const isAct = n.id === activeStation;
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={isAct ? 10 : 7.5}
                fill={fill}
                stroke={isAct ? '#38bdf8' : '#e2e8f0'}
                strokeWidth={isAct ? 2.2 : 1}
              />
              <text
                x={n.x}
                y={n.y + 3}
                fill={st.totalTempK > 1400 ? '#0f172a' : '#f8fafc'}
                fontSize="7.5"
                fontWeight="700"
                textAnchor="middle"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function InspectorBody({ content }: { readonly content: ComponentContent | null }) {
  const engineSim = useExplorerStore((s) => s.engineSim);
  if (!content) {
    return (
      <div className="inspector-empty" data-testid="inspector-empty">
        <p className="inspector-summary">
          Select any part on the F-22 model or in the part tree to inspect its
          function, public materials, specifications, and cited sources.
        </p>
        <p className="inspector-note">
          Every part displays dual provenance badges (Existence &amp; Geometry):{' '}
          <span className="spec-badge badge-sourced">SOURCED</span>,{' '}
          <span className="spec-badge badge-approximate">APPROXIMATE</span>,{' '}
          <span className="spec-badge badge-assumed">ASSUMED</span>,{' '}
          <span className="spec-badge badge-computed">COMPUTED</span>, or{' '}
          <span className="spec-badge badge-classified">NOT PUBLICLY DISCLOSED</span>.
        </p>
      </div>
    );
  }

  const stationId = partIdToBraytonStation(content.id);
  const isRightEng = content.id.endsWith('-right');
  const liveCycle =
    stationId !== null
      ? computeBraytonCycle(isRightEng ? engineSim.right : engineSim.left)
      : null;
  const liveStation = liveCycle && stationId ? liveCycle.stations[stationId] : null;

  return (
    <div className="inspector-content">
      <div className="dual-label-bar" data-testid="inspector-dual-labels">
        <span className="dual-label-item">
          <span className="dual-label-key">Existence:</span>
          <span className={`spec-badge ${statusBadgeClass(content.existenceLabel)}`}>
            {statusLabel(content.existenceLabel)}
          </span>
        </span>
        <span className="dual-label-item">
          <span className="dual-label-key">Geometry:</span>
          <span className={`spec-badge ${statusBadgeClass(content.geometryLabel)}`}>
            {statusLabel(content.geometryLabel)}
          </span>
        </span>
      </div>

      <p className="inspector-summary">{content.summary}</p>

      {liveStation && liveCycle && stationId && (
        <section className="inspector-section" data-testid="inspector-brayton-station">
          <h3 className="inspector-section-title">
            SAE ARP755 Station ({liveStation.stationCode} · {liveStation.name})
          </h3>
          <SaeStationDiagram cycle={liveCycle} activeStation={stationId} />
          <div className="spec-list">
            <div className="spec-row">
              <div className="spec-row-top">
                <span className="spec-label">Total Temperature (Tₜ)</span>
                <span className="spec-badge badge-computed">COMPUTED</span>
              </div>
              <div className="spec-value">
                {Math.round(liveStation.totalTempK)} K ({Math.round(liveStation.totalTempC)} °C)
              </div>
              <div className="spec-source">
                Ideal Brayton cycle on ASSUMED inputs (F119 cycle not publicly disclosed)
              </div>
            </div>
            <div className="spec-row">
              <div className="spec-row-top">
                <span className="spec-label">Total Pressure (Pₜ)</span>
                <span className="spec-badge badge-computed">COMPUTED</span>
              </div>
              <div className="spec-value">
                {Math.round(liveStation.totalPressureKpa)} kPa ({liveStation.pressureRatioToAmbient.toFixed(1)}× P₀)
              </div>
              <div className="spec-source">
                Driven by live {isRightEng ? 'ENG 2 (R)' : 'ENG 1 (L)'} spool &amp; throttle state
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="inspector-section">
        <h3 className="inspector-section-title">Role &amp; Function</h3>
        <p className="inspector-text">{content.role}</p>
      </section>

      {content.materials && (
        <section className="inspector-section">
          <h3 className="inspector-section-title">Materials (Public)</h3>
          <p className="inspector-text">{content.materials}</p>
        </section>
      )}

      <section className="inspector-section">
        <h3 className="inspector-section-title">Specifications</h3>
        <div className="spec-list">
          {content.specs.map((spec, idx) => (
            <div key={`${spec.label}-${idx}`} className="spec-row">
              <div className="spec-row-top">
                <span className="spec-label">{spec.label}</span>
                <span className={`spec-badge ${statusBadgeClass(spec.status)}`}>
                  {statusLabel(spec.status)}
                </span>
              </div>
              <div className="spec-value">
                {spec.value}
                {spec.unit ? ` ${spec.unit}` : ''}
              </div>
              <div className="spec-source">
                {spec.source}
                {spec.snippet ? ` — ${formatSnippet(spec.snippet, spec.verbatim)}` : ''}
                {spec.accessed ? ` (accessed ${spec.accessed})` : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="inspector-section">
        <h3 className="inspector-section-title">Sources</h3>
        <ul className="source-list">
          {content.sources.map((src, i) => (
            <li key={i}>
              {src.urlOrLocator.startsWith('http') ? (
                <a href={src.urlOrLocator} target="_blank" rel="noreferrer">
                  {src.title}
                </a>
              ) : (
                <span>
                  {src.title} ({src.urlOrLocator})
                </span>
              )}{' '}
              — {formatSnippet(src.snippet, src.verbatim)} (accessed {src.accessed})
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function InspectorPanel() {
  const { isPhone } = useViewport();
  const showInspector = useExplorerStore((s) => s.showInspector);
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const setShowInspector = useExplorerStore((s) => s.setShowInspector);

  if (!showInspector) return null;

  const content = selectedPartId ? getComponentContent(selectedPartId) : null;
  const title = content ? content.title : 'Part Inspector';
  const kicker = content ? content.category : 'F-22 RAPTOR EXPLORER';

  if (isPhone) {
    return (
      <BottomSheet
        title={title}
        kicker={kicker}
        onClose={() => setShowInspector(false)}
        testId="inspector-panel"
        dataComponentId={selectedPartId ?? undefined}
      >
        <InspectorBody content={content} />
      </BottomSheet>
    );
  }

  return (
    <aside
      className="inspector-panel"
      data-testid="inspector-panel"
      data-component-id={selectedPartId ?? undefined}
    >
      <div className="inspector-header">
        <div>
          <span className="inspector-kicker">{kicker}</span>
          <h2 className="inspector-title">{title}</h2>
        </div>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={() => setShowInspector(false)}
          aria-label="Close inspector"
          data-testid="inspector-close-btn"
        >
          ✕
        </button>
      </div>
      <div className="inspector-scroll">
        <InspectorBody content={content} />
      </div>
    </aside>
  );
}
