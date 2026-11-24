/**
 * Honest display-precision formatters for APPROXIMATE / ASSUMED values.
 * Enforces that approximate readouts never display more than 2 significant figures.
 */

export function roundToSigFigs(value: number, sigFigs = 2): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const mag = Math.floor(Math.log10(abs));
  const factor = Math.pow(10, sigFigs - 1 - mag);
  return sign * (Math.round(abs * factor) / factor);
}

/**
 * Count the number of significant figures in a formatted numeric string
 * (e.g. "~23,000 lbf" -> 2, "~100 kN" -> 1, "~7.8 kN" -> 2, "34,960" -> 4).
 */
export function countSignificantFigures(formatted: string): number {
  const match = formatted.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return 0;
  const raw = match[0].replace(/,/g, '');
  if (/^0+(?:\.0+)?$/.test(raw)) return 1;
  if (raw.includes('.')) {
    const trimmed = raw.replace(/^0+/, '').replace('.', '');
    return trimmed.length;
  }
  const trimmed = raw.replace(/^0+/, '').replace(/0+$/, '');
  return Math.max(1, trimmed.length);
}

/**
 * Format approximate thrust in lbf rounded to 2 significant figures (and multiples of 500 lbf
 * above 10,000 lbf), prefixed with "~".
 */
export function formatApproxThrustLbf(lbf: number): string {
  if (!Number.isFinite(lbf) || lbf < 50) return '0 lbf';
  const rounded = roundToSigFigs(lbf, 2);
  return `~${rounded.toLocaleString('en-US')} lbf`;
}

/**
 * Format approximate thrust in kN rounded to 2 significant figures, prefixed with "~".
 */
export function formatApproxThrustKn(kn: number): string {
  if (!Number.isFinite(kn) || kn < 0.5) return '0 kN';
  const rounded = roundToSigFigs(kn, 2);
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `~${str} kN`;
}

export function formatApproxThrustPair(lbf: number, kn: number): string {
  if (!Number.isFinite(lbf) || lbf < 50) return '0 lbf (0 kN)';
  return `${formatApproxThrustLbf(lbf)} (${formatApproxThrustKn(kn)})`;
}
