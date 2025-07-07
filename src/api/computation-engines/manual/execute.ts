import { Controller, Execution } from "./controller";

export type { DebugState } from "./debug";
export type { Execution } from "./controller";

export function refresh(ctx: Execution): void {
  Controller.refresh(ctx);
}

export function stepForward(ctx: Execution): void {
  Controller.stepForward(ctx);
}

export function stepBackward(ctx: Execution): void {
  Controller.stepBackward(ctx);
}

export function stepToIndex(
  ctx: Execution,
  varId: string,
  index: number
): void {
  Controller.stepToIndex(ctx, varId, index);
}

export function stepToView(ctx: Execution): void {
  Controller.stepToView(ctx);
}
