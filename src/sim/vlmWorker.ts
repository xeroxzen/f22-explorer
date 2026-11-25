import {
  buildF22VlmMesh,
  factorVlmMesh,
  solveVlm,
  type FactoredVlmSystem,
  type VlmSolveInput,
  type VlmSolveResult,
} from './vlmSolver.js';

type WorkerRequest =
  | { readonly type: 'init'; readonly nWingSpan?: number; readonly nWingChord?: number }
  | { readonly type: 'solve'; readonly id: number; readonly input: VlmSolveInput };

let factored: FactoredVlmSystem | null = null;
let lastValid: VlmSolveResult | null = null;

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    const mesh = buildF22VlmMesh(msg.nWingSpan, msg.nWingChord);
    factored = factorVlmMesh(mesh);
    lastValid = null;
    self.postMessage({
      type: 'ready',
      panelCount: factored.n,
      factorTimeMs: factored.factorTimeMs,
    });
    return;
  }
  if (msg.type === 'solve') {
    if (!factored) {
      factored = factorVlmMesh(buildF22VlmMesh());
    }
    const result = solveVlm(factored, msg.input, lastValid);
    if (result.valid) lastValid = result;
    self.postMessage({ type: 'result', id: msg.id, result });
  }
};
