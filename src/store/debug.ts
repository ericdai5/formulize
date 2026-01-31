import { observable } from "mobx";

/**
 * Debug settings store - persists independently of config changes.
 * These are global display settings for debugging visualization.
 */
class DebugStore {
  @observable
  accessor showFormulaBorders: boolean = false;

  @observable
  accessor showLabelBorders: boolean = false;

  @observable
  accessor showVariableBorders: boolean = false;

  @observable
  accessor showExpressionBorders: boolean = false;

  @observable
  accessor showFormulaShadow: boolean = false;

  @observable
  accessor showLabelShadow: boolean = false;

  @observable
  accessor showVariableShadow: boolean = false;

  @observable
  accessor showExpressionShadow: boolean = false;

  @observable
  accessor showStepBorders: boolean = false;

  @observable
  accessor showStepShadow: boolean = false;
}

// Singleton instance that persists across config changes
export const debugStore = new DebugStore();

export { DebugStore };
