import { ComputationStore } from "../../store/computation";
import { ExecutionStore } from "../../store/execution";
import { IEnvironment } from "../../types/environment";
import { Controller } from "./controller";

export function refresh(
  code: string,
  environment: IEnvironment | null,
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.refresh(code, environment, executionStore, computationStore);
}

export function stepForward(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepForward(executionStore, computationStore);
}

export function stepBackward(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepBackward(executionStore, computationStore);
}

export function stepToView(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepToView(executionStore, computationStore);
}

export function stepToPrevView(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepToPrevView(executionStore, computationStore);
}

export function stepToNextBlock(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepToNextBlock(executionStore, computationStore);
}

export function stepToPrevBlock(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepToPrevBlock(executionStore, computationStore);
}

export function stepToIndex(
  index: number,
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.stepToIndex(index, executionStore, computationStore);
}
