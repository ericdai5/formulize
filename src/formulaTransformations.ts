import { AugmentedFormula, AugmentedFormulaNode, Group } from "./FormulaTree";

export const assertUnreachable = (x: never): never => {
  throw new Error("Non-exhaustive match for " + x);
};

export const canonicalizeFormula = (
  formula: AugmentedFormula
): AugmentedFormula => {
  // fixSiblings mutates the nodes instead of returning new ones, so it has to go last
  return fixSiblings(fixParents(normalizeIds(removeEmptyGroups(formula))));
};

export const replaceNodes = (
  formula: AugmentedFormula,
  replacer: (node: AugmentedFormulaNode) => AugmentedFormulaNode
): AugmentedFormula => {
  return canonicalizeFormula(
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
    case "space":
    case "op":
      return replacer(node.withChanges({}));
    case "color":
    case "group":
    case "text":
      return replacer(
        node.withChanges({
          body: node.body.map((child) => replaceNode(child, replacer)),
        })
      );
    case "box":
    case "strikethrough":
      return replacer(
        node.withChanges({
          body: replaceNode(node.body, replacer),
        })
      );
    case "brace":
      return replacer(
        node.withChanges({
          base: replaceNode(node.base, replacer),
        })
      );
    case "array":
      return replacer(
        node.withChanges({
          body: node.body.map((row) =>
            row.map((cell) => replaceNode(cell, replacer))
          ),
        })
      );
    case "root":
      return replacer(
        node.withChanges({
          body: replaceNode(node.body, replacer),
          ...(node.index !== undefined && {
            index: replaceNode(node.index, replacer),
          }),
        })
      );
  }
  return assertUnreachable(node);
};

export const normalizeIds = (formula: AugmentedFormula): AugmentedFormula => {
  // console.log("Fixing IDs", formula);
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
    case "space":
    case "op":
      return node.withChanges({ id });
    case "color":
    case "group":
    case "text":
      return node.withChanges({
        id,
        body: node.body.map((child, i) => reassignIds(child, `${id}.${i}`)),
      });
    case "box":
    case "strikethrough":
      return node.withChanges({
        id,
        body: reassignIds(node.body, `${id}.body`),
      });
    case "brace":
      return node.withChanges({
        id,
        base: reassignIds(node.base, `${id}.base`),
      });
    case "array":
      return node.withChanges({
        id,
        body: node.body.map((row, rowNum) =>
          row.map((cell, colNum) =>
            reassignIds(cell, `${id}.${rowNum}.${colNum}`)
          )
        ),
      });
    case "root":
      return node.withChanges({
        id,
        body: reassignIds(node.body, `${id}.body`),
        ...(node.index !== undefined && {
          index: reassignIds(node.index, `${id}.index`),
        }),
      });
  }
  return assertUnreachable(node);
};

export const fixParents = (formula: AugmentedFormula): AugmentedFormula => {
  // console.log("Fixing parents", formula);
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
    case "space":
    case "op":
      return node.withChanges({ parent });
    case "color":
    case "group":
    case "text":
      return node.withChanges({
        parent,
        body: node.body.map((child) => fixParent(child, node)),
      });
    case "box":
    case "strikethrough":
      return node.withChanges({
        parent,
        body: fixParent(node.body, node),
      });
    case "brace":
      return node.withChanges({
        parent,
        base: fixParent(node.base, node),
      });
    case "array":
      return node.withChanges({
        parent,
        body: node.body.map((row) => row.map((cell) => fixParent(cell, node))),
      });
    case "root":
      return node.withChanges({
        parent,
        body: fixParent(node.body, node),
        ...(node.index !== undefined && {
          index: fixParent(node.index, node),
        }),
      });
  }
  return assertUnreachable(node);
};

export const removeEmptyGroups = (
  formula: AugmentedFormula
): AugmentedFormula => {
  return new AugmentedFormula(
    formula.children.flatMap((node) => removeEmptyGroup(node))
  );
};

