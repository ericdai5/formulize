import { beforeAll, describe, expect, it } from "vitest";

import type { ComputationStore } from "../../store/computation";
import type { IVariable } from "../../types/variable";
import {
  normalizeVariable,
  normalizeVariableOccurrenceRules,
} from "../normalize-variables";
import { shouldAugmentVariableOccurrence } from "../variable-occurrence";

let createComputationStore: () => ComputationStore;
let processLatexContent: (
  latex: string,
  defaultPrecision: number,
  computationStore: ComputationStore,
  formulaId?: string
) => string;

beforeAll(async () => {
  // formula-tree exposes its debug helper on window at module initialization.
  Object.assign(globalThis, { window: {} });
  ({ createComputationStore } = await import("../../store/computation"));
  ({ processLatexContent } = await import("./variable"));
});

const renderVariable = (
  latex: string,
  variable: IVariable,
  formulaId = "formula-a"
): string => {
  const store = createComputationStore();
  store.addVariable("v", variable);
  return processLatexContent(latex, 2, store, formulaId);
};

describe("variable occurrence rules", () => {
  it("defaults to all occurrences and lets exclude remove a match", () => {
    expect(shouldAugmentVariableOccurrence({ value: 1 }, "formula-a", 4)).toBe(
      true
    );
    expect(
      shouldAugmentVariableOccurrence(
        {
          exclude: [{ formula: ["formula-a"], instance: [2] }],
        },
        "formula-a",
        1
      )
    ).toBe(true);
    expect(
      shouldAugmentVariableOccurrence(
        {
          exclude: [{ formula: ["formula-a"], instance: [2] }],
        },
        "formula-a",
        2
      )
    ).toBe(false);
  });

  it("treats filter as an allowlist and gives exclude precedence", () => {
    const variable: IVariable = {
      filter: [{ formula: ["formula-a"], instance: [1, 3] }],
      exclude: [{ formula: ["formula-a"], instance: [3] }],
    };

    expect(shouldAugmentVariableOccurrence(variable, "formula-a", 1)).toBe(
      true
    );
    expect(shouldAugmentVariableOccurrence(variable, "formula-a", 2)).toBe(
      false
    );
    expect(shouldAugmentVariableOccurrence(variable, "formula-a", 3)).toBe(
      false
    );
    expect(shouldAugmentVariableOccurrence(variable, "formula-b", 1)).toBe(
      false
    );
    expect(
      shouldAugmentVariableOccurrence({ filter: [] }, "formula-a", 1)
    ).toBe(false);
  });

  it("normalizes rules without losing an explicitly empty filter", () => {
    expect(normalizeVariable({ filter: [] }).filter).toEqual([]);
    expect(
      normalizeVariableOccurrenceRules(
        [
          {
            formula: ["formula-a", "formula-a"],
            instance: [3, 1, 3],
          },
        ],
        "filter",
        new Set(["formula-a"])
      )
    ).toEqual([{ formula: ["formula-a"], instance: [1, 3] }]);
  });

  it("rejects zero-based and unknown-formula rules", () => {
    expect(() =>
      normalizeVariableOccurrenceRules(
        [{ formula: ["formula-a"], instance: [0] }],
        "filter"
      )
    ).toThrow("positive, 1-indexed integers");
    expect(() =>
      normalizeVariableOccurrenceRules(
        [{ formula: ["missing"], instance: [1] }],
        "exclude",
        new Set(["formula-a"])
      )
    ).toThrow('unknown formula "missing"');
  });
});

