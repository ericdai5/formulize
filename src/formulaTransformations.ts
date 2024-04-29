import { AugmentedFormula, AugmentedFormulaNode } from "./FormulaTree";

const assertUnreachable = (x: never): never => {
  throw new Error("Non-exhaustive match for " + x);
};

export const replaceNodes = (
  formula: AugmentedFormula,
  replacer: (node: AugmentedFormulaNode) => AugmentedFormulaNode
): AugmentedFormula => {
  return normalizeIds(
    fixParents(
      new AugmentedFormula(
        formula.children.map((node) => replaceNode(node, replacer))
      )
    )
  );
};

const replaceNode = (
  node: AugmentedFormulaNode,
  replacer: (node: AugmentedFormulaNode) => AugmentedFormulaNode
): AugmentedFormulaNode => {
  switch (node.type) {
    case "script":
      return replacer(
        node.withChanges({
          base: replaceNode(node.base, replacer),
          sub: node.sub ? replaceNode(node.sub, replacer) : undefined,
          sup: node.sup ? replaceNode(node.sup, replacer) : undefined,
        })
      );
    case "frac":
      return replacer(
        node.withChanges({
          numerator: replaceNode(node.numerator, replacer),
          denominator: replaceNode(node.denominator, replacer),
        })
      );
    case "symbol":
      return replacer(node.withChanges({}));
    case "color":
      return replacer(
        node.withChanges({
          body: node.body.map((child) => replaceNode(child, replacer)),
        })
      );
    case "group":
      return replacer(
        node.withChanges({
          body: node.body.map((child) => replaceNode(child, replacer)),
        })
      );
    case "box":
      return replacer(
        node.withChanges({
          body: replaceNode(node.body, replacer),
        })
      );
  }
};

export const normalizeIds = (formula: AugmentedFormula): AugmentedFormula => {
  console.log("Fixing IDs", formula);
  return new AugmentedFormula(
    formula.children.map((node, i) => reassignIds(node, `${i}`))
  );
};

const reassignIds = (
  node: AugmentedFormulaNode,
  id: string
): AugmentedFormulaNode => {
  switch (node.type) {
    case "script":
      return node.withChanges({
        id,
        base: reassignIds(node.base, `${id}.base`),
        sub: node.sub ? reassignIds(node.sub, `${id}.sub`) : undefined,
        sup: node.sup ? reassignIds(node.sup, `${id}.sup`) : undefined,
      });
    case "frac":
      return node.withChanges({
        id,
        numerator: reassignIds(node.numerator, `${id}.numerator`),
        denominator: reassignIds(node.denominator, `${id}.denominator`),
      });
    case "symbol":
      return node.withChanges({ id });
    case "color":
    case "group":
      return node.withChanges({
        id,
        body: node.body.map((child, i) => reassignIds(child, `${id}.${i}`)),
      });
    case "box":
      return node.withChanges({
        id,
        body: reassignIds(node.body, `${id}.body`),
      });
  }
  return assertUnreachable(node);
};

export const fixParents = (formula: AugmentedFormula): AugmentedFormula => {
  console.log("Fixing parents", formula);
  return new AugmentedFormula(
    formula.children.map((node) => fixParent(node, null))
  );
};

const fixParent = (
  node: AugmentedFormulaNode,
  parent: AugmentedFormulaNode | null
): AugmentedFormulaNode => {
  switch (node.type) {
    case "script":
      return node.withChanges({
        parent,
        base: fixParent(node.base, node),
        sub: node.sub ? fixParent(node.sub, node) : undefined,
        sup: node.sup ? fixParent(node.sup, node) : undefined,
      });
    case "frac":
      return node.withChanges({
        parent,
        numerator: fixParent(node.numerator, node),
        denominator: fixParent(node.denominator, node),
      });
    case "symbol":
      return node.withChanges({ parent });
    case "color":
    case "group":
      return node.withChanges({
        parent,
        body: node.body.map((child) => fixParent(child, node)),
      });
    case "box":
      return node.withChanges({
        parent,
        body: fixParent(node.body, node),
      });
  }
  return assertUnreachable(node);
};
