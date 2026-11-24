import type { CameraPresetId, WeaponsLoadoutId } from '../store/explorerStore.js';

export type TourId = 'anatomy' | 'cockpit' | 'engine-start';

export interface TourStep {
  readonly id: string;
  readonly title: string;
  /** References a validated ComponentContent ID in src/content/parts/*.json. */
  readonly partId: string;
  readonly focusNote: string;
  readonly cameraPreset: CameraPresetId;
  readonly explodeFactor?: number;
  readonly canopyOpen?: boolean;
  readonly mainBayOpen?: boolean;
  readonly sideBaysOpen?: boolean;
  readonly weaponsLoadout?: WeaponsLoadoutId;
  /** Optional real engine simulation action for the Engine Start guided tour. */
  readonly engineAction?:
    | 'off'
    | 'start-apu'
    | 'advance-eng1-motor'
    | 'advance-eng1-idle'
    | 'advance-both-idle'
    | 'throttle-mil'
    | 'throttle-ab';
}

export interface GuidedTour {
  readonly id: TourId;
  readonly title: string;
  readonly subtitle: string;
  readonly steps: readonly TourStep[];
}

export const GUIDED_TOURS: readonly GuidedTour[] = [
  {
    id: 'anatomy',
    title: 'Anatomy',
    subtitle: 'Exterior stealth shaping → internal bays → exploded systems',
    steps: [
      {
        id: 'anat-1',
        title: 'Airframe Envelope & Stealth Shaping',
        partId: 'f22-airframe',
        focusNote:
          'Overview of the 18.92 m × 13.56 m × 5.08 m twin-engine air superiority platform (third-party CC-BY 4.0 exterior model, APPROXIMATE — not verified against drawings).',
        cameraPreset: 'three-quarter',
        explodeFactor: 0,
        canopyOpen: false,
        mainBayOpen: false,
        sideBaysOpen: false,
        engineAction: 'off',
      },
      {
        id: 'anat-2',
        title: 'Chined Radome & Forward Nose',
        partId: 'radome',
        focusNote:
          'Faceted chined nose housing the active electronically scanned array radar aperture (internal performance classified).',
        cameraPreset: 'front',
        explodeFactor: 0,
      },
      {
        id: 'anat-3',
        title: 'Clipped-Diamond Wing Planform',
        partId: 'wing-left',
        focusNote:
          '42° leading-edge sweep and forward-swept trailing edge aligned with tail edges for low-observable planform geometry.',
        cameraPreset: 'top',
        explodeFactor: 0,
      },
      {
        id: 'anat-4',
        title: 'Internal Main & Side Weapons Bays',
        partId: 'main-weapons-bay',
        focusNote:
          'Carries air-to-air and precision strike ordnance internally to preserve low-observable aerodynamics.',
        cameraPreset: 'bays',
        explodeFactor: 0,
        mainBayOpen: true,
        sideBaysOpen: true,
        weaponsLoadout: 'air-to-air',
      },
      {
        id: 'anat-5',
        title: 'Twin F119-PW-100 Propulsion Cores',
        partId: 'engine-f119-left',
        focusNote:
          'Exploded view reveals the twin 35,000-lbf class low-bypass afterburning turbofans housed in the aft fuselage.',
        cameraPreset: 'three-quarter',
        explodeFactor: 0.65,
        mainBayOpen: false,
        sideBaysOpen: false,
      },
      {
        id: 'anat-6',
        title: '28° Canted Twin Vertical Stabilizers',
        partId: 'vertical-stabilizer-left',
        focusNote:
          'Outward-canted twin tails combine yaw authority and split-rudder speedbrake capability with radar deflection.',
        cameraPreset: 'rear',
        explodeFactor: 0.35,
      },
      {
        id: 'anat-7',
        title: 'Full Systems Disassembly',
        partId: 'f22-airframe',
        focusNote:
          '100% directional system explosion groups airframe, propulsion, weapons, landing gear, and avionics cleanly by color.',
        cameraPreset: 'three-quarter',
        explodeFactor: 1.0,
      },
    ],
  },
  {
    id: 'cockpit',
    title: 'Cockpit',
    subtitle: 'Canopy, Code One sourced 6-LCD layout, HUD, HOTAS & ACES II',
    steps: [
      {
        id: 'cockpit-1',
        title: 'One-Piece Frameless Gold Canopy',
        partId: 'canopy',
        focusNote:
          'Aft-hinged polycarbonate canopy with metallic stealth coating; opens upward for pilot entry.',
        cameraPreset: 'three-quarter',
        explodeFactor: 0,
        canopyOpen: true,
        engineAction: 'off',
      },
      {
        id: 'cockpit-2',
        title: 'All-Glass 6-LCD Instrument Panel & HUD',
        partId: 'cockpit-displays-hud',
        focusNote:
          'Sized from Lockheed Martin Code One: one 8×8 in primary MFD, three 6.5×6.5 in secondary MFDs, two 3×4 in UFDs, ICP, and wide-angle HUD.',
        cameraPreset: 'cockpit',
        explodeFactor: 0,
        canopyOpen: false,
      },
      {
        id: 'cockpit-3',
        title: 'Generic Educational Symbology Policy',
        partId: 'cockpit-displays-hud',
        focusNote:
          'Operational tactical symbology is classified; every display shows clearly labeled generic educational schematics.',
        cameraPreset: 'cockpit',
        explodeFactor: 0,
      },
      {
        id: 'cockpit-4',
        title: 'Hands-On Throttle and Stick (HOTAS)',
        partId: 'hotas-controls',
        focusNote:
          'Right-hand side-stick controller and left-hand dual F119 throttle levers animate directly with simulator inputs.',
        cameraPreset: 'cockpit',
        explodeFactor: 0,
      },
      {
        id: 'cockpit-5',
        title: 'ACES II Zero-Zero Ejection Seat',
        partId: 'aces-ii-seat',
        focusNote:
          'Reclined crew escape seat designed for zero-altitude, zero-airspeed recovery.',
        cameraPreset: 'side',
        explodeFactor: 0.45,
        canopyOpen: true,
      },
      {
        id: 'cockpit-6',
        title: 'Pressurized Cockpit Tub Structure',
        partId: 'cockpit-tub',
        focusNote:
          'Forward fuselage structural tub integrating life support, consoles, and environmental control.',
        cameraPreset: 'three-quarter',
        explodeFactor: 0.55,
      },
    ],
  },
  {
    id: 'engine-start',
    title: 'Engine Start',
    subtitle: 'Live F119 state machine: Battery → APU → AMAD → Idle → Mil → AB',
    steps: [
      {
        id: 'eng-1',
        title: 'Outdoor Run-Up Pad: Battery & APU Start',
        partId: 'apu-bay',
        focusNote:
          'Relocates outdoors (no afterburner indoors) and energizes the battery bus and APU for autonomous start.',
        cameraPreset: 'rear',
        explodeFactor: 0,
        canopyOpen: false,
        mainBayOpen: false,
        sideBaysOpen: false,
        engineAction: 'start-apu',
      },
      {
        id: 'eng-2',
        title: 'Engine 1 (L) AMAD Gearbox Motoring',
        partId: 'apu-bay',
        focusNote:
          'The APU drives the Left F119-PW-100 core via the Airframe-Mounted Accessory Drive (AMAD) gearbox to motoring speed.',
        cameraPreset: 'rear',
        explodeFactor: 0,
        engineAction: 'advance-eng1-motor',
      },
      {
        id: 'eng-3',
        title: 'Engine 1 Light-Off → Engine 2 Motoring',
        partId: 'engine-f119-left',
        focusNote:
          'Left F119 ignites and spools to self-sustaining ground idle while the AMAD begins motoring the Right F119.',
        cameraPreset: 'rear',
        explodeFactor: 0,
        engineAction: 'advance-eng1-idle',
      },
      {
        id: 'eng-4',
        title: 'Both F119 Engines Online at Ground Idle',
        partId: 'engine-f119-right',
        focusNote:
          'Both twin turbofans stabilize at ground idle (~62% N2 ASSUMED); APU disengages automatically and throttle unlocks.',
        cameraPreset: 'rear',
        explodeFactor: 0,
        engineAction: 'advance-both-idle',
      },
      {
        id: 'eng-5',
        title: 'Military Dry Power (75% Throttle)',
        partId: 'nozzle-2d-left',
        focusNote:
          'Full dry thrust (~23,000 lbf / ~100 kN APPROX per engine) with heat-shimmer wake and expanded 2D convergent-divergent nozzles.',
        cameraPreset: 'rear',
        explodeFactor: 0,
        engineAction: 'throttle-mil',
      },
      {
        id: 'eng-6',
        title: 'Maximum Afterburner & Mach Shock Diamonds',
        partId: 'nozzle-2d-right',
        focusNote:
          'Afterburner engages (~35,000 lbf class SOURCED): rectangular 2D nozzles open fully with translucent flame and discrete shock diamonds (visual approx, not CFD).',
        cameraPreset: 'rear',
        explodeFactor: 0,
        engineAction: 'throttle-ab',
      },
      {
        id: 'eng-7',
        title: 'Live Cockpit Engine MFD During Afterburner',
        partId: 'cockpit-displays-hud',
        focusNote:
          'Step into the seat to see the Right Secondary MFD displaying live N2%, thrust %, nozzle opening, and AB ON — driven by the same simulation state.',
        cameraPreset: 'cockpit',
        explodeFactor: 0,
        engineAction: 'throttle-ab',
      },
    ],
  },
];

export function getGuidedTour(id: TourId): GuidedTour {
  return GUIDED_TOURS.find((t) => t.id === id) ?? GUIDED_TOURS[0]!;
}