describe("variable occurrence rendering", () => {
  it("preserves augment-all rendering when no rules are provided", () => {
    const rendered = renderVariable("v+v+v", {
      value: 7,
      latexDisplay: "value",
    });

    expect(rendered.match(/var-base/g)).toHaveLength(3);
    expect(rendered.match(/\\class\{var /g)).toHaveLength(3);
    expect(rendered.match(/7\.00/g)).toHaveLength(3);
  });

  it("supports everything-except selection with exclude alone", () => {
    const rendered = renderVariable("v+v+v", {
      value: 7,
      latexDisplay: "value",
      exclude: [{ formula: ["formula-a"], instance: [2] }],
    });

    expect(rendered.match(/var-base/g)).toHaveLength(2);
    expect(rendered.match(/\\class\{var /g)).toHaveLength(2);
    expect(rendered).toContain("\\class{var-instance-2}{v}");
  });

  it("keeps all occurrences addressable but augments only selected instances", () => {
    const rendered = renderVariable("v+v+v", {
      value: 7,
      latexDisplay: "value",
      filter: [{ formula: ["formula-a"], instance: [1, 3] }],
      exclude: [{ formula: ["formula-a"], instance: [3] }],
    });

    expect(rendered).toContain("\\class{var var-base var-instance-1}{7.00}");
    expect(rendered).toContain("\\class{var-instance-2}{v}");
    expect(rendered).toContain("\\class{var-instance-3}{v}");
    expect(rendered.match(/\\cssId\{v\}/g)).toHaveLength(3);
  });

  it("scopes the same instance number independently per formula", () => {
    const variable: IVariable = {
      value: 7,
      latexDisplay: "value",
      filter: [{ formula: ["formula-a"], instance: [2] }],
    };

    expect(renderVariable("v+v", variable, "formula-a")).toContain(
      "\\class{var var-base var-instance-2}{7.00}"
    );
    const otherFormula = renderVariable("v+v", variable, "formula-b");
    expect(otherFormula).not.toContain("var-base");
    expect(otherFormula).not.toContain("\\class{var ");
  });

  it("uses authored LaTeX order for root indices", () => {
    const rendered = renderVariable(String.raw`\sqrt[v]{v}`, {
      value: 7,
      latexDisplay: "value",
      filter: [{ formula: ["formula-a"], instance: [1] }],
    });

    expect(rendered).toContain(
      String.raw`\sqrt[\cssId{v}{\class{var var-base var-instance-1}{7.00}}]`
    );
    expect(rendered).toContain(
      String.raw`{\cssId{v}{\class{var-instance-2}{v}}}`
    );
  });

  it("uses authored LaTeX order when renderer traversal reorders scripts", () => {
    const superscriptFirst = renderVariable("v^v_v", {
      value: 7,
      latexDisplay: "value",
      filter: [{ formula: ["formula-a"], instance: [2] }],
    });
    const superscriptPosition = superscriptFirst.indexOf("var-instance-2");
    const subscriptPosition = superscriptFirst.indexOf("var-instance-3");

    expect(subscriptPosition).toBeLessThan(superscriptPosition);
    expect(superscriptFirst).toContain(
      "\\class{var var-base var-instance-2}{7.00}"
    );

    const subscriptFirst = renderVariable("v_v^v", {
      value: 7,
      latexDisplay: "value",
      filter: [{ formula: ["formula-a"], instance: [2] }],
    });
    expect(subscriptFirst).toContain(
      "_{\\cssId{v}{\\class{var var-base var-instance-2}{7.00}}}"
    );
  });

  it("preserves inactive nested-variable display behavior", () => {
    const store = createComputationStore();
    store.addVariable("x_i", { latexDisplay: "name" });
    store.addVariable("i", {
      value: 9,
      latexDisplay: "value",
      filter: [{ formula: ["formula-a"], instance: [1] }],
    });

    const rendered = processLatexContent("x_i", 2, store, "formula-a");
    expect(rendered).toContain("\\class{var var-base var-instance-1}{i}");
    expect(rendered).not.toContain("9.00");
  });

  it("selects whole structured variables with simple and braced subscripts", () => {
    const store = createComputationStore();
    store.addVariable("v", {
      value: 2,
      input: "drag",
      precision: 1,
      latexDisplay: "value",
      filter: [
        { formula: ["formula-a"], instance: [1, 3] },
        { formula: ["formula-b"], instance: [2] },
      ],
      exclude: [{ formula: ["formula-a"], instance: [3] }],
    });
    store.addVariable("v_i", {
      value: 3,
      input: "drag",
      precision: 1,
      latexDisplay: "value",
      filter: [
        { formula: ["formula-a"], instance: [2] },
        { formula: ["formula-b"], instance: [1, 3] },
      ],
      exclude: [{ formula: ["formula-b"], instance: [3] }],
    });
    store.addVariable("w_{i+1}", {
      value: 4,
      input: "drag",
      precision: 1,
      latexDisplay: "value",
      filter: [
        { formula: ["formula-a"], instance: [3] },
        { formula: ["formula-b"], instance: [1, 2] },
      ],
      exclude: [{ formula: ["formula-b"], instance: [1] }],
    });

    const formulaA = processLatexContent(
      "v+v+v+v_i+v_i+v_i+w_{i+1}+w_{i+1}+w_{i+1}",
      2,
      store,
      "formula-a"
    );
    expect(formulaA).toContain(
      "\\cssId{v}{\\class{var var-input var-instance-1}{2.0}}"
    );
    expect(formulaA).toContain(
      "\\cssId{v_i}{\\class{var var-input var-instance-2}{3.0}}"
    );
    expect(formulaA).toContain(
      "\\cssId{w_{i+1}}{\\class{var var-input var-instance-3}{4.0}}"
    );
    expect(formulaA.match(/var-input/g)).toHaveLength(3);

    const formulaB = processLatexContent(
      "v+v+v+w_{i+1}+w_{i+1}+w_{i+1}+v_i+v_i+v_i",
      2,
      store,
      "formula-b"
    );
    expect(formulaB).toContain(
      "\\cssId{v}{\\class{var var-input var-instance-2}{2.0}}"
    );
    expect(formulaB).toContain(
      "\\cssId{v_i}{\\class{var var-input var-instance-1}{3.0}}"
    );
    expect(formulaB).toContain(
      "\\cssId{w_{i+1}}{\\class{var var-input var-instance-2}{4.0}}"
    );
    expect(formulaB.match(/var-input/g)).toHaveLength(3);
  });
});
