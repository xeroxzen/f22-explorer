/**
 * Display-precision formatting helpers ensuring APPROXIMATE and ASSUMED values
 * never display more significant figures than their provenance supports (<= 2 sig figs).
 */

export function roundToSigFigs(value: number, sigFigs = 2): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const exp = Math.floor(Math.log10(abs));
  const factor = 10 ** (sigFigs - 1 - exp);
  return sign * (Math.round(abs * factor) / factor);
}

/**
 * Count the number of significant figures in a formatted numeric string
 * (ignoring leading `~`, commas, signs, and trailing units).
 */
export function countSignificantFigures(formatted: string): number {
  const match = formatted.match(/[0-9][0-9,.]*/);
  if (!match) return 0;
  const raw = match[0].replace(/,/g, '');
  if (Number(raw) === 0) return 1;
  if (raw.includes('.')) {
    const stripped = raw.replace(/^0+\.?0*/, '').replace('.', '');
    return stripped.length;
  }
  // Integer: strip leading and trailing zeros
  const stripped = raw.replace(/^0+/, '').replace(/0+$/, '');
  return Math.max(1, stripped.length);
}

/** Format approximate thrust in lbf with <= 2 significant figures (e.g. "~23,000 lbf"). */
export function formatApproxThrustLbf(lbf: number): string {
  if (lbf < 50) return '~0 lbf';
  const rounded = Math.round(roundToSigFigs(lbf, 2));
  return `~${rounded.toLocaleString('en-US')} lbf`;
}

/** Format approximate thrust in kN with <= 2 significant figures (e.g. "~100 kN", "~7.8 kN"). */
export function formatApproxThrustKn(kn: number): string {
  if (kn < 0.5) return '~0 kN';
  const rounded = roundToSigFigs(kn, 2);
  const str = rounded >= 10 ? String(Math.round(rounded)) : rounded.toFixed(1);
  return `~${str} kN`;
}

/** Format combined approximate thrust string: "~23,000 lbf (~100 kN)". */
export function formatApproxThrustPair(lbf: number, kn: number): string {
  return `${formatApproxThrustLbf(lbf)} (${formatApproxThrustKn(kn)})`;
}
