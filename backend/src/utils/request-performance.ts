import { performance } from "node:perf_hooks";

import type { Request } from "express";

const REQUEST_PERF_FLAG = "SCHOOLS_PERF_DEBUG";
const REQUEST_PERF_KEY = "__requestPerformance";

type PerformanceMarks = Record<string, number>;

type RequestPerformanceState = {
  startedAt: number;
  marks: PerformanceMarks;
};

type PerformanceAwareRequest = Request & {
  [REQUEST_PERF_KEY]?: RequestPerformanceState;
};

function isEnabled(): boolean {
  return process.env[REQUEST_PERF_FLAG] === "true";
}

function getState(req: Request): RequestPerformanceState | null {
  if (!isEnabled()) {
    return null;
  }

  const performanceReq = req as PerformanceAwareRequest;

  if (!performanceReq[REQUEST_PERF_KEY]) {
    performanceReq[REQUEST_PERF_KEY] = {
      startedAt: performance.now(),
      marks: {},
    };
  }

  return performanceReq[REQUEST_PERF_KEY] ?? null;
}

export function markRequestPerformance(req: Request, label: string, durationMs: number): void {
  const state = getState(req);

  if (!state) {
    return;
  }

  state.marks[label] = Number(durationMs.toFixed(2));
}

export function logRequestPerformance(
  req: Request,
  details: Record<string, number | string | boolean | null | undefined> = {},
): void {
  const state = getState(req);

  if (!state) {
    return;
  }

  const totalMs = Number((performance.now() - state.startedAt).toFixed(2));

  console.info("[schools.perf]", {
    method: req.method,
    path: req.originalUrl,
    totalMs,
    ...state.marks,
    ...details,
  });
}

