/**
 * Simple API for sampling interactive lines, points, and surfaces.
 * Works automatically inside a Provider - no setup needed.
 *
 * Usage:
 * ```typescript
 * import { sample2DLine, sample2DPoint } from "delta-dsl";
 *
 * // Inside a component within Provider:
 * const linePoints = sample2DLine("w_t", [0, 10], 100, "loss");
 * const point = sample2DPoint("current");
 * ```
 */

import type { ComputationStore } from "../../store/computation";
import type { DataPoint } from "./graph-2d";

export interface DataPoint3D {
  x: number;
  y: number;
  z: number;
}

export interface LineSampleConfig {
  sampleId: string;
  parameter: string;
  range?: [number, number];
  samples?: number;
}

export interface PointSampleConfig {
  sampleId: string;
}

export interface SurfaceSampleConfig {
  sampleId: string;
  parameters: [string, string];
  ranges?: [[number, number], [number, number]];
  samples?: number;
}

// Module-level store reference - set automatically by Provider
let currentStore: ComputationStore | null = null;

/**
 * Called by Provider to set the current computation store.
 * Users don't need to call this directly.
 */
export function setCurrentStore(store: ComputationStore | null): void {
  currentStore = store;
}

// 2D Functions

export function sample2DLine(
  parameter: string,
  range: [number, number],
  samples: number,
  sampleId: string
): DataPoint[] {
  if (!currentStore) return [];
  return currentStore.sample2DLine(parameter, range, samples, sampleId);
}

export function sample2DPoint(sampleId: string): DataPoint | null {
  if (!currentStore) return null;
  return currentStore.sample2DPoint(sampleId);
}

// 3D Functions

export function sample3DLine(
  parameter: string,
  range: [number, number],
  samples: number,
  sampleId: string
): DataPoint3D[] {
  if (!currentStore) return [];
  return currentStore.sample3DLine(parameter, range, samples, sampleId);
}

export function sample3DPoint(sampleId: string): DataPoint3D | null {
  if (!currentStore) return null;
  return currentStore.sample3DPoint(sampleId);
}

export function sampleSurface(
  parameters: [string, string],
  ranges: [[number, number], [number, number]],
  samples: number,
  sampleId: string
): DataPoint3D[] {
  if (!currentStore) return [];
  return currentStore.sampleSurface(parameters, ranges, samples, sampleId);
}

// Helper to get variable range from store
export function getVariableRange(parameter: string): [number, number] {
  return currentStore?.variables.get(parameter)?.range ?? [-10, 10];
}