const exactlyOne = <T>(arr: T[]): T => {
  if (arr.length === 1) {
    return arr[0];
  }

  throw new Error("Expected exactly one element, got " + arr.length);
};

const atLeastOne = <T>(arr: T[]): T[] => {
  if (arr.length >= 1) {
    return arr;
  }

  throw new Error("Expected at least one element, got " + arr.length);
};

// Removes the outermost group, if it exists.
// This is safe and useful when the enclosing node wraps this child in braces.
const stripOuterGroup = (
  node: AugmentedFormulaNode
): AugmentedFormulaNode[] => {
  if (node.type === "group") {
    return node.body;
  }
  return [node];
};

export const removeEmptyGroup = (
  node: AugmentedFormulaNode
): AugmentedFormulaNode[] => {
  switch (node.type) {
    case "group":
      if (node.body.length === 0) {
        return [];
      }

      if (node.body.length === 1) {
        return removeEmptyGroup(node.body[0]);
      }

      return [
        node.withChanges({
          body: atLeastOne(
            node.body.flatMap((child) =>
              // {{x}} -> {x}
              // {a {b c}} -> {a b c}
              child instanceof Group
                ? child.body.flatMap((child) => removeEmptyGroup(child))
                : removeEmptyGroup(child)
            )
          ),
        }),
      ];
    case "script":
      return [
        node.withChanges({
          base: exactlyOne(removeEmptyGroup(node.base)),
          sub: node.sub ? exactlyOne(removeEmptyGroup(node.sub)) : undefined,
          sup: node.sup ? exactlyOne(removeEmptyGroup(node.sup)) : undefined,
        }),
      ];
    case "frac":
      return [
        node.withChanges({
          numerator: exactlyOne(removeEmptyGroup(node.numerator)),
          denominator: exactlyOne(removeEmptyGroup(node.denominator)),
        }),
      ];
    case "symbol":
    case "space":
    case "op":
      return [node];
    case "color":
    case "text":
      return [
        node.withChanges({
          body: atLeastOne(
            node.body.flatMap(removeEmptyGroup).flatMap(stripOuterGroup)
          ),
        }),
      ];
    case "box":
    case "strikethrough":
      return [
        node.withChanges({
          body: exactlyOne(removeEmptyGroup(node.body)),
        }),
      ];
    case "brace":
      return [
        node.withChanges({
          base: exactlyOne(removeEmptyGroup(node.base)),
        }),
      ];
    case "array":
      return [
        node.withChanges({
          body: node.body.map((row) =>
            atLeastOne(
              row.flatMap((cell) =>
                // We want to preserve empty groups in the array to mark empty columns
                cell instanceof Group && cell.body.length === 0
                  ? [cell]
                  : removeEmptyGroup(cell)
              )
            )
          ),
        }),
      ];
    case "root":
      return [
        node.withChanges({
          body: exactlyOne(removeEmptyGroup(node.body)),
          ...(node.index !== undefined && {
            index: exactlyOne(removeEmptyGroup(node.index)),
          }),
        }),
      ];
  }
  return assertUnreachable(node);
};

export const fixSiblings = (formula: AugmentedFormula): AugmentedFormula => {
  // console.log("Fixing parents", formula);
  const trees = formula.children.map((node) => fixSibling(node));
  trees.forEach((tree, i) => {
    if (i > 0) {
      tree._leftSibling = trees[i - 1];
    }

    if (i < trees.length - 1) {
      tree._rightSibling = trees[i + 1];
    }
  });
  return new AugmentedFormula(trees);
};

