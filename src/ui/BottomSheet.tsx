import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useExplorerStore } from '../store/explorerStore.js';
import { useViewport } from './useViewport.js';

interface BottomSheetProps {
  readonly title: string;
  readonly kicker?: string;
  readonly onClose: () => void;
  readonly testId?: string;
  readonly dataComponentId?: string;
  readonly children: ReactNode;
}

/**
 * Responsive mobile panel:
 *  - Phone portrait: swipe-up bottom sheet (reports height to explorerStore).
 *  - Phone landscape: right-side drawer (~40% width, full height; reports width to explorerStore).
 */
export function BottomSheet({
  title,
  kicker,
  onClose,
  testId,
  dataComponentId,
  children,
}: BottomSheetProps) {
  const { isPhoneLandscape } = useViewport();
  const [expanded, setExpanded] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const setBottomSheetHeightPx = useExplorerStore((s) => s.setBottomSheetHeightPx);
  const setRightDrawerWidthPx = useExplorerStore((s) => s.setRightDrawerWidthPx);

  useEffect(() => {
    const updateDims = () => {
      if (!sheetRef.current) return;
      const rect = sheetRef.current.getBoundingClientRect();
      if (isPhoneLandscape) {
        setBottomSheetHeightPx(0);
        setRightDrawerWidthPx(rect.width);
      } else {
        setRightDrawerWidthPx(0);
        setBottomSheetHeightPx(rect.height);
      }
    };
    updateDims();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateDims)
        : null;
    if (ro && sheetRef.current) ro.observe(sheetRef.current);
    return () => {
      ro?.disconnect();
      setBottomSheetHeightPx(0);
      setRightDrawerWidthPx(0);
    };
  }, [isPhoneLandscape, expanded, setBottomSheetHeightPx, setRightDrawerWidthPx]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPhoneLandscape) return;
    startYRef.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startYRef.current === null) return;
    const dy = e.clientY - startYRef.current;
    setDragOffsetY(Math.max(-120, Math.min(260, dy)));
  };

  const handlePointerUp = () => {
    if (startYRef.current === null) return;
    if (dragOffsetY > 65) {
      onClose();
    } else if (dragOffsetY < -45) {
      setExpanded(true);
    } else if (dragOffsetY > 25 && expanded) {
      setExpanded(false);
    }
    startYRef.current = null;
    setDragOffsetY(0);
  };

  return (
    <aside
      ref={sheetRef}
      className={
        isPhoneLandscape
          ? 'right-drawer'
          : `bottom-sheet ${expanded ? 'expanded' : ''}`
      }
      data-testid={testId}
      data-component-id={dataComponentId}
      style={
        !isPhoneLandscape && dragOffsetY !== 0
          ? { transform: `translateY(${Math.max(0, dragOffsetY)}px)`, transition: 'none' }
          : undefined
      }
    >
      {!isPhoneLandscape && (
        <div
          className="sheet-handle-bar"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          aria-label="Drag or tap to resize sheet"
        >
          <span className="sheet-handle-pill" />
        </div>
      )}

      <div className="sheet-header">
        <div className="sheet-title-group">
          {kicker && <span className="sheet-kicker">{kicker}</span>}
          <h2 className="sheet-title">{title}</h2>
        </div>
        <button
          type="button"
          className="sheet-close-btn"
          onClick={onClose}
          aria-label={`Close ${title}`}
          data-testid="sheet-close-btn"
        >
          ✕
        </button>
      </div>

      <div className="sheet-body">{children}</div>
    </aside>
  );
}
