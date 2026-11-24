import { CONSTANTS_REGISTRY as R } from '../sim/config/registry.js';

/**
 * Pure-TS store geometry dimensions used by WeaponsBaysDetail.tsx and verified
 * against USAF Fact Sheet lengths (within 5%) in tests/geometry-consistency.test.ts.
 */
export interface StoreMeshDimensions {
  readonly id: 'aim120' | 'aim9x' | 'gbu32' | 'gbu39';
  readonly bodyLengthM: number;
  readonly noseLengthM: number;
  readonly tailLengthM: number;
  readonly radiusM: number;
  /** Total rendered axial length (m). */
  readonly renderedLengthM: number;
  /** Sourced USAF Fact Sheet length (m). */
  readonly sourcedLengthM: number;
}

export const RENDERED_STORE_SPECS: Record<
  'aim120' | 'aim9x' | 'gbu32' | 'gbu39',
  StoreMeshDimensions
> = {
  aim120: {
    id: 'aim120',
    bodyLengthM: 3.18,
    noseLengthM: 0.48,
    tailLengthM: 0,
    radiusM: 0.089, // 7 in diameter
    renderedLengthM: 3.18 + 0.48, // 3.66 m
    sourcedLengthM: R.AIM120_LENGTH_M.value,
  },
  aim9x: {
    id: 'aim9x',
    bodyLengthM: 2.956,
    noseLengthM: 0.064, // hemispherical seeker dome radius
    tailLengthM: 0,
    radiusM: 0.064, // 5 in diameter
    renderedLengthM: 2.956 + 0.064, // 3.02 m
    sourcedLengthM: R.AIM9_LENGTH_M.value,
  },
  gbu32: {
    id: 'gbu32',
    bodyLengthM: 1.98,
    noseLengthM: 0.54,
    tailLengthM: 0.52,
    radiusM: 0.178, // 14 in Mk-83 diameter
    renderedLengthM: 1.98 + 0.54 + 0.52, // 3.04 m
    sourcedLengthM: R.GBU32_LENGTH_M.value,
  },
  gbu39: {
    id: 'gbu39',
    bodyLengthM: 1.46,
    noseLengthM: 0.34,
    tailLengthM: 0,
    radiusM: 0.095, // 7.5 in width
    renderedLengthM: 1.46 + 0.34, // 1.80 m
    sourcedLengthM: R.GBU39_LENGTH_M.value,
  },
};

/**
 * Sourced F-22 cockpit display dimensions from Lockheed Martin Code One
 * ("The New Front Office", John Kent, June 15, 2006):
 * - 1 primary reconfigurable MFD: 8 × 8 in (0.2032 × 0.2032 m)
 * - 3 secondary reconfigurable MFDs: 6.5 × 6.5 in (0.1651 × 0.1651 m)
 * - 2 up-front non-reconfigurable displays: 3 × 4 in (0.1016 × 0.0762 m)
 */
export const COCKPIT_DISPLAY_DIMENSIONS_M = {
  primaryMfd: { width: 0.2032, height: 0.2032 },
  secondaryMfd: { width: 0.1651, height: 0.1651 },
  upFrontDisplay: { width: 0.1016, height: 0.0762 },
} as const;
