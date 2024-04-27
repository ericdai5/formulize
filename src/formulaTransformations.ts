import {
  AugmentedFormula,
  AugmentedFormulaNode,
  Color,
  Fraction,
  Group,
  MathSymbol,
  Script,
} from "./FormulaTree";

export const replaceNodes = (
  formula: AugmentedFormula,
  replacer: (node: AugmentedFormulaNode) => AugmentedFormulaNode
): AugmentedFormula => {
  return normalizeIds(
    new AugmentedFormula(
      formula.children.map((node) => replaceNode(node, replacer))
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
        new Script(
          node.id,
          replaceNode(node.base, replacer),
          node.sub ? replaceNode(node.sub, replacer) : undefined,
          node.sup ? replaceNode(node.sup, replacer) : undefined
        )
      );
    case "frac":
      return replacer(
        new Fraction(
          node.id,
          replaceNode(node.numerator, replacer),
          replaceNode(node.denominator, replacer)
        )
      );
    case "symbol":
      return replacer(node.clone());
    case "color":
      return new Color(
        node.id,
        node.color,
        node.children.map((child) => replaceNode(child, replacer))
      );
    case "group":
      return new Group(
        node.id,
        node.children.map((child) => replaceNode(child, replacer))
      );
  }
};

export const normalizeIds = (formula: AugmentedFormula): AugmentedFormula => {
  return new AugmentedFormula(
    formula.children.map((node, i) => reassignIds(node, `${i}`))
  );
};

export const reassignIds = (
  node: AugmentedFormulaNode,
  id: string
): AugmentedFormulaNode => {
  switch (node.type) {
    case "script":
      return new Script(
        id,
        reassignIds(node.base, `${id}.base`),
        node.sub ? reassignIds(node.sub, `${id}.sub`) : undefined,
        node.sup ? reassignIds(node.sup, `${id}.sup`) : undefined
      );
    case "frac":
      return new Fraction(
        id,
        reassignIds(node.numerator, `${id}.numerator`),
        reassignIds(node.denominator, `${id}.denominator`)
      );
    case "symbol":
      return new MathSymbol(id, node.value);
    case "color":
      return new Color(
        id,
        node.color,
        node.children.map((child, i) => reassignIds(child, `${id}.${i}`))
      );
    case "group":
      return new Group(
        id,
        node.children.map((child, i) => reassignIds(child, `${id}.${i}`))
      );
  }
};
