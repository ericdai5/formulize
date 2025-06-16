import { action, computed, observable } from "mobx";

import { FormulaLatexRanges } from "../FormulaText";
import {
  Aligned,
  AugmentedFormula,
  Group,
  RenderSpec,
  convertLatexToMathML,
  deriveTreeWithVars,
  parseVariableStrings,
  updateFormula,
} from "../FormulaTree";
import { computationStore } from "../api/computation";
import { canonicalizeFormula } from "../formulaTransformations";

export class FormulaStore {
  @observable
  accessor renderSpec: RenderSpec | null = null;
  @observable
  accessor augmentedFormula: AugmentedFormula = new AugmentedFormula([]);
  @observable
  accessor suppressEditorUpdate = false;
  @observable
  accessor styledRangesOverride: FormulaLatexRanges | null = null;

  constructor(public id: string) {}

  @action
  updateFormula(newFormula: AugmentedFormula) {
    if (this.augmentedFormula.equals(newFormula)) {
      console.log(
        `[Store ${this.id}] Skipping formula update - formula is the same`
      );
      return;
    }

    const canonicalized = canonicalizeFormula(newFormula);
    console.log(`🔍 [Store ${this.id}] Canonicalized formula:`, canonicalized);

    const { renderSpec } = updateFormula(canonicalized);
    this.renderSpec = renderSpec;
    this.augmentedFormula = canonicalized;

    console.log(`🔍 [Store ${this.id}] Updated formula in store:`);
    console.log(`   - With styling: ${this.latexWithStyling}`);
    console.log(`   - Without styling: ${this.latexWithoutStyling}`);
  }

  @action
  restoreFormulaState(latex: string) {
    // Get all variables from computation store and convert to trees
    const allVariableSymbols = Array.from(computationStore.variables.values())
      .map((variable) => variable.symbol)
      .filter((symbol) => symbol && symbol.length > 0);
    console.log("🔍 Creating variable trees for:", allVariableSymbols);
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
    console.log(`[Store ${this.id}] Overriding styled ranges`, styledRanges);
    this.styledRangesOverride = styledRanges;
  }

  @computed
  get latexWithStyling() {
    return this.augmentedFormula.toLatex("no-id");
  }

  @computed
  get latexWithoutStyling() {
    const result = this.augmentedFormula.toLatex("content-only");
    console.log(
      `🔍 [Store ${this.id}] latexWithoutStyling called, returning:`,
      result
    );
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
      console.log(
        `[Store ${this.id}] Found align columns`,
        rootNode.body[0].length,
        rootNode
      );
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
    console.log(`[Store ${this.id}] mathML getter called`);
    const latex = this.augmentedFormula.toLatex("content-only");
    console.log(`[Store ${this.id}] Getting MathML for LaTeX:`, latex);
    const result = convertLatexToMathML(latex);
    console.log(`[Store ${this.id}] MathML result:`, result);
    return result;
  }
}

// Manager class for multiple formula stores
export class FormulaStoreManager {
  @observable
  private accessor stores = new Map<string, FormulaStore>();

  @action
  createStore(id: string, formulaLatex?: string): FormulaStore {
    console.log(`Creating formula store with id: ${id}`);
    const store = new FormulaStore(id);
    if (formulaLatex) {
      // Get all variables from computation store and convert to trees
      const allVariableSymbols = Array.from(computationStore.variables.values())
        .map((variable) => variable.symbol)
        .filter((symbol) => symbol && symbol.length > 0);

      console.log("🔍 Creating variable trees for:", allVariableSymbols);
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
    console.log(`Removing formula store with id: ${id}`);
    this.stores.delete(id);
  }

  @action
  clearAllStores(): void {
    console.log("Clearing all formula stores");
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
