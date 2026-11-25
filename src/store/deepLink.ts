import { getComponentContent } from '../content/registry.js';
import {
  useExplorerStore,
  type CameraPresetId,
  type WeaponsLoadoutId,
} from '../store/explorerStore.js';

export type DeepLinkEnginePreset = 'off' | 'idle' | 'mil' | 'ab';

export interface DeepLinkPayload {
  readonly cam: CameraPresetId;
  readonly part: string | null;
  readonly explode: number;
  readonly canopy: boolean;
  readonly mainBay: boolean;
  readonly sideBays: boolean;
  readonly loadout: WeaponsLoadoutId;
  readonly gear: boolean;
  /** Steady-state RUNNING regime only — deep links never restore mid-start sequence. */
  readonly engine: DeepLinkEnginePreset;
}

const VALID_CAMS: readonly CameraPresetId[] = [
  'three-quarter',
  'front',
  'top',
  'side',
  'rear',
  'cockpit',
  'bays',
];

const VALID_LOADOUTS: readonly WeaponsLoadoutId[] = ['air-to-air', 'jdam', 'sdb'];
const VALID_ENGINES: readonly DeepLinkEnginePreset[] = ['off', 'idle', 'mil', 'ab'];

export function encodeExplorerStateToQuery(payload: DeepLinkPayload): string {
  const params = new URLSearchParams();
  params.set('cam', payload.cam);
  if (payload.part) params.set('part', payload.part);
  if (payload.explode > 0.01) params.set('explode', String(Math.round(payload.explode * 100)));
  if (payload.canopy) params.set('canopy', '1');
  if (payload.mainBay) params.set('mainBay', '1');
  if (payload.sideBays) params.set('sideBays', '1');
  if (payload.loadout !== 'air-to-air') params.set('loadout', payload.loadout);
  if (!payload.gear) params.set('gear', '0');
  if (payload.engine !== 'off') params.set('engine', payload.engine);
  return `?${params.toString()}`;
}

export function parseExplorerQuery(search: string): Partial<DeepLinkPayload> {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const out: {
    cam?: CameraPresetId;
    part?: string | null;
    explode?: number;
    canopy?: boolean;
    mainBay?: boolean;
    sideBays?: boolean;
    loadout?: WeaponsLoadoutId;
    gear?: boolean;
    engine?: DeepLinkEnginePreset;
  } = {};

  const cam = params.get('cam');
  if (cam && (VALID_CAMS as readonly string[]).includes(cam)) {
    out.cam = cam as CameraPresetId;
  }

  const part = params.get('part');
  if (part && getComponentContent(part)) {
    out.part = part;
  }

  const explodeStr = params.get('explode');
  if (explodeStr !== null) {
    const pct = Number(explodeStr);
    if (Number.isFinite(pct)) {
      out.explode = Math.max(0, Math.min(100, pct)) / 100;
    }
  }

  if (params.has('canopy')) out.canopy = params.get('canopy') === '1';
  if (params.has('mainBay')) out.mainBay = params.get('mainBay') === '1';
  if (params.has('sideBays')) out.sideBays = params.get('sideBays') === '1';

  const loadout = params.get('loadout');
  if (loadout && (VALID_LOADOUTS as readonly string[]).includes(loadout)) {
    out.loadout = loadout as WeaponsLoadoutId;
  }

  if (params.has('gear')) out.gear = params.get('gear') !== '0';

  // Engine state: only allow steady-state RUNNING regimes (idle/mil/ab) or off — never mid-start!
  const engine = params.get('engine');
  if (engine && (VALID_ENGINES as readonly string[]).includes(engine)) {
    out.engine = engine as DeepLinkEnginePreset;
  }

  return out;
}

export function buildCurrentShareUrl(): string {
  const s = useExplorerStore.getState();
  let engine: DeepLinkEnginePreset = 'off';
  if (s.engineSim.phase === 'RUNNING') {
    engine = s.engineSim.left.afterburnerOn
      ? 'ab'
      : s.engineSim.left.regime === 'MIL'
        ? 'mil'
        : 'idle';
  }
  const query = encodeExplorerStateToQuery({
    cam: s.cameraPreset,
    part: s.selectedPartId,
    explode: s.explodeFactor,
    canopy: s.canopyOpen,
    mainBay: s.mainBayOpen,
    sideBays: s.sideBaysOpen,
    loadout: s.weaponsLoadout,
    gear: s.gearDeployed,
    engine,
  });
  if (typeof window === 'undefined') return query;
  return `${window.location.origin}${window.location.pathname}${query}`;
}

export function applyDeepLinkFromUrl(search: string): boolean {
  if (!search || search === '?') return false;
  const parsed = parseExplorerQuery(search);
  if (Object.keys(parsed).length === 0) return false;

  const s = useExplorerStore.getState();
  if (parsed.explode !== undefined) s.setExplodeFactor(parsed.explode);
  if (parsed.canopy !== undefined) s.setCanopyOpen(parsed.canopy);
  if (parsed.mainBay !== undefined) s.setMainBayOpen(parsed.mainBay);
  if (parsed.sideBays !== undefined) s.setSideBaysOpen(parsed.sideBays);
  if (parsed.loadout !== undefined) s.setWeaponsLoadout(parsed.loadout);
  if (parsed.gear !== undefined) s.setGearDeployed(parsed.gear);
  if (parsed.engine !== undefined && parsed.engine !== 'off') {
    s.setEnginePreset(parsed.engine);
  }
  if (parsed.part) {
    s.selectPart(parsed.part);
  }
  if (parsed.cam) {
    if (parsed.cam === 'cockpit') {
      s.setActiveMode('cockpit', false);
      s.setModePanelOpen(false);
    } else if (parsed.cam === 'bays') {
      s.setActiveMode('weapons', false);
    }
    s.setCameraPreset(parsed.cam);
  }
  return true;
}
