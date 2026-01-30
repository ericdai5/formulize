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

export function toStep(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.toStep(executionStore, computationStore);
}

export function toPrevView(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.toPrevView(executionStore, computationStore);
}

export function toNextBlock(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.toNextBlock(executionStore, computationStore);
}

export function toPrevBlock(
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.toPrevBlock(executionStore, computationStore);
}

export function toIndex(
  index: number,
  executionStore?: ExecutionStore,
  computationStore?: ComputationStore
): void {
  if (!executionStore || !computationStore) return;
  Controller.toIndex(index, executionStore, computationStore);
}