const fixSibling = (node: AugmentedFormulaNode): AugmentedFormulaNode => {
  switch (node.type) {
    case "script":
      return node.withChanges({
        base: fixSibling(node.base),
        sub: node.sub ? fixSibling(node.sub) : undefined,
        sup: node.sup ? fixSibling(node.sup) : undefined,
      });
    case "frac":
      return node.withChanges({
        numerator: fixSibling(node.numerator),
        denominator: fixSibling(node.denominator),
      });
    case "symbol":
    case "space":
    case "op":
      return node;
    case "box":
    case "strikethrough":
      return node.withChanges({
        body: fixSibling(node.body),
      });
    case "brace":
      return node.withChanges({
        base: fixSibling(node.base),
      });
    case "root":
      return node.withChanges({
        body: fixSibling(node.body),
        ...(node.index !== undefined && {
          index: fixSibling(node.index),
        }),
      });
    case "color":
    case "group":
    case "text": {
      // These are the only nodes whose children might have siblings
      const newChildren = node.body.map((child) => fixSibling(child));
      newChildren.forEach((child, i) => {
        if (i > 0) {
          child._leftSibling = newChildren[i - 1];
        }

        if (i < newChildren.length - 1) {
          child._rightSibling = newChildren[i + 1];
        }
      });
      return node.withChanges({
        body: newChildren,
      });
    }
    case "array":
      // Adjacent nodes in an array environment are not valid siblings
      // because they cannot be joined into a Group without removing a column.
      // The & column dividers must be at the top level of the Array.
      return node.withChanges({
        body: node.body.map((row) => row.map((cell) => fixSibling(cell))),
      });
  }
  return assertUnreachable(node);
};

/**
 * For each group of siblings, consolidate them into a single Group node.
 */
export const consolidateGroups = (
  formula: AugmentedFormula,
  siblingGroups: string[][]
) => {
  let trees = formula.children.map((node) =>
    consolidateGroup(node, siblingGroups)
  );
  // Check to see if any top-level trees are being joined
  for (const group of siblingGroups) {
    for (let i = 0; i < trees.length; i++) {
      if (group.includes(trees[i].id)) {
        trees = trees
          .slice(0, i)
          .concat([new Group(trees[i].id, trees.slice(i, i + group.length))])
          .concat(trees.slice(i + group.length));
      }
    }
  }
  // We don't want to `canonicalizeFormula` because it might delete the group we just added
  return fixSiblings(fixParents(normalizeIds(new AugmentedFormula(trees))));
};

const consolidateGroup = (
  node: AugmentedFormulaNode,
  siblingGroups: string[][]
): AugmentedFormulaNode => {
  switch (node.type) {
    case "script":
      return node.withChanges({
        base: consolidateGroup(node.base, siblingGroups),
        sub: node.sub ? consolidateGroup(node.sub, siblingGroups) : undefined,
        sup: node.sup ? consolidateGroup(node.sup, siblingGroups) : undefined,
      });
    case "frac":
      return node.withChanges({
        numerator: consolidateGroup(node.numerator, siblingGroups),
        denominator: consolidateGroup(node.denominator, siblingGroups),
      });
    case "symbol":
    case "space":
    case "op":
      return node;
    case "box":
    case "strikethrough":
      return node.withChanges({
        body: consolidateGroup(node.body, siblingGroups),
      });
    case "brace":
      return node.withChanges({
        base: consolidateGroup(node.base, siblingGroups),
      });
    case "root":
      return node.withChanges({
        body: consolidateGroup(node.body, siblingGroups),
        ...(node.index !== undefined && {
          index: consolidateGroup(node.index, siblingGroups),
        }),
      });
    case "array":
      return node.withChanges({
        body: node.body.map((row) =>
          row.map((cell) => consolidateGroup(cell, siblingGroups))
        ),
      });
    case "color":
    case "group":
    case "text": {
      let body = node.body.map((child) =>
        consolidateGroup(child, siblingGroups)
      );

      for (const group of siblingGroups) {
        for (let i = 0; i < body.length; i++) {
          if (group.includes(body[i].id)) {
            body = body
              .slice(0, i)
              .concat([new Group(body[i].id, body.slice(i, i + group.length))])
              .concat(body.slice(i + group.length));
          }
        }
      }
      return node.withChanges({
        body,
      });
    }
  }

  assertUnreachable(node);
};
