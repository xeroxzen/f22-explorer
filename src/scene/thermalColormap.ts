/**
 * Perceptually uniform Inferno colormap (matplotlib standard LUT)
 * mapped across F119 Brayton cycle temperatures: 280 K (7 °C) -> 2200 K (1927 °C).
 */
export const THERMAL_MIN_K = 280;
export const THERMAL_MAX_K = 2200;

const INFERNO_STOPS: readonly (readonly [number, number, number])[] = [
  [0, 0, 4],
  [27, 12, 65],
  [74, 12, 107],
  [120, 28, 109],
  [165, 44, 96],
  [207, 68, 70],
  [237, 105, 37],
  [251, 155, 6],
  [252, 255, 164],
];

export const INFERNO_CSS_GRADIENT =
  'linear-gradient(90deg, #000004 0%, #1b0c41 12.5%, #4a0c6b 25%, #781c6d 37.5%, #a52c60 50%, #cf4446 62.5%, #ed6925 75%, #fb9b06 87.5%, #fcffa4 100%)';

function toHex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0');
}

export function temperatureToInfernoHex(
  tempK: number,
  minK = THERMAL_MIN_K,
  maxK = THERMAL_MAX_K
): string {
  const t = Math.max(0, Math.min(1, (tempK - minK) / Math.max(1, maxK - minK)));
  const scaled = t * (INFERNO_STOPS.length - 1);
  const idx = Math.min(INFERNO_STOPS.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  const a = INFERNO_STOPS[idx]!;
  const b = INFERNO_STOPS[idx + 1]!;
  const r = a[0] + (b[0] - a[0]) * frac;
  const g = a[1] + (b[1] - a[1]) * frac;
  const bl = a[2] + (b[2] - a[2]) * frac;
  return `#${toHex2(r)}${toHex2(g)}${toHex2(bl)}`;
}
