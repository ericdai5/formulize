import { action, computed, observable, reaction } from "mobx";
import { types } from "mobx-state-tree";

import { AugmentedFormula, RenderSpec, updateFormula } from "./FormulaTree";

class FormulaStore {
  @observable accessor renderSpec: RenderSpec | null = null;
  @observable accessor augmentedFormula: AugmentedFormula =
    new AugmentedFormula([]);

  @action
  updateFormula(newFormula: AugmentedFormula) {
    const { renderSpec } = updateFormula(newFormula);
    this.renderSpec = renderSpec;
    this.augmentedFormula = newFormula;
    selectionStore.clearTargets();
  }

  @computed
  get latexWithStyling() {
    return this.augmentedFormula.toLatex("noid");
  }
}
export const formulaStore = new FormulaStore();

class SelectionStore {
  @observable accessor selected: string[] = [];
  @observable accessor targets: Map<
    string,
    { id: string; left: number; top: number; width: number; height: number }
  > = new Map();
  @observable accessor selectionRect: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null = null;

  targetRefs: Map<string, HTMLElement> = new Map();

  @action
  addTarget(id: string, ref: HTMLElement) {
    this.targetRefs.set(id, ref);
  }

  @action
  removeTarget(id: string) {
    this.targetRefs.delete(id);
  }

  @action
  clearTargets() {
    this.targetRefs.clear();
    this.targets.clear();
    this.selected.clear();
  }

  @action
  startDragSelection(x: number, y: number) {
    this.selectionRect = {
      x1: x,
      y1: y,
      x2: x,
      y2: y,
    };
  }

  @action
  updateDragSelection(x2: number, y2: number) {
    if (!this.selectionRect) {
      return;
    }
    this.selectionRect.x2 = x2;
    this.selectionRect.y2 = y2;
  }

  @action
  stopDragSelection() {
    this.currentlyDragged.forEach((id) => {
      if (!this.selected.includes(id)) {
        this.selected.push(id);
      }
    });
    this.selectionRect = null;
  }

  @action
  clearSelection() {
    this.selected = [];
  }

  @action
  updateTargets() {
    for (const [id, ref] of this.targetRefs) {
      const { left, top, width, height } = ref.getBoundingClientRect();
      this.targets.set(id, { id, left, top, width, height });
    }
  }

  @action
  toggle(id: string) {
    if (this.selected.includes(id)) {
      this.selected = this.selected.filter((selectedId) => selectedId !== id);
    } else {
      this.selected.push(id);
    }
  }

  @computed
  get isDragging() {
    return this.selectionRect !== null;
  }

  @computed
  get selectionRectDimensions() {
    if (!this.selectionRect) {
      return null;
    }
    return {
      left: Math.min(this.selectionRect.x1, this.selectionRect.x2),
      top: Math.min(this.selectionRect.y1, this.selectionRect.y2),
      width: Math.abs(this.selectionRect.x1 - this.selectionRect.x2),
      height: Math.abs(this.selectionRect!.y1 - this.selectionRect!.y2),
    };
  }

  @computed({
    equals: (a: Set<string>, b: Set<string>) =>
      a.size === b.size && Array.from(a).every((id) => b.has(id)),
  })
  get currentlyDragged(): Set<string> {
    if (!this.selectionRect) {
      return new Set();
    }

    const { x1, x2, y1, y2 } = this.selectionRect;
    const dragLeft = Math.min(x1, x2);
    const dragRight = Math.max(x1, x2);
    const dragTop = Math.min(y1, y2);
    const dragBottom = Math.max(y1, y2);

    return new Set(
      Array.from(this.targets.values()).flatMap((target) => {
        const { left, top, width, height } = target;
        const right = left + width;
        const bottom = top + height;
        return left <= dragRight &&
          right >= dragLeft &&
          top <= dragBottom &&
          bottom >= dragTop
          ? [target.id]
          : [];
      })
    );
  }

  @computed({
    equals: (a: Set<string>, b: Set<string>) =>
      a.size === b.size && Array.from(a).every((id) => b.has(id)),
  })
  get resolvedSelection(): Set<string> {
    const frontier = new Set([...this.selected, ...this.currentlyDragged]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const selectedId of frontier) {
        const node = formulaStore.augmentedFormula.findNode(selectedId);
        if (!node) {
          continue;
        }

        if (node._parent?.children.every((child) => frontier.has(child.id))) {
          frontier.add(node._parent.id);
          node._parent.children.forEach((child) => frontier.delete(child.id));
          changed = true;
        }
      }
    }
    return frontier;
  }
}

export const selectionStore = new SelectionStore();

// Whenever the formula changes, we'll completely rerender the formula. But the
// tree doesn't unmount, so effect cleanups for the target ref registrations
// don't run. Instead, we'll manually watch for when the rendered formula changes
// and clear the registered targets for the old formula.
//
// According to the MobX docs, reactions run synchronously after the store changes.
// reaction(
//   () => formulaStore.renderSpec,
//   () => selectionStore.clearTargets()
// );
