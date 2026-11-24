import { ALL_COMPONENTS } from '../content/registry.js';
import { useExplorerStore } from '../store/explorerStore.js';
import { BottomSheet } from './BottomSheet.js';
import { useViewport } from './useViewport.js';

function PartTreeBody({ onPickPart }: { readonly onPickPart?: () => void }) {
  const selectedPartId = useExplorerStore((s) => s.selectedPartId);
  const hiddenPartIds = useExplorerStore((s) => s.hiddenPartIds);
  const isolatedPartId = useExplorerStore((s) => s.isolatedPartId);
  const selectPart = useExplorerStore((s) => s.selectPart);
  const togglePartHidden = useExplorerStore((s) => s.togglePartHidden);
  const isolatePart = useExplorerStore((s) => s.isolatePart);
  const showAllParts = useExplorerStore((s) => s.showAllParts);

  const grouped = new Map<string, typeof ALL_COMPONENTS[number][]>();
  for (const comp of ALL_COMPONENTS) {
    if (comp.parentId === null) continue;
    const list = grouped.get(comp.category) ?? [];
    list.push(comp);
    grouped.set(comp.category, list);
  }

  return (
    <div className="part-tree-body">
      <div className="part-tree-actions">
        <button
          type="button"
          className="mini-btn"
          onClick={showAllParts}
          data-testid="show-all-parts-btn"
        >
          Show All ({ALL_COMPONENTS.length - 1})
        </button>
        {selectedPartId && selectedPartId !== 'f22-airframe' && (
          <button
            type="button"
            className={`mini-btn ${isolatedPartId === selectedPartId ? 'active' : ''}`}
            onClick={() => isolatePart(selectedPartId)}
            data-testid="isolate-part-btn"
          >
            {isolatedPartId === selectedPartId ? 'Un-isolate' : 'Isolate Selected'}
          </button>
        )}
      </div>

      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className="tree-group">
          <div className="tree-group-title">{category}</div>
          {items.map((item) => {
            const isSelected = selectedPartId === item.id;
            const isHidden =
              hiddenPartIds.includes(item.id) ||
              (isolatedPartId !== null && isolatedPartId !== item.id);
            return (
              <div
                key={item.id}
                className={`tree-row ${isSelected ? 'selected' : ''} ${isHidden ? 'dimmed' : ''}`}
              >
                <button
                  type="button"
                  className="tree-select-btn"
                  onClick={() => {
                    selectPart(item.id);
                    onPickPart?.();
                  }}
                  data-testid={`tree-part-${item.id}`}
                >
                  {item.title}
                </button>
                <button
                  type="button"
                  className="tree-vis-btn"
                  onClick={() => togglePartHidden(item.id)}
                  title={isHidden ? 'Show part' : 'Hide part'}
                  aria-label={isHidden ? `Show ${item.title}` : `Hide ${item.title}`}
                >
                  {isHidden ? '○' : '●'}
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function PartTreePanel() {
  const { isPhone } = useViewport();
  const showPartTree = useExplorerStore((s) => s.showPartTree);
  const setShowPartTree = useExplorerStore((s) => s.setShowPartTree);

  if (!showPartTree) return null;

  if (isPhone) {
    return (
      <BottomSheet
        title="Part Tree (44 Parts)"
        kicker="AIRFRAME OUTLINE"
        onClose={() => setShowPartTree(false)}
        testId="part-tree-panel"
      >
        <PartTreeBody onPickPart={() => setShowPartTree(false)} />
      </BottomSheet>
    );
  }

  return (
    <aside className="part-tree-panel" data-testid="part-tree-panel">
      <div className="inspector-header">
        <div>
          <span className="inspector-kicker">AIRFRAME OUTLINE</span>
          <h2 className="inspector-title">Part Tree ({ALL_COMPONENTS.length - 1})</h2>
        </div>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={() => setShowPartTree(false)}
          aria-label="Close part tree"
          data-testid="part-tree-close-btn"
        >
          ✕
        </button>
      </div>
      <div className="inspector-scroll">
        <PartTreeBody />
      </div>
    </aside>
  );
}
