import { IEnvironment } from "../../types/environment";
import { Controller } from "./controller";

export function refresh(code: string, environment: IEnvironment | null): void {
  Controller.refresh(code, environment);
}

export function stepForward(): void {
  Controller.stepForward();
}

export function stepBackward(): void {
  Controller.stepBackward();
}

export function stepToIndex(varId: string, index: number): void {
  Controller.stepToIndex(varId, index);
}

export function stepToView(): void {
  Controller.stepToView();
}

export function stepToNextBlock(): void {
  Controller.stepToNextBlock();
}

export function stepToPrevBlock(): void {
  Controller.stepToPrevBlock();
}
