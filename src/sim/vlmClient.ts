import {
  buildF22VlmMesh,
  factorVlmMesh,
  solveVlm,
  type FactoredVlmSystem,
  type VlmMesh,
  type VlmSolveInput,
  type VlmSolveResult,
} from './vlmSolver.js';

let cachedMesh: VlmMesh | null = null;
let syncFactored: FactoredVlmSystem | null = null;
let lastValidSync: VlmSolveResult | null = null;
let worker: Worker | null = null;
let workerFailed = false;
let reqSeq = 0;
let pendingCallback: ((res: VlmSolveResult) => void) | null = null;
let latestReqId = 0;

export function getF22VlmMesh(): VlmMesh {
  if (!cachedMesh) {
    cachedMesh = buildF22VlmMesh();
  }
  return cachedMesh;
}

function ensureWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./vlmWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<{ type: string; id?: number; result?: VlmSolveResult }>) => {
        if (e.data.type === 'result' && e.data.id === latestReqId && e.data.result) {
          pendingCallback?.(e.data.result);
        }
      };
      worker.onerror = () => {
        workerFailed = true;
        worker?.terminate();
        worker = null;
      };
      worker.postMessage({ type: 'init' });
    } catch {
      workerFailed = true;
      worker = null;
    }
  }
  return worker;
}

/**
 * Solve the VLM right-hand side off the main thread in a Web Worker (with automatic
 * synchronous fallback if Worker is unavailable). Latest-request-wins coalescing
 * keeps slider dragging smooth at 60 FPS.
 */
export function requestVlmSolve(
  input: VlmSolveInput,
  onResult: (result: VlmSolveResult) => void
): void {
  const w = ensureWorker();
  const id = ++reqSeq;
  latestReqId = id;
  pendingCallback = onResult;

  if (w) {
    w.postMessage({ type: 'solve', id, input });
    return;
  }

  // Fallback synchronous solve (LU factored once)
  if (!syncFactored) {
    syncFactored = factorVlmMesh(getF22VlmMesh());
  }
  const res = solveVlm(syncFactored, input, lastValidSync);
  if (res.valid) lastValidSync = res;
  onResult(res);
}
