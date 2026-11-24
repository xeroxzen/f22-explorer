import { getComponentContent } from '../content/registry.js';
import type { ComponentContent, SpecStatus } from '../content/schema.js';
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
    case 'NOT_PUBLICLY_DISCLOSED':
      return 'badge-classified';
  }
}

function statusLabel(status: SpecStatus): string {
  return status === 'NOT_PUBLICLY_DISCLOSED' ? 'NOT PUBLICLY DISCLOSED' : status;
}

function InspectorBody({ content }: { readonly content: ComponentContent | null }) {
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
          <span className="spec-badge badge-assumed">ASSUMED</span>, or{' '}
          <span className="spec-badge badge-classified">NOT PUBLICLY DISCLOSED</span>.
        </p>
      </div>
    );
  }

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
                {spec.snippet ? ` — "${spec.snippet}"` : ''}
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
              — &ldquo;{src.snippet}&rdquo; (accessed {src.accessed})
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
