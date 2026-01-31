import { action, computed, observable } from "mobx";

import { FormulaLatexRanges } from "../util/parse/formula-text";
import { canonicalizeFormula } from "../util/parse/formula-transform";
import {
  Aligned,
  AugmentedFormula,
  Group,
  RenderSpec,
  convertLatexToMathML,
  deriveTreeWithVars,
  parseVariableStrings,
  updateFormula,
} from "../util/parse/formula-tree";
import { ComputationStore } from "./computation";

export class FormulaStore {
  @observable
  accessor renderSpec: RenderSpec | null = null;
  @observable
  accessor augmentedFormula: AugmentedFormula = new AugmentedFormula([]);
  @observable
  accessor suppressEditorUpdate = false;
  @observable
  accessor styledRangesOverride: FormulaLatexRanges | null = null;

  constructor(
    public id: string,
    private computationStore?: ComputationStore
  ) {}

  @action
  updateFormula(newFormula: AugmentedFormula) {
    if (this.augmentedFormula.equals(newFormula)) {
      return;
    }
    const canonicalized = canonicalizeFormula(newFormula);
    const { renderSpec } = updateFormula(canonicalized);
    this.renderSpec = renderSpec;
    this.augmentedFormula = canonicalized;
  }

  @action
  restoreFormulaState(latex: string) {
    const allVariableSymbols = this.computationStore
      ? Array.from(this.computationStore.variables.keys()).filter(
          (symbol) => symbol && symbol.length > 0
        )
      : [];
    const variableTrees = parseVariableStrings(allVariableSymbols);
    const newFormula = deriveTreeWithVars(
      latex,
      variableTrees,
      allVariableSymbols
    );
    const { renderSpec } = updateFormula(newFormula);
    this.renderSpec = renderSpec;
    this.augmentedFormula = newFormula;
  }

  @action
  overrideStyledRanges(styledRanges: FormulaLatexRanges | null) {
    this.styledRangesOverride = styledRanges;
  }

  @computed
  get latexWithStyling() {
    return this.augmentedFormula.toLatex("no-id");
  }

  @computed
  get latexWithoutStyling() {
    const result = this.augmentedFormula.toLatex("content-only");
    return result;
  }

  @computed
  get styledRanges() {
    return this.styledRangesOverride ?? this.augmentedFormula.toStyledRanges();
  }

  @computed
  get alignIds(): string[][] | null {
    if (this.augmentedFormula.children.length !== 1) {
      return null;
    }
    const rootNode = this.augmentedFormula.children[0];
    if (rootNode instanceof Aligned) {
      return rootNode.body.map((row) => row.map((node) => node.id));
    }
    return null;
  }

  @computed
  get alignColumnIds(): string[][] | null {
    if (this.augmentedFormula.children.length !== 1) {
      return null;
    }

    const rootNode = this.augmentedFormula.children[0];
    if (rootNode instanceof Aligned) {
      return [
        ...Array(Math.max(...rootNode.body.map((row) => row.length))).keys(),
      ].map((col) =>
        rootNode.body.flatMap((row) => (col < row.length ? [row[col].id] : []))
      );
    }

    return null;
  }

  @computed
  get alignRowInternalTargets(): { id: string; col: number }[][] | null {
    if (this.augmentedFormula.children.length !== 1) {
      return null;
    }

    const rootNode = this.augmentedFormula.children[0];
    if (rootNode instanceof Aligned) {
      return rootNode.body.map((row) =>
        row.flatMap((node, col) =>
          node instanceof Group
            ? node.body.map((child) => ({ id: child.id, col }))
            : [{ id: node.id, col }]
        )
      );
    }

    return null;
  }

  @computed
  get mathML() {
    const latex = this.augmentedFormula.toLatex("content-only");
    const result = convertLatexToMathML(latex);
    return result;
  }
}

// Manager class for multiple formula stores
export class FormulaStoreManager {
  @observable
  private accessor stores = new Map<string, FormulaStore>();

  @action
  createStore(
    id: string,
    formulaLatex?: string,
    computationStore?: ComputationStore
  ): FormulaStore {
    const store = new FormulaStore(id, computationStore);
    if (formulaLatex && computationStore) {
      // Get all variables from computation store and convert to trees
      const allVariableSymbols = Array.from(
        computationStore.variables.keys()
      ).filter((symbol) => symbol && symbol.length > 0);
      const variableTrees = parseVariableStrings(allVariableSymbols);
      const formula = deriveTreeWithVars(
        formulaLatex,
        variableTrees,
        allVariableSymbols
      );
      const canonicalFormula = canonicalizeFormula(formula);
      store.updateFormula(canonicalFormula);
    }
    this.stores.set(id, store);
    return store;
  }

  @action
  getStore(id: string): FormulaStore | null {
    return this.stores.get(id) || null;
  }

  @action
  removeStore(id: string): void {
    this.stores.delete(id);
  }

  @action
  clearAllStores(): void {
    this.stores.clear();
  }

  @computed
  get allStores(): FormulaStore[] {
    return Array.from(this.stores.values());
  }

  @computed
  get storeIds(): string[] {
    return Array.from(this.stores.keys());
  }

  hasStore(id: string): boolean {
    return this.stores.has(id);
  }

  getStoreCount(): number {
    return this.stores.size;
  }
}

// Global instance
export const formulaStoreManager = new FormulaStoreManager();
