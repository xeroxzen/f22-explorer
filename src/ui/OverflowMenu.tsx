import { useState } from 'react';
import { GUIDED_TOURS } from '../content/tours.js';
import { buildCurrentShareUrl } from '../store/deepLink.js';
import {
  useExplorerStore,
  type QualityTier,
} from '../store/explorerStore.js';

const QUALITY_TIERS: readonly QualityTier[] = ['low', 'med', 'high'];

export function OverflowMenu() {
  const showOverflowMenu = useExplorerStore((s) => s.showOverflowMenu);
  const qualityTier = useExplorerStore((s) => s.qualityTier);
  const soundMuted = useExplorerStore((s) => s.soundMuted);
  const savedTourProgress = useExplorerStore((s) => s.savedTourProgress);

  const setShowOverflowMenu = useExplorerStore((s) => s.setShowOverflowMenu);
  const setQualityTier = useExplorerStore((s) => s.setQualityTier);
  const toggleSoundMute = useExplorerStore((s) => s.toggleSoundMute);
  const startTour = useExplorerStore((s) => s.startTour);
  const [copied, setCopied] = useState(false);

  if (!showOverflowMenu) return null;

  return (
    <div
      className="overflow-menu"
      data-testid="overflow-menu"
      role="dialog"
      aria-label="Settings, tours, share, and credits"
    >
      <div className="overflow-head">
        <span className="inspector-kicker">SETTINGS &amp; TOOLS</span>
        <button
          type="button"
          className="inspector-close-btn"
          onClick={() => setShowOverflowMenu(false)}
          aria-label="Close menu"
          data-testid="overflow-close-btn"
        >
          ✕
        </button>
      </div>

      {/* Graphics Quality */}
      <div className="overflow-section">
        <div className="overflow-lbl">Graphics Quality</div>
        <div className="segmented" role="group" aria-label="Graphics quality">
          {QUALITY_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              className={`seg-btn ${qualityTier === tier ? 'active' : ''}`}
              onClick={() => setQualityTier(tier)}
              data-testid={`quality-${tier}`}
            >
              {tier.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Audio & Share */}
      <div className="overflow-section">
        <div className="overflow-row">
          <button
            type="button"
            className={`mini-btn ${!soundMuted ? 'active' : ''}`}
            onClick={toggleSoundMute}
            data-testid="sound-toggle-btn"
            aria-pressed={!soundMuted}
          >
            {soundMuted ? 'Audio: Muted' : 'Audio: On'}
          </button>
          <button
            type="button"
            className={`mini-btn ${copied ? 'active' : ''}`}
            onClick={() => {
              const url = buildCurrentShareUrl();
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', url);
                if (navigator.clipboard?.writeText) {
                  void navigator.clipboard.writeText(url);
                }
              }
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            }}
            data-testid="share-link-btn"
          >
            {copied ? 'Link Copied' : 'Share View'}
          </button>
        </div>
      </div>

      {/* Guided Tours */}
      <div className="overflow-section">
        <div className="overflow-lbl">Guided Tours</div>
        <div className="overflow-tours">
          {GUIDED_TOURS.map((tour) => {
            const savedIdx = savedTourProgress[tour.id] ?? 0;
            const canResume = savedIdx > 0 && savedIdx < tour.steps.length;
            return (
              <div key={tour.id} className="overflow-tour-row">
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => startTour(tour.id, 0)}
                  data-testid={`start-tour-${tour.id}`}
                >
                  {tour.title} ({tour.steps.length})
                </button>
                {canResume && (
                  <button
                    type="button"
                    className="mini-btn active"
                    onClick={() => startTour(tour.id, savedIdx)}
                    data-testid={`resume-tour-${tour.id}`}
                  >
                    Resume #{savedIdx + 1}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Credits & Licenses (CC-BY 4.0 required attribution) */}
      <div className="overflow-credits" data-testid="credits-panel">
        <div className="overflow-lbl">Credits &amp; Licenses</div>
        <p className="credits-line">
          <strong>F22 Raptor FREE</strong> by <strong>NLM (@NLM-Group)</strong> —{' '}
          <a
            href="https://sketchfab.com/3d-models/f22-raptor-free-2a64abf0866a405c865466c7642ca689"
            target="_blank"
            rel="noreferrer"
          >
            Sketchfab source
          </a>{' '}
          ·{' '}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC-BY 4.0
          </a>{' '}
          — modified (split into parts, re-materialed).
        </p>
        <p className="credits-line">
          HDRIs: <em>Aircraft Workshop 01</em> &amp; <em>Kloofendal 48d PureSky</em> by{' '}
          <a href="https://polyhaven.com/" target="_blank" rel="noreferrer">
            Poly Haven
          </a>{' '}
          (CC0 1.0).
        </p>
      </div>
    </div>
  );
}
