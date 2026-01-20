import katex from "katex";

import { canonicalizeFormula } from "../parse/formula-transform";
// import * as babelPlugin from "prettier/parser-babel";
// import * as estreePlugin from "prettier/plugins/estree";
// import * as prettier from "prettier/standalone";
import {
  FormulaLatexRangeNode,
  FormulaLatexRanges,
  StyledRange,
  UnstyledRange,
} from "./formula-text";

// import * as prettier from "prettier/standalone";
// import * as babelPlugin from "prettier/parser-babel";
// import * as estreePlugin from "prettier/plugins/estree";
// import katex from "katex";

// Add this interface near the top of the file after imports
interface KatexWithInternals {
  __parse: (
    latex: string,
    options: { strict: boolean; trust: boolean }
  ) => katex.ParseNode[];
}

export const debugLatex = async (latex: string) => {
  // const mathjaxRendered: Element = (MathJax as any).tex2chtml(latex);
  // const formattedHtml = await prettier.format(html.outerHTML, {
  //   parser: "babel",
  //   plugins: [babelPlugin, estreePlugin],
  // });
  // console.log(formattedHtml);

  // const renderSpec = deriveRenderSpec(html);
  // console.log(renderSpec);

  const katexOptions = {
    strict: false,
    trust: true,
    output: "html",
  };
  console.log(
    "KaTeX Parse tree:",
    (katex as unknown as KatexWithInternals).__parse(latex, katexOptions)
  );

  const katexRendered = katex.renderToString(latex, katexOptions);
  // const formattedKatex = await prettier.format(katexRendered, {
  //   parser: "babel",
  //   plugins: [babelPlugin, estreePlugin],
  // });
  // console.log("KaTeX rendered:", formattedKatex);

  let debugDiv = document.getElementById("debug");
  if (!debugDiv) {
    debugDiv = document.createElement("div");
    debugDiv.id = "debug";
    debugDiv.style.position = "fixed";
    debugDiv.style.bottom = "0";
    debugDiv.style.left = "50%";
    document.body.appendChild(debugDiv);
  }
  debugDiv.innerHTML = katexRendered;
  // (MathJax as any).startup.document.updateDocument();
  // debugDiv.innerHTML = mathjaxRendered.outerHTML;

  const parsed = deriveTree(latex);
  console.log("Parsed augmented formula:", parsed);
};

window.debugLatex = debugLatex;

export const checkFormulaCode = (latex: string) => {
  try {
    deriveTree(latex);
    return true;
  } catch {
    return false;
  }
};

export const updateFormula = (
  newFormula: AugmentedFormula
): {
  renderSpec: RenderSpec;
} => {
  // Ensure MathJax is loaded before attempting to render
  if (!window.MathJax || !window.MathJax.tex2chtml) {
    throw new Error(
      "MathJax is not loaded. Please ensure MathJax is loaded before rendering formulas."
    );
  }

  console.log("LaTeX:", newFormula.toLatex("no-id"));
  console.log("New formula:", newFormula);
  // Use "no-id" mode instead of "render" mode because MathJax doesn't understand \cssId
  const renderLatex = newFormula.toLatex("no-id");
  const chtml = window.MathJax.tex2chtml(renderLatex);
  const renderSpec = deriveRenderSpec(chtml);
  console.log("Render spec:", renderSpec);

  // MathJax rendering requires appending new styles to the document
  // TODO: Don't know what this does when there are multiple formulas
  window.MathJax.startup.document.clear();
  window.MathJax.startup.document.updateDocument();

  return {
    renderSpec,
  };
};

export const deriveTree = (latex: string): AugmentedFormula => {
  const katexTrees = (katex as unknown as KatexWithInternals).__parse(latex, {
    strict: false,
    trust: true,
  });

  const augmentedTrees = katexTrees.map(
    (katexTree: katex.ParseNode, i: number) =>
      buildAugmentedFormula(katexTree, `${i}`)
  );
  return canonicalizeFormula(new AugmentedFormula(augmentedTrees));
};

/**
 * Derive an augmented formula with automatic variable name grouping using variable trees
 */
export const deriveTreeWithVars = (
  latex: string,
  variableTrees?: AugmentedFormula[],
  originalSymbols?: string[]
): AugmentedFormula => {
  const baseFormula = deriveTree(latex);
  if (!variableTrees || variableTrees.length === 0) {
    return baseFormula;
  }
  const result = groupVariablesByTrees(
    baseFormula,
    variableTrees,
    originalSymbols
  );
  return result;
};

const buildAugmentedFormula = (
  katexTree: katex.ParseNode,
  id: string
): AugmentedFormulaNode => {
  switch (katexTree.type) {
    case "html": {
      const [child, ...rest] = katexTree.body;
      if (child === undefined || rest.length > 0) {
        // TODO: This is actually wrong, eventually we may want nodes that
        // contain groups of children e.g. multiple numeric symbols form a
        // single numeral
        throw new Error("htmlId should only have a single child");
      }
      return buildAugmentedFormula(child, katexTree.attributes.id);
    }
    case "supsub": {
      const base = buildAugmentedFormula(katexTree.base!, `${id}.base`);
      const sub = katexTree.sub
        ? buildAugmentedFormula(katexTree.sub, `${id}.sub`)
        : undefined;
      const sup = katexTree.sup
        ? buildAugmentedFormula(katexTree.sup, `${id}.sup`)
        : undefined;
      const script = new Script(id, base, sub, sup);
      base._parent = script;
      sub && (sub._parent = script);
      sup && (sup._parent = script);
      return script;
    }
    case "genfrac": {
      // TODO: this is wrong, other things can be genfrac as well
      const numer = buildAugmentedFormula(katexTree.numer, `${id}.numer`);
      const denom = buildAugmentedFormula(katexTree.denom, `${id}.denom`);
      const frac = new Fraction(id, numer, denom);
      numer._parent = frac;
      denom._parent = frac;
      return frac;
    }
    case "atom":
    case "mathord":
    case "textord":
      // Handle internal KaTeX commands that start with \@
      if (katexTree.text.startsWith("\\@")) {
        // Convert internal KaTeX commands to their standard LaTeX equivalents
        const internalCommand = katexTree.text;
        let displayText = internalCommand;

        // Map internal commands to their display equivalents
        switch (internalCommand) {
          case "\\@not":
            displayText = "\\not";
            break;
          // Add other internal command mappings as needed
          default:
            // For unhandled internal commands, remove the @ prefix
            displayText = internalCommand.replace("\\@", "\\");
        }

        return new MathSymbol(id, displayText);
      }
      return new MathSymbol(id, katexTree.text);
    case "color": {
      const children = katexTree.body.map((child) =>
        buildAugmentedFormula(child, `${id}.body`)
      );
      const color = new Color(id, katexTree.color, children);
      children.forEach((child) => (child._parent = color));
      children.forEach((child, i) => {
        if (i > 0) {
          child._leftSibling = children[i - 1];
        }
        if (i < children.length - 1) {
          child._rightSibling = children[i + 1];
        }
      });
      return color;
    }
    case "styling":
    case "ordgroup": {
      if (
        katexTree.body.length === 1 &&
        !(katexTree.body[0].type === "color")
      ) {
        return buildAugmentedFormula(katexTree.body[0], id);
      }
      const children = katexTree.body.map((child, i) =>
        buildAugmentedFormula(child, `${id}.${i}`)
      );
      const group = new Group(id, children);
      children.forEach((child) => (child._parent = group));
      children.forEach((child, i) => {
        if (i > 0) {
          child._leftSibling = children[i - 1];
        }
        if (i < children.length - 1) {
          child._rightSibling = children[i + 1];
        }
      });
      return group;
    }
    case "enclose": {
      // const children = katexTree.body.map((child, i) =>
      //   buildAugmentedFormula(child, `${id}.${i}`)
      // );
      if (katexTree.label === String.raw`\cancel`) {
        const child = buildAugmentedFormula(katexTree.body, `${id}.body`);
        const strikethrough = new Strikethrough(id, child);
        child._parent = strikethrough;
        return strikethrough;
      } else if (katexTree.label === String.raw`\fcolorbox`) {
        const child = buildAugmentedFormula(katexTree.body, `${id}.body`);
        const box = new Box(
          id,
          katexTree.borderColor!,
          katexTree.backgroundColor!,
          child
        );
        // children.forEach((child) => (child._parent = box));
        child._parent = box;
        return box;
      } else {
        throw new Error(`Unsupported enclose type: ${katexTree.label}`);
      }
    }
    case "horizBrace": {
      const base = buildAugmentedFormula(katexTree.base, `${id}.base`);
      const brace = new Brace(id, katexTree.isOver, base);
      base._parent = brace;
      return brace;
    }
    case "text": {
      const children = katexTree.body.map((child, i) =>
        buildAugmentedFormula(child, `${id}.${i}`)
      );
      const text = new Text(id, children);
      children.forEach((child) => (child._parent = text));
      children.forEach((child, i) => {
        if (i > 0) {
          child._leftSibling = children[i - 1];
        }
        if (i < children.length - 1) {
          child._rightSibling = children[i + 1];
        }
      });
      return text;
    }
    case "spacing":
      return new Space(id, katexTree.text);
    case "array":
      return new Aligned(
        id,
        katexTree.body.map((row, r) =>
          row.map((cell, c) => buildAugmentedFormula(cell, `${id}.${r}.${c}`))
        )
      );
    case "leftright": {
      // Handle matrix environments (bmatrix, pmatrix, etc.) and other delimited expressions
      const body = katexTree.body.map((child, i) =>
        buildAugmentedFormula(child, `${id}.${i}`)
      );

      // Determine matrix type based on delimiters
      let matrixType:
        | "bmatrix"
        | "pmatrix"
        | "vmatrix"
        | "Vmatrix"
        | "matrix"
        | null = null;
      if (katexTree.left === "[" && katexTree.right === "]") {
        matrixType = "bmatrix";
      } else if (katexTree.left === "(" && katexTree.right === ")") {
        matrixType = "pmatrix";
      } else if (katexTree.left === "|" && katexTree.right === "|") {
        matrixType = "vmatrix";
      } else if (katexTree.left === "\\Vert" && katexTree.right === "\\Vert") {
        matrixType = "Vmatrix";
      }

      // If it's a matrix type and contains an array, create a Matrix node
      if (matrixType && body.length === 1 && body[0].type === "array") {
        const arrayNode = body[0] as Aligned;
        return new Matrix(id, matrixType, arrayNode.body);
      }

      // Otherwise, create a generic delimited group
      const delimited = new Delimited(
        id,
        katexTree.left,
        katexTree.right,
        body
      );
      body.forEach((child) => (child._parent = delimited));
      body.forEach((child, i) => {
        if (i > 0) {
          child._leftSibling = body[i - 1];
        }
        if (i < body.length - 1) {
          child._rightSibling = body[i + 1];
        }
      });
      return delimited;
    }
    case "op":
      // Handle both symbol operators (like \sum) and function operators (like \sin, \cos, \tan)
      // Symbol operators have symbol: true, function operators have symbol: false
      // Both types have a 'name' property with the operator/function name
      if ("name" in katexTree) {
        return new Op(id, katexTree.name as string, katexTree.limits || false);
      }
      break;
    case "sqrt": {
      const body = buildAugmentedFormula(katexTree.body, `${id}.body`);
      const index = katexTree.index
        ? buildAugmentedFormula(katexTree.index, `${id}.index`)
        : undefined;
      const root = new Root(id, body, index);
      body._parent = root;
      index && (index._parent = root);
      return root;
    }
    case "htmlmathml": {
      // Handle symbols that have both HTML and MathML representations (like \neq)
      // Use HTML structure to preserve the original LaTeX command structure
      if (katexTree.html && katexTree.html.length > 0) {
        return buildAugmentedFormula(katexTree.html[0], `${id}.html`);
      }
      break;
    }
    case "mclass": {
      // Handle mathematical classes (like \mathrel{})
      if (katexTree.body && katexTree.body.length > 0) {
        if (katexTree.body.length === 1) {
          return buildAugmentedFormula(katexTree.body[0], id);
        } else {
          // For multiple children, create a group
          const children = katexTree.body.map((child, i) =>
            buildAugmentedFormula(child, `${id}.${i}`)
          );
          const group = new Group(id, children);
          children.forEach((child) => (child._parent = group));
          children.forEach((child, i) => {
            if (i > 0) {
              child._leftSibling = children[i - 1];
            }
            if (i < children.length - 1) {
              child._rightSibling = children[i + 1];
            }
          });
          return group;
        }
      }
      break;
    }
    case "lap": {
      // Handle overlapping constructs like \rlap{}, \llap{}
      if (katexTree.body) {
        return buildAugmentedFormula(katexTree.body, `${id}.body`);
      }
      break;
    }
    case "accent": {
      // Handle accent constructs like \hat{}, \bar{}, etc.
      const base = buildAugmentedFormula(katexTree.base, `${id}.base`);
      const accent = new Accent(id, katexTree.label, base);
      base._parent = accent;
      return accent;
    }
  }

  throw new Error("Failed to build formula tree");
};

// TODO: eventually this will also cover alternative code presentations (content
// only, with augmentations)
type LatexMode = "render" | "no-id" | "content-only";
type LatexRange = [string, { [id: string]: [number, number] }];
type RangeElement = string | LatexRange;

/**
 * Adjust ranges based on their offset within this group, combine LaTeX strings, and combine LatexRanges.
 * All ranges should be calculated with the same offset
 */
function consolidateRanges(
  rangeElements: RangeElement[],
  offset: number,
  id?: string
): LatexRange {
  let adjustedOffset = offset;
  let combinedLatex = "";
  let combinedRanges: { [id: string]: [number, number] } = {};
  for (const element of rangeElements) {
    if (typeof element === "string") {
      combinedLatex += element;
      adjustedOffset += element.length;
    } else {
      const [latex, range] = element;
      combinedLatex += latex;
      combinedRanges = {
        ...combinedRanges,
        ...Object.fromEntries(
          Object.entries(range).map(([id, [start, end]]) => [
            id,
            [start + adjustedOffset, end + adjustedOffset],
          ])
        ),
      };
      adjustedOffset += latex.length;
    }
  }
  if (id) {
    combinedRanges[id] = [offset, adjustedOffset];
  }
  return [combinedLatex, combinedRanges];
}

export class AugmentedFormula {
  private idToNode: { [id: string]: AugmentedFormulaNode } = {};

  constructor(public children: AugmentedFormulaNode[]) {
    const collectIds = (node: AugmentedFormulaNode) => {
      this.idToNode[node.id] = node;
      node.children.forEach(collectIds);
    };
    children.forEach(collectIds);
  }

  toLatex(mode: LatexMode): string {
    // return this.children.map((child) => child.toLatex(mode)).join(" ");
    return this.toLatexRanges(mode)[0];
  }

  toLatexRanges(mode: LatexMode): LatexRange {
    return consolidateRanges(
      this.children.flatMap((child) => [child.toLatex(mode, 0), " "]),
      0
    );
  }

  findNode(id: string): AugmentedFormulaNode | null {
    return this.idToNode[id] ?? null;
  }

  equals(other: AugmentedFormula) {
    return this.toLatex("no-id") === other.toLatex("no-id");
  }

  toStyledRanges(): FormulaLatexRanges {
    return new FormulaLatexRanges(
      this.children.flatMap((child, i) =>
        i < this.children.length - 1
          ? child.toStyledRanges().concat(new UnstyledRange(" "))
          : child.toStyledRanges()
      )
    );
  }
}

export type AugmentedFormulaNode =
  | Script
  | Fraction
  | MathSymbol
  | Color
  | Group
  | Box
  | Brace
  | Text
  | Space
  | Aligned
  | Root
  | Accent
  | Op
  | Strikethrough
  | Variable
  | Matrix
  | Delimited;

abstract class AugmentedFormulaNodeBase {
  public _parent: AugmentedFormulaNode | null = null;
  public _leftSibling: AugmentedFormulaNode | null = null;
  public _rightSibling: AugmentedFormulaNode | null = null;
  /**
   * The CSS ID assigned to this node's DOM element during variable processing.
   * This corresponds to the \cssId{} wrapper in the rendered LaTeX.
   * Set by processVariables when wrapping elements with cssId.
   */
  public cssId: string | null = null;
  constructor(public id: string) {}

  protected latexWithId(
    mode: LatexMode,
    elements: RangeElement[]
  ): RangeElement[] {
    switch (mode) {
      case "render":
        return [String.raw`\cssId{${this.id}}{`, ...elements, `}`];
      case "no-id":
      case "content-only":
        return elements;
    }
  }

  get ancestors(): AugmentedFormulaNode[] {
    if (this._parent === null) {
      return [];
    }
    return [this._parent, ...this._parent.ancestors];
  }

  public contains(id: string): boolean {
    return this.id === id || this.children.some((child) => child.contains(id));
  }

  abstract toLatex(mode: LatexMode, offset: number): LatexRange;
  abstract get children(): AugmentedFormulaNode[];
  abstract toStyledRanges(): FormulaLatexRangeNode[];
}

export class Script extends AugmentedFormulaNodeBase {
  public type = "script" as const;
  constructor(
    public id: string,
    public base: AugmentedFormulaNode,
    public sub?: AugmentedFormulaNode,
    public sup?: AugmentedFormulaNode
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const baseElement = this.base.toLatex(mode, offset);
    const subElement = this.sub ? ["_", this.sub.toLatex(mode, offset)] : [];
    const supElement = this.sup ? ["^", this.sup.toLatex(mode, offset)] : [];

    return consolidateRanges(
      this.latexWithId(mode, [baseElement, ...subElement, ...supElement]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    base,
    sub,
    sup,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    base?: AugmentedFormulaNode;
    sub?: AugmentedFormulaNode;
    sup?: AugmentedFormulaNode;
  }): Script {
    const script = new Script(
      id ?? this.id,
      base ?? this.base,
      sub ?? this.sub,
      sup ?? this.sup
    );
    script._parent = parent === undefined ? this._parent : parent;
    script._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    script._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return script;
  }

  get children(): AugmentedFormulaNode[] {
    return [
      this.base,
      ...(this.sub ? [this.sub] : []),
      ...(this.sup ? [this.sup] : []),
    ];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new UnstyledRange("{"),
      ...this.base.toStyledRanges(),
      ...(this.sub
        ? [new UnstyledRange("_"), ...this.sub.toStyledRanges()]
        : []),
      ...(this.sup
        ? [new UnstyledRange("^"), ...this.sup.toStyledRanges()]
        : []),
      new UnstyledRange("}"),
    ];
  }
}

export class Fraction extends AugmentedFormulaNodeBase {
  public type = "frac" as const;
  constructor(
    public id: string,
    public numerator: AugmentedFormulaNode,
    public denominator: AugmentedFormulaNode
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const numeratorElement = this.numerator.toLatex(mode, offset);
    const denominatorElement = this.denominator.toLatex(mode, offset);
    return consolidateRanges(
      this.latexWithId(mode, [
        String.raw`\frac{`,
        numeratorElement,
        `}{`,
        denominatorElement,
        `}`,
      ]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    numerator,
    denominator,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    numerator?: AugmentedFormulaNode;
    denominator?: AugmentedFormulaNode;
  }): Fraction {
    const fraction = new Fraction(
      id ?? this.id,
      numerator ?? this.numerator,
      denominator ?? this.denominator
    );
    fraction._parent = parent === undefined ? this._parent : parent;
    fraction._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    fraction._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return fraction;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.numerator, this.denominator];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new UnstyledRange(String.raw`\frac{`),
      ...this.numerator.toStyledRanges(),
      new UnstyledRange("}{"),
      ...this.denominator.toStyledRanges(),
      new UnstyledRange("}"),
    ];
  }
}

export type VariableState = {
  isFixed: boolean;
  value: number; // this is the number value of the variable (what will be dragged)
};

export class MathSymbol extends AugmentedFormulaNodeBase {
  public type = "symbol" as const;
  constructor(
    public id: string,
    public value: string // this is the LaTeX symbol (e.g. "x")
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    return consolidateRanges(
      this.latexWithId(mode, [this.value.toString()]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    value,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    value?: string;
  }): MathSymbol {
    const symbol = new MathSymbol(id ?? this.id, value ?? this.value);
    symbol._parent = parent === undefined ? this._parent : parent;
    symbol._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    symbol._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return symbol;
  }

  get children(): AugmentedFormulaNode[] {
    return [];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [new UnstyledRange(this.value)];
  }
}

export class Color extends AugmentedFormulaNodeBase {
  public type = "color" as const;
  constructor(
    public id: string,
    public color: string,
    public body: AugmentedFormulaNode[]
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const childrenElements = this.body
      .flatMap((child) => [child.toLatex(mode, offset), " "])
      .slice(0, -1);
    if (mode === "content-only") {
      return consolidateRanges(childrenElements, offset, this.id);
    }

    return consolidateRanges(
      this.latexWithId(mode, [
        String.raw`\textcolor{${this.color}}{`,
        ...childrenElements,
        `}`,
      ]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    color,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    color?: string;
    body?: AugmentedFormulaNode[];
  }): Color {
    const colorNode = new Color(
      id ?? this.id,
      color ?? this.color,
      body ?? this.body
    );
    colorNode._parent = parent === undefined ? this._parent : parent;
    colorNode._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    colorNode._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return colorNode;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body;
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(
        this.id,
        String.raw`\textcolor{${this.color}}{`,
        this.children.flatMap((child, i) =>
          child.toStyledRanges().concat(
            // Add a space between children
            i < this.children.length - 1 ? new UnstyledRange(" ") : []
          )
        ),
        "}",
        {
          color: this.color,
          tooltip: `Color: ${this.color}`,
        }
      ),
    ];
  }
}

export class Group extends AugmentedFormulaNodeBase {
  public type = "group" as const;
  constructor(
    public id: string,
    public body: AugmentedFormulaNode[]
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const childrenElements = this.body
      .flatMap((child) => [child.toLatex(mode, offset), " "])
      .slice(0, -1);
    if (
      (mode === "no-id" || mode === "content-only") &&
      (this._parent === null ||
        this._parent.type === "array" ||
        this._parent.type === "root" ||
        this._parent.type === "brace" ||
        this._parent.type === "frac")
    ) {
      // Avoid adding extra braces in the code editor at the top level and in array environments
      //
      // TODO: We also make Group aware when it is the child of nodes with single-child bodies
      // but this is a bit of a hack. We should have a more generic mechanism for detecting whether
      // the Group's braces are necessary.
      return consolidateRanges(childrenElements, offset, this.id);
    }
    return consolidateRanges(
      this.latexWithId(mode, [`{`, ...childrenElements, `}`]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode[];
  }): Group {
    const group = new Group(id ?? this.id, body ?? this.body);
    group._parent = parent === undefined ? this._parent : parent;
    group._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    group._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return group;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body;
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new UnstyledRange("{"),
      ...this.children.flatMap((child, i) =>
        child.toStyledRanges().concat(
          // Add a space between children
          i < this.children.length - 1 ? new UnstyledRange(" ") : []
        )
      ),
      new UnstyledRange("}"),
    ];
  }
}

export class Box extends AugmentedFormulaNodeBase {
  public type = "box" as const;
  constructor(
    public id: string,
    public borderColor: string,
    public backgroundColor: string,
    public body: AugmentedFormulaNode
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const bodyElement = this.body.toLatex(mode, offset);

    if (mode === "content-only") {
      return consolidateRanges([bodyElement], offset, this.id);
    }

    return consolidateRanges(
      this.latexWithId(
        mode,
        // fcolorbox returns to text mode so the body must be wrapped in $
        [
          `\fcolorbox{${this.borderColor}}{${this.backgroundColor}}{$`,
          bodyElement,
          `$}`,
        ]
      ),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    borderColor,
    backgroundColor,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    borderColor?: string;
    backgroundColor?: string;
    body?: AugmentedFormulaNode;
  }): Box {
    const box = new Box(
      id ?? this.id,
      borderColor ?? this.borderColor,
      backgroundColor ?? this.backgroundColor,
      body ?? this.body
    );
    box._parent = parent === undefined ? this._parent : parent;
    box._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    box._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return box;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.body];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(
        this.id,
        String.raw`\fcolorbox{${this.borderColor}}{${this.backgroundColor}}{$`,
        this.body.toStyledRanges(),
        "$}",
        {
          color: this.borderColor,
          tooltip: `Box: ${this.borderColor}`,
        }
      ),
    ];
  }
}

export class Brace extends AugmentedFormulaNodeBase {
  type = "brace" as const;
  constructor(
    public id: string,
    public over: boolean,
    public base: AugmentedFormulaNode
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const baseElement = this.base.toLatex(mode, offset);

    if (mode === "content-only") {
      return consolidateRanges([baseElement], offset, this.id);
    }

    const command = "\\" + (this.over ? "over" : "under") + "brace";
    return consolidateRanges(
      this.latexWithId(mode, [`${command}{`, baseElement, `}`]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    over,
    base,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    over?: boolean;
    base?: AugmentedFormulaNode;
  }): Brace {
    const brace = new Brace(
      id ?? this.id,
      over ?? this.over,
      base ?? this.base
    );
    brace._parent = parent === undefined ? this._parent : parent;
    brace._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    brace._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return brace;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.base];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    // TODO: This is wrong because we don't have the information locally for the script.
    // We should refactor Brace to include the annotation and avoid creating a Script node.
    return [
      new StyledRange(
        this.id,
        this.over ? String.raw`\overbrace{` : String.raw`\underbrace{`,
        this.base.toStyledRanges(),
        "}"
      ),
    ];
  }
}

export class Text extends AugmentedFormulaNodeBase {
  type = "text" as const;
  constructor(
    public id: string,
    public body: AugmentedFormulaNode[]
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const childrenElements = this.body.map((child) =>
      child.toLatex("no-id", offset)
    );
    return consolidateRanges(
      this.latexWithId(mode, [String.raw`\text{`, ...childrenElements, `}`]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode[];
  }): Text {
    const t = new Text(id ?? this.id, body ?? this.body);
    t._parent = parent === undefined ? this._parent : parent;
    t._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    t._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return t;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body;
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      // TODO: This interacts with Brace. Brace should really own the script and annotation and return the appropriate ranges.
      // new StyledRange(
      //   String.raw`\text{`,
      //   this.children.flatMap((child) => child.toStyledRanges()),
      //   "}"
      // ),
      new UnstyledRange(String.raw`\text{`),
      ...this.children.flatMap((child) => child.toStyledRanges()),
      new UnstyledRange(String.raw`}`),
    ];
  }
}

/*
 * ADDED DURING FORMULIZE DEVELOPMENT
 * Still needs testing
 */
export class Accent extends AugmentedFormulaNodeBase {
  type = "accent" as const;
  constructor(
    public id: string,
    public label: string,
    public base: AugmentedFormulaNode
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const baseElement = this.base.toLatex(mode, offset);
    return consolidateRanges(
      this.latexWithId(mode, [this.label, `{`, baseElement, `}`]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    label,
    base,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    label?: string;
    base?: AugmentedFormulaNode;
  }): Accent {
    const accent = new Accent(
      id ?? this.id,
      label ?? this.label,
      base ?? this.base
    );
    accent._parent = parent === undefined ? this._parent : parent;
    accent._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    accent._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return accent;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.base];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(
        this.id,
        this.label + "{",
        this.base.toStyledRanges(),
        "}"
      ),
    ];
  }
}

export class Space extends AugmentedFormulaNodeBase {
  type = "space" as const;
  constructor(
    public id: string,
    public text: string
  ) {
    super(id);
  }

  toLatex(_: LatexMode, offset: number): LatexRange {
    return [
      this.text,
      {
        [this.id]: [offset, offset + this.text.length],
      },
    ];
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    text,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    text?: string;
  }): Space {
    const space = new Space(id ?? this.id, text ?? this.text);
    space._parent = parent === undefined ? this._parent : parent;
    space._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    space._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return space;
  }

  get children(): AugmentedFormulaNode[] {
    return [];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [new UnstyledRange(this.text)];
  }
}

export class Aligned extends AugmentedFormulaNodeBase {
  type = "array" as const;
  constructor(
    public id: string,
    public body: AugmentedFormulaNode[][]
    // TODO: This type is used for more than `aligned`, e.g. array, gather
    // public mode?: "align" | "alignat" | "gather" | "small" | "CD",
    // public columnAlignment: ("l" | "c" | "r")[],
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const rowElements = this.body
      .flatMap((row) => [
        ...row
          .flatMap((cell) => [cell.toLatex(mode, offset), " & "])
          .slice(0, -1),
        String.raw` \\ `,
      ])
      .slice(0, -1);

    if (mode === "content-only") {
      return consolidateRanges(rowElements, offset, this.id);
    }

    const numCols = Math.max(...this.body.map((row) => row.length));
    const columnAlignment =
      numCols === 2 ? ["r", "l"] : Array(numCols).fill("l");

    return consolidateRanges(
      this.latexWithId(mode, [
        `\\begin{array}{${columnAlignment.join("")}}\n`,
        ...rowElements,
        `\n\\end{array}`,
      ]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode[][];
  }): Aligned {
    const aligned = new Aligned(id ?? this.id, body ?? this.body);
    aligned._parent = parent === undefined ? this._parent : parent;
    aligned._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    aligned._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return aligned;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body.flat();
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(
        this.id,
        String.raw`\begin{aligned}`,
        this.body.flatMap((row, i) =>
          row
            .flatMap((cell, i) =>
              cell
                .toStyledRanges()
                .concat(i < row.length - 1 ? new UnstyledRange(" & ") : [])
            )
            .concat(
              i < this.body.length - 1
                ? new UnstyledRange(String.raw` \\` + "\n")
                : []
            )
        ),
        String.raw`\end{aligned}`,
        {
          noMark: true,
        }
      ),
    ];
  }
}

export class Root extends AugmentedFormulaNodeBase {
  type = "root" as const;
  constructor(
    public id: string,
    public body: AugmentedFormulaNode,
    public index?: AugmentedFormulaNode
  ) {
    super(id);
  }
  toLatex(mode: LatexMode, offset: number): LatexRange {
    const bodyElement = this.body.toLatex(mode, offset);
    const indexElements = this.index
      ? [`[`, this.index.toLatex(mode, offset), `]`]
      : [];

    return consolidateRanges(
      this.latexWithId(mode, [
        String.raw`\sqrt`,
        ...indexElements,
        `{`,
        bodyElement,
        `}`,
      ]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    body,
    index,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode;
    index?: AugmentedFormulaNode;
  }): Root {
    const root = new Root(
      id ?? this.id,
      body ?? this.body,
      index ?? this.index
    );
    root._parent = parent === undefined ? this._parent : parent;
    root._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    root._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return root;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.body, ...(this.index ? [this.index] : [])];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return this.index
      ? [
          new UnstyledRange(String.raw`\sqrt[`),
          ...this.index.toStyledRanges(),
          new UnstyledRange("]{"),
          ...this.body.toStyledRanges(),
          new UnstyledRange("}"),
        ]
      : [
          new UnstyledRange(String.raw`\sqrt{`),
          ...this.body.toStyledRanges(),
          new UnstyledRange("}"),
        ];
  }
}

export class Op extends AugmentedFormulaNodeBase {
  type = "op" as const;
  constructor(
    public id: string,
    public operator: string,
    public limits: boolean
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    return consolidateRanges(
      this.latexWithId(
        mode,
        this.limits ? [this.operator, String.raw`\limits`] : [this.operator]
      ),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    operator,
    limits,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    operator?: string;
    limits?: boolean;
    body?: AugmentedFormulaNode;
  }): Op {
    const op = new Op(
      id ?? this.id,
      operator ?? this.operator,
      limits ?? this.limits
    );
    op._parent = parent === undefined ? this._parent : parent;
    op._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    op._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return op;
  }

  get children(): AugmentedFormulaNode[] {
    return [];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return this.limits
      ? [new UnstyledRange(String.raw`${this.operator}\limits`)]
      : [new UnstyledRange(this.operator)];
  }
}

export class Strikethrough extends AugmentedFormulaNodeBase {
  type = "strikethrough" as const;
  constructor(
    public id: string,
    public body: AugmentedFormulaNode
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const bodyElement = this.body.toLatex(mode, offset);

    if (mode === "content-only") {
      return consolidateRanges([bodyElement], offset, this.id);
    }

    return consolidateRanges(
      this.latexWithId(mode, [String.raw`\cancel{`, bodyElement, `}`]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode;
  }): Strikethrough {
    const strikethrough = new Strikethrough(id ?? this.id, body ?? this.body);
    strikethrough._parent = parent === undefined ? this._parent : parent;
    strikethrough._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    strikethrough._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return strikethrough;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.body];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(
        this.id,
        String.raw`\cancel{`,
        this.body.toStyledRanges(),
        "}"
      ),
    ];
  }
}

export class Variable extends AugmentedFormulaNodeBase {
  type = "variable" as const;
  constructor(
    public id: string,
    public body: AugmentedFormulaNode,
    public variableLatex: string,
    public originalSymbol: string // The original variable symbol for matching
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const bodyElement = this.body.toLatex(mode, offset);

    if (mode === "content-only") {
      return consolidateRanges([bodyElement], offset, this.id);
    }

    return consolidateRanges(
      this.latexWithId(mode, [bodyElement]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    body,
    variableLatex,
    originalSymbol,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode;
    variableLatex?: string;
    originalSymbol?: string;
  }): Variable {
    const variable = new Variable(
      id ?? this.id,
      body ?? this.body,
      variableLatex ?? this.variableLatex,
      originalSymbol ?? this.originalSymbol
    );
    variable._parent = parent === undefined ? this._parent : parent;
    variable._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    variable._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return variable;
  }

  get children(): AugmentedFormulaNode[] {
    return [this.body];
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(this.id, "", this.body.toStyledRanges(), "", {
        color: "#2563eb",
        tooltip: `Variable: ${this.originalSymbol}`,
      }),
    ];
  }
}

export class Matrix extends AugmentedFormulaNodeBase {
  type = "matrix" as const;
  constructor(
    public id: string,
    public matrixType: "bmatrix" | "pmatrix" | "vmatrix" | "Vmatrix" | "matrix",
    public body: AugmentedFormulaNode[][]
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const rowElements = this.body
      .flatMap((row) => [
        ...row
          .flatMap((cell) => [cell.toLatex(mode, offset), " & "])
          .slice(0, -1),
        String.raw` \\ `,
      ])
      .slice(0, -1);

    if (mode === "content-only") {
      return consolidateRanges(rowElements, offset, this.id);
    }

    return consolidateRanges(
      this.latexWithId(mode, [
        `\\begin{${this.matrixType}}`,
        ...rowElements,
        `\\end{${this.matrixType}}`,
      ]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    matrixType,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    matrixType?: "bmatrix" | "pmatrix" | "vmatrix" | "Vmatrix" | "matrix";
    body?: AugmentedFormulaNode[][];
  }): Matrix {
    const matrix = new Matrix(
      id ?? this.id,
      matrixType ?? this.matrixType,
      body ?? this.body
    );
    matrix._parent = parent === undefined ? this._parent : parent;
    matrix._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    matrix._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return matrix;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body.flat();
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new StyledRange(
        this.id,
        `\\begin{${this.matrixType}}`,
        this.body.flatMap((row, i) =>
          row
            .flatMap((cell, j) =>
              cell
                .toStyledRanges()
                .concat(j < row.length - 1 ? new UnstyledRange(" & ") : [])
            )
            .concat(
              i < this.body.length - 1
                ? new UnstyledRange(String.raw` \\` + "\n")
                : []
            )
        ),
        `\\end{${this.matrixType}}`,
        {
          tooltip: `Matrix: ${this.matrixType}`,
        }
      ),
    ];
  }
}

export class Delimited extends AugmentedFormulaNodeBase {
  type = "delimited" as const;
  constructor(
    public id: string,
    public left: string,
    public right: string,
    public body: AugmentedFormulaNode[]
  ) {
    super(id);
  }

  toLatex(mode: LatexMode, offset: number): LatexRange {
    const childrenElements = this.body
      .flatMap((child) => [child.toLatex(mode, offset), " "])
      .slice(0, -1);

    if (mode === "content-only") {
      return consolidateRanges(childrenElements, offset, this.id);
    }

    return consolidateRanges(
      this.latexWithId(mode, [
        `\\left${this.left}`,
        ...childrenElements,
        `\\right${this.right}`,
      ]),
      offset,
      this.id
    );
  }

  withChanges({
    id,
    parent,
    leftSibling,
    rightSibling,
    left,
    right,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    leftSibling?: AugmentedFormulaNode | null;
    rightSibling?: AugmentedFormulaNode | null;
    left?: string;
    right?: string;
    body?: AugmentedFormulaNode[];
  }): Delimited {
    const delimited = new Delimited(
      id ?? this.id,
      left ?? this.left,
      right ?? this.right,
      body ?? this.body
    );
    delimited._parent = parent === undefined ? this._parent : parent;
    delimited._leftSibling =
      leftSibling === undefined ? this._leftSibling : leftSibling;
    delimited._rightSibling =
      rightSibling === undefined ? this._rightSibling : rightSibling;
    return delimited;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body;
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return [
      new UnstyledRange(`\\left${this.left}`),
      ...this.body.flatMap((child, i) =>
        child
          .toStyledRanges()
          .concat(i < this.body.length - 1 ? new UnstyledRange(" ") : [])
      ),
      new UnstyledRange(`\\right${this.right}`),
    ];
  }
}

export type RenderSpec = {
  tagName: string;
  id?: string;
  className?: string;
  style?: Record<string, string>;
  attrs: Record<string, string>;
  children: RenderSpec[];
};

export const deriveRenderSpec = (node: Element): RenderSpec => {
  const children = Array.from(node.children).map(deriveRenderSpec);
  return {
    tagName: node.tagName.toLowerCase(),
    id: node.getAttribute("id") ?? undefined,
    className: node.getAttribute("class") ?? undefined,
    style: "style" in node ? extractStyle(node) : undefined,
    attrs: Object.fromEntries(
      Array.from(node.attributes)
        .filter((a) => !["id", "class", "style"].includes(a.name))
        .map((attr) => [attr.name, attr.value])
    ),
    children,
  };
};

export const extractStyle = (node: Element): Record<string, string> => {
  return Object.fromEntries(
    Array.from((node as HTMLElement).style).map((prop) => [
      // https://stackoverflow.com/a/60738940
      prop.replace(/-./g, (x) => x[1].toUpperCase()),
      // @ts-expect-error This is a valid way to access a style property
      node.style[prop],
    ])
  );
};

// NEW: converting Latex to MathML using MathJax
export const convertLatexToMathML = async (latex: string): Promise<string> => {
  if (!window.MathJax?.tex2mmlPromise) {
    return "";
  }

  try {
    const mml = await window.MathJax.tex2mmlPromise(latex);
    return mml;
  } catch (error) {
    return `<math xmlns="http://www.w3.org/1998/Math/MathML">
              <merror>
                <mtext>Error converting LaTeX to MathML</mtext>
              </merror>
            </math>`;
  }
};

/**
 * Group variable name patterns in the formula tree by wrapping matching subtrees
 * with VariableName nodes using provided variable trees
 */
export const groupVariablesByTrees = (
  formula: AugmentedFormula,
  variableTrees: AugmentedFormula[],
  originalSymbols?: string[]
): AugmentedFormula => {
  if (variableTrees.length === 0) {
    return formula;
  }
  // Create pairs of variable trees and their original symbols
  const treeSymbolPairs = variableTrees.map((tree, index) => ({
    tree,
    originalSymbol: originalSymbols?.[index] || tree.toLatex("no-id"),
  }));
  // Sort variable trees by complexity (longer/more complex first)
  // This ensures we match longer variable names before shorter ones
  const sortedPairs = [...treeSymbolPairs].sort(
    (a, b) => getTreeComplexity(b.tree) - getTreeComplexity(a.tree)
  );
  // Find and group matching subtrees for each variable tree
  let newFormula = formula;
  for (const { tree: variableTree, originalSymbol } of sortedPairs) {
    newFormula = findAndGroupVariableTree(
      newFormula,
      variableTree,
      originalSymbol
    );
  }
  return newFormula;
};

/**
 * Calculate the complexity of a tree for sorting purposes
 * More complex trees (longer variable names) should be matched first
 */
const getTreeComplexity = (tree: AugmentedFormula): number => {
  let complexity = 0;
  const traverse = (node: AugmentedFormulaNode) => {
    complexity += 1;
    // Add extra weight for certain node types
    switch (node.type) {
      case "script":
        complexity += 2; // subscripts/superscripts are more complex
        break;
      case "frac":
        complexity += 3; // fractions are quite complex
        break;
      case "group":
        complexity += 1; // groups add structure
        break;
      case "matrix":
        complexity += 4; // matrices are very complex
        break;
      case "delimited":
        complexity += 2; // delimited expressions add structure
        break;
    }
    node.children.forEach(traverse);
  };
  tree.children.forEach(traverse);
  return complexity;
};

/**
 * Find and group a specific variable tree in the formula tree
 */
const findAndGroupVariableTree = (
  formula: AugmentedFormula,
  variableTree: AugmentedFormula,
  originalSymbol: string
): AugmentedFormula => {
  // Recursively process the entire tree to find and replace patterns at any level
  const newChildren = formula.children.map((child) =>
    recursivelyFindAndGroupVariableTree(
      child,
      variableTree.children,
      variableTree.toLatex("no-id"),
      originalSymbol
    )
  );
  // Also check for patterns at the top level
  const topLevelMatches = findMatchingSubsequences(
    newChildren,
    variableTree.children
  );
  let finalChildren = newChildren;
  if (topLevelMatches.length > 0) {
    finalChildren = replaceSubsequencesWithVariables(
      newChildren,
      topLevelMatches,
      variableTree.toLatex("no-id"),
      originalSymbol
    );
  }
  return new AugmentedFormula(finalChildren);
};

/**
 * Check if a node is inside a nested context (subscript, superscript, fraction, etc.)
 */
const isInNestedContext = (node: AugmentedFormulaNode): boolean => {
  let parent = node._parent;
  while (parent) {
    if (
      parent.type === "script" ||
      parent.type === "frac" ||
      parent.type === "root" ||
      parent.type === "accent" ||
      parent.type === "array" ||
      parent.type === "matrix"
    ) {
      return true;
    }
    parent = parent._parent;
  }
  return false;
};

/**
 * Check if a node is part of an equality expression (like i=1)
 * Returns true if the node is on the left side of an equals sign
 * Only applies to nested contexts (not root level)
 */
const isInEqualityContext = (node: AugmentedFormulaNode): boolean => {
  // Only check for equality context if we're in a nested structure
  if (!isInNestedContext(node)) {
    return false;
  }

  // Check if this node has a right sibling that is an equals sign
  if (node._rightSibling && node._rightSibling.type === "symbol") {
    const rightSymbol = node._rightSibling as MathSymbol;
    if (rightSymbol.value === "=") {
      return true;
    }
  }

  // Also check if we're in a group that contains an equals sign
  if (node._parent && node._parent.type === "group") {
    const parentGroup = node._parent as Group;
    const nodeIndex = parentGroup.body.indexOf(node);

    // Check if there's an equals sign after this node in the group
    for (let i = nodeIndex + 1; i < parentGroup.body.length; i++) {
      const sibling = parentGroup.body[i];
      if (sibling.type === "symbol" && (sibling as MathSymbol).value === "=") {
        return true;
      }
      // Stop if we encounter something that would break the equality expression
      if (sibling.type !== "space") {
        break;
      }
    }
  }

  return false;
};

/**
 * Wrap the right side of equality expressions with Variable nodes.
 * When we see patterns like `i = 1` where `i` matches our variable pattern,
 * wrap `1` with a Variable node that references `i`.
 * This only applies in nested contexts (subscripts, superscripts, etc.)
 */
const wrapEqualityRightSides = (
  children: AugmentedFormulaNode[],
  variableTreeChildren: AugmentedFormulaNode[],
  variableLatex: string,
  originalSymbol: string
): AugmentedFormulaNode[] => {
  const result = [...children];

  // Find all equals signs and process them
  for (let i = 0; i < result.length; i++) {
    const child = result[i];
    if (child.type === "symbol" && (child as MathSymbol).value === "=") {
      // Get the immediate left side (skip spaces)
      let leftNode: AugmentedFormulaNode | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (result[j].type !== "space") {
          leftNode = result[j];
          break;
        }
      }

      // Get the immediate right side (skip spaces)
      let rightIndex = -1;
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].type !== "space") {
          rightIndex = j;
          break;
        }
      }

      // If left matches our variable pattern and right exists, wrap right
      if (leftNode && rightIndex >= 0) {
        const leftMatches =
          variableTreeChildren.length === 1 &&
          nodeMatches(leftNode, variableTreeChildren[0]);

        if (leftMatches) {
          const rightNode = result[rightIndex];
          // Don't double-wrap
          if (rightNode.type !== "variable") {
            result[rightIndex] = new Variable(
              `var-eq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              rightNode,
              variableLatex,
              originalSymbol
            );
          }
        }
      }
    }
  }

  return result;
};

/**
 * Recursively search through a node and its children to find and group variable trees
 */
const recursivelyFindAndGroupVariableTree = (
  node: AugmentedFormulaNode,
  variableTreeChildren: AugmentedFormulaNode[],
  variableLatex: string,
  originalSymbol: string
): AugmentedFormulaNode => {
  // First, check if this entire node matches the variable pattern
  // BUT don't replace if it's in an equality context (like i=1)
  if (
    variableTreeChildren.length === 1 &&
    nodeMatches(node, variableTreeChildren[0]) &&
    !isInEqualityContext(node)
  ) {
    return new Variable(
      `var-${Date.now()}`,
      node,
      variableLatex,
      originalSymbol
    );
  }

  switch (node.type) {
    case "script": {
      const nodeScript = node as Script;

      // Process each component recursively
      const processedBase = recursivelyFindAndGroupVariableTree(
        nodeScript.base,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );
      const processedSub = nodeScript.sub
        ? recursivelyFindAndGroupVariableTree(
            nodeScript.sub,
            variableTreeChildren,
            variableLatex,
            originalSymbol
          )
        : undefined;
      const processedSup = nodeScript.sup
        ? recursivelyFindAndGroupVariableTree(
            nodeScript.sup,
            variableTreeChildren,
            variableLatex,
            originalSymbol
          )
        : undefined;

      // Check if any individual component matches the variable pattern
      const baseMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeScript.base, variableTreeChildren[0]);
      const subMatches =
        nodeScript.sub &&
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeScript.sub, variableTreeChildren[0]);
      const supMatches =
        nodeScript.sup &&
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeScript.sup, variableTreeChildren[0]);

      let finalBase = processedBase;
      let finalSub = processedSub;
      let finalSup = processedSup;

      if (
        baseMatches &&
        !(processedBase.type === "variable") &&
        !isInEqualityContext(nodeScript.base)
      ) {
        finalBase = new Variable(
          `var-${Date.now()}`,
          nodeScript.base,
          variableLatex,
          originalSymbol
        );
      }
      if (
        subMatches &&
        processedSub &&
        !(processedSub.type === "variable") &&
        !isInEqualityContext(nodeScript.sub!)
      ) {
        finalSub = new Variable(
          `var-${Date.now()}`,
          nodeScript.sub!,
          variableLatex,
          originalSymbol
        );
      }
      if (
        supMatches &&
        processedSup &&
        !(processedSup.type === "variable") &&
        !isInEqualityContext(nodeScript.sup!)
      ) {
        finalSup = new Variable(
          `var-${Date.now()}`,
          nodeScript.sup!,
          variableLatex,
          originalSymbol
        );
      }

      return nodeScript.withChanges({
        base: finalBase,
        sub: finalSub,
        sup: finalSup,
      });
    }

    case "frac": {
      const nodeFrac = node as Fraction;

      // Process each component recursively
      const processedNumerator = recursivelyFindAndGroupVariableTree(
        nodeFrac.numerator,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );
      const processedDenominator = recursivelyFindAndGroupVariableTree(
        nodeFrac.denominator,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );

      // Check if individual components match the variable pattern
      const numeratorMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeFrac.numerator, variableTreeChildren[0]);
      const denominatorMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeFrac.denominator, variableTreeChildren[0]);

      let finalNumerator = processedNumerator;
      let finalDenominator = processedDenominator;

      if (
        numeratorMatches &&
        !(processedNumerator.type === "variable") &&
        !isInEqualityContext(nodeFrac.numerator)
      ) {
        finalNumerator = new Variable(
          `var-${Date.now()}`,
          nodeFrac.numerator,
          variableLatex,
          originalSymbol
        );
      }
      if (
        denominatorMatches &&
        !(processedDenominator.type === "variable") &&
        !isInEqualityContext(nodeFrac.denominator)
      ) {
        finalDenominator = new Variable(
          `var-${Date.now()}`,
          nodeFrac.denominator,
          variableLatex,
          originalSymbol
        );
      }

      return nodeFrac.withChanges({
        numerator: finalNumerator,
        denominator: finalDenominator,
      });
    }

    case "group": {
      const nodeGroup = node as Group;
      // First recursively process all children
      let processedChildren = nodeGroup.body.map((child) =>
        recursivelyFindAndGroupVariableTree(
          child,
          variableTreeChildren,
          variableLatex,
          originalSymbol
        )
      );

      // If in a nested context, wrap right sides of equality bindings
      // e.g., in `i=1`, if `i` matches our variable, wrap `1` with Variable node
      if (isInNestedContext(nodeGroup)) {
        processedChildren = wrapEqualityRightSides(
          processedChildren,
          variableTreeChildren,
          variableLatex,
          originalSymbol
        );
      }

      // Then look for patterns in this group's children
      const matches = findMatchingSubsequences(
        processedChildren,
        variableTreeChildren
      );

      let finalChildren = processedChildren;
      if (matches.length > 0) {
        finalChildren = replaceSubsequencesWithVariables(
          processedChildren,
          matches,
          variableLatex,
          originalSymbol
        );
      }

      return nodeGroup.withChanges({
        body: finalChildren,
      });
    }

    case "color": {
      const nodeColor = node as Color;
      // First recursively process all children
      const processedChildren = nodeColor.body.map((child) =>
        recursivelyFindAndGroupVariableTree(
          child,
          variableTreeChildren,
          variableLatex,
          originalSymbol
        )
      );

      // Then look for patterns in this color node's children
      const matches = findMatchingSubsequences(
        processedChildren,
        variableTreeChildren
      );

      let finalChildren = processedChildren;
      if (matches.length > 0) {
        finalChildren = replaceSubsequencesWithVariables(
          processedChildren,
          matches,
          variableLatex,
          originalSymbol
        );
      }

      return nodeColor.withChanges({
        body: finalChildren,
      });
    }

    case "text": {
      const nodeText = node as Text;
      // First recursively process all children
      const processedChildren = nodeText.body.map((child) =>
        recursivelyFindAndGroupVariableTree(
          child,
          variableTreeChildren,
          variableLatex,
          originalSymbol
        )
      );

      // Then look for patterns in this text node's children
      const matches = findMatchingSubsequences(
        processedChildren,
        variableTreeChildren
      );

      let finalChildren = processedChildren;
      if (matches.length > 0) {
        finalChildren = replaceSubsequencesWithVariables(
          processedChildren,
          matches,
          variableLatex,
          originalSymbol
        );
      }

      return nodeText.withChanges({
        body: finalChildren,
      });
    }

    case "box": {
      const nodeBox = node as Box;
      const processedBody = recursivelyFindAndGroupVariableTree(
        nodeBox.body,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );

      // Check if the body itself matches the variable pattern
      const bodyMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeBox.body, variableTreeChildren[0]);

      let finalBody = processedBody;
      if (
        bodyMatches &&
        !(processedBody.type === "variable") &&
        !isInEqualityContext(nodeBox.body)
      ) {
        finalBody = new Variable(
          `var-${Date.now()}`,
          nodeBox.body,
          variableLatex,
          originalSymbol
        );
      }

      return nodeBox.withChanges({
        body: finalBody,
      });
    }

    case "strikethrough": {
      const nodeStrike = node as Strikethrough;
      const processedBody = recursivelyFindAndGroupVariableTree(
        nodeStrike.body,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );

      // Check if the body itself matches the variable pattern
      const bodyMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeStrike.body, variableTreeChildren[0]);

      let finalBody = processedBody;
      if (
        bodyMatches &&
        !(processedBody.type === "variable") &&
        !isInEqualityContext(nodeStrike.body)
      ) {
        finalBody = new Variable(
          `var-${Date.now()}`,
          nodeStrike.body,
          variableLatex,
          originalSymbol
        );
      }

      return nodeStrike.withChanges({
        body: finalBody,
      });
    }

    case "variable": {
      const nodeVar = node as Variable;
      return nodeVar.withChanges({
        body: recursivelyFindAndGroupVariableTree(
          nodeVar.body,
          variableTreeChildren,
          variableLatex,
          originalSymbol
        ),
      });
    }

    case "brace": {
      const nodeBrace = node as Brace;
      const processedBase = recursivelyFindAndGroupVariableTree(
        nodeBrace.base,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );

      // Check if the base itself matches the variable pattern
      const baseMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeBrace.base, variableTreeChildren[0]);

      let finalBase = processedBase;
      if (
        baseMatches &&
        !(processedBase.type === "variable") &&
        !isInEqualityContext(nodeBrace.base)
      ) {
        finalBase = new Variable(
          `var-${Date.now()}`,
          nodeBrace.base,
          variableLatex,
          originalSymbol
        );
      }

      return nodeBrace.withChanges({
        base: finalBase,
      });
    }

    case "array": {
      const nodeArray = node as Aligned;
      return nodeArray.withChanges({
        body: nodeArray.body.map((row) =>
          row.map((cell) =>
            recursivelyFindAndGroupVariableTree(
              cell,
              variableTreeChildren,
              variableLatex,
              originalSymbol
            )
          )
        ),
      });
    }

    case "matrix": {
      const nodeMatrix = node as Matrix;
      return nodeMatrix.withChanges({
        body: nodeMatrix.body.map((row) =>
          row.map((cell) =>
            recursivelyFindAndGroupVariableTree(
              cell,
              variableTreeChildren,
              variableLatex,
              originalSymbol
            )
          )
        ),
      });
    }

    case "delimited": {
      const nodeDelimited = node as Delimited;
      // First recursively process all children
      const processedChildren = nodeDelimited.body.map((child) =>
        recursivelyFindAndGroupVariableTree(
          child,
          variableTreeChildren,
          variableLatex,
          originalSymbol
        )
      );

      // Then look for patterns in this delimited node's children
      const matches = findMatchingSubsequences(
        processedChildren,
        variableTreeChildren
      );

      let finalChildren = processedChildren;
      if (matches.length > 0) {
        finalChildren = replaceSubsequencesWithVariables(
          processedChildren,
          matches,
          variableLatex,
          originalSymbol
        );
      }

      return nodeDelimited.withChanges({
        body: finalChildren,
      });
    }

    case "root": {
      const nodeRoot = node as Root;
      const processedBody = recursivelyFindAndGroupVariableTree(
        nodeRoot.body,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );
      const processedIndex = nodeRoot.index
        ? recursivelyFindAndGroupVariableTree(
            nodeRoot.index,
            variableTreeChildren,
            variableLatex,
            originalSymbol
          )
        : undefined;

      // Check if individual components match the variable pattern
      const bodyMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeRoot.body, variableTreeChildren[0]);
      const indexMatches =
        nodeRoot.index &&
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeRoot.index, variableTreeChildren[0]);

      let finalBody = processedBody;
      let finalIndex = processedIndex;

      if (
        bodyMatches &&
        !(processedBody.type === "variable") &&
        !isInEqualityContext(nodeRoot.body)
      ) {
        finalBody = new Variable(
          `var-${Date.now()}`,
          nodeRoot.body,
          variableLatex,
          originalSymbol
        );
      }
      if (
        indexMatches &&
        processedIndex &&
        !(processedIndex.type === "variable") &&
        !isInEqualityContext(nodeRoot.index!)
      ) {
        finalIndex = new Variable(
          `var-${Date.now()}`,
          nodeRoot.index!,
          variableLatex,
          originalSymbol
        );
      }

      return nodeRoot.withChanges({
        body: finalBody,
        index: finalIndex,
      });
    }

    case "accent": {
      const nodeAccent = node as Accent;
      const processedBase = recursivelyFindAndGroupVariableTree(
        nodeAccent.base,
        variableTreeChildren,
        variableLatex,
        originalSymbol
      );

      // Check if the base itself matches the variable pattern
      const baseMatches =
        variableTreeChildren.length === 1 &&
        nodeMatches(nodeAccent.base, variableTreeChildren[0]);

      let finalBase = processedBase;
      if (
        baseMatches &&
        !(processedBase.type === "variable") &&
        !isInEqualityContext(nodeAccent.base)
      ) {
        finalBase = new Variable(
          `var-${Date.now()}`,
          nodeAccent.base,
          variableLatex,
          originalSymbol
        );
      }

      return nodeAccent.withChanges({
        base: finalBase,
      });
    }

    // For leaf nodes (symbol, space, op), just return them as-is
    case "symbol":
    case "space":
    case "op":
    default:
      return node;
  }
};

/**
 * Replace matching subsequences with VariableName wrapper nodes
 */
const replaceSubsequencesWithVariables = (
  children: AugmentedFormulaNode[],
  matches: {
    startIndex: number;
    endIndex: number;
    nodes: AugmentedFormulaNode[];
  }[],
  variableLatex: string,
  originalSymbol: string
): AugmentedFormulaNode[] => {
  // Sort matches by start index in descending order to replace from end to beginning
  const sortedMatches = [...matches].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  const newChildren = [...children];

  for (const match of sortedMatches) {
    // Check if any of the matched nodes are in an equality context
    const anyInEqualityContext = match.nodes.some((node) =>
      isInEqualityContext(node)
    );

    if (anyInEqualityContext) {
      // Skip this match if any node is in an equality context
      continue;
    }

    // Create a group containing all the matched nodes
    const groupedBody =
      match.nodes.length === 1
        ? match.nodes[0]
        : new Group(`group-${Date.now()}`, match.nodes);

    // Create the VariableName wrapper
    const variableNode = new Variable(
      `var-${Date.now()}`,
      groupedBody,
      variableLatex,
      originalSymbol
    );

    // Update parent relationships
    if (groupedBody instanceof Group) {
      groupedBody.body.forEach((child) => (child._parent = groupedBody));
      groupedBody._parent = variableNode;
    } else {
      groupedBody._parent = variableNode;
    }

    // Replace the subsequence with the VariableName node
    newChildren.splice(
      match.startIndex,
      match.endIndex - match.startIndex + 1,
      variableNode
    );
  }

  return newChildren;
};

/**
 * Find contiguous subsequences in the children array that match the pattern
 */
const findMatchingSubsequences = (
  children: AugmentedFormulaNode[],
  patternChildren: AugmentedFormulaNode[]
): {
  startIndex: number;
  endIndex: number;
  nodes: AugmentedFormulaNode[];
}[] => {
  const matches: {
    startIndex: number;
    endIndex: number;
    nodes: AugmentedFormulaNode[];
  }[] = [];
  // Handle edge case: empty pattern
  if (patternChildren.length === 0) {
    return matches; // Return empty matches for empty pattern
  }
  // Try to find the pattern starting at each position
  for (let i = 0; i <= children.length - patternChildren.length; i++) {
    if (
      subsequenceMatches(
        children.slice(i, i + patternChildren.length),
        patternChildren
      )
    ) {
      const matchedNodes = children.slice(i, i + patternChildren.length);
      matches.push({
        startIndex: i,
        endIndex: i + patternChildren.length - 1,
        nodes: matchedNodes,
      });
      // Skip past this match to avoid overlapping matches
      i += patternChildren.length - 1;
    }
  }
  return matches;
};

/**
 * Check if a subsequence of nodes matches a pattern subsequence
 */
const subsequenceMatches = (
  subsequence: AugmentedFormulaNode[],
  pattern: AugmentedFormulaNode[]
): boolean => {
  if (subsequence.length !== pattern.length) {
    return false;
  }

  for (let i = 0; i < subsequence.length; i++) {
    if (!nodeMatches(subsequence[i], pattern[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Check if a node matches a pattern node structurally
 */
export const nodeMatches = (
  node: AugmentedFormulaNode,
  pattern: AugmentedFormulaNode
): boolean => {
  // Must have the same type
  if (node.type !== pattern.type) {
    return false;
  }

  switch (node.type) {
    case "symbol": {
      // For symbols, check the value matches
      const nodeSymbol = node as MathSymbol;
      const patternSymbol = pattern as MathSymbol;
      return nodeSymbol.value === patternSymbol.value;
    }

    case "space": {
      // For spaces, check the text matches
      const nodeSpace = node as Space;
      const patternSpace = pattern as Space;
      return nodeSpace.text === patternSpace.text;
    }

    case "script": {
      // For scripts, recursively check base, sub, and sup
      const nodeScript = node as Script;
      const patternScript = pattern as Script;
      return (
        nodeMatches(nodeScript.base, patternScript.base) &&
        ((nodeScript.sub === undefined && patternScript.sub === undefined) ||
          (nodeScript.sub !== undefined &&
            patternScript.sub !== undefined &&
            nodeMatches(nodeScript.sub, patternScript.sub))) &&
        ((nodeScript.sup === undefined && patternScript.sup === undefined) ||
          (nodeScript.sup !== undefined &&
            patternScript.sup !== undefined &&
            nodeMatches(nodeScript.sup, patternScript.sup)))
      );
    }

    case "frac": {
      // For fractions, check numerator and denominator
      const nodeFrac = node as Fraction;
      const patternFrac = pattern as Fraction;
      return (
        nodeMatches(nodeFrac.numerator, patternFrac.numerator) &&
        nodeMatches(nodeFrac.denominator, patternFrac.denominator)
      );
    }

    case "group": {
      // For groups, check all children match
      const nodeGroup = node as Group;
      const patternGroup = pattern as Group;
      if (nodeGroup.body.length !== patternGroup.body.length) {
        return false;
      }
      return nodeGroup.body.every((child, i) =>
        nodeMatches(child, patternGroup.body[i])
      );
    }

    case "color": {
      // For color nodes, check color and all children match
      const nodeColor = node as Color;
      const patternColor = pattern as Color;
      if (
        nodeColor.color !== patternColor.color ||
        nodeColor.body.length !== patternColor.body.length
      ) {
        return false;
      }
      return nodeColor.body.every((child, i) =>
        nodeMatches(child, patternColor.body[i])
      );
    }

    case "box": {
      // For box nodes, check the body matches
      const nodeBox = node as Box;
      const patternBox = pattern as Box;
      return nodeMatches(nodeBox.body, patternBox.body);
    }

    case "strikethrough": {
      // For strikethrough nodes, check the body matches
      const nodeStrike = node as Strikethrough;
      const patternStrike = pattern as Strikethrough;
      return nodeMatches(nodeStrike.body, patternStrike.body);
    }

    case "variable": {
      // For variable name nodes, check the body matches
      const nodeVar = node as Variable;
      const patternVar = pattern as Variable;
      return nodeMatches(nodeVar.body, patternVar.body);
    }

    case "brace": {
      // For braces, check over flag and base
      const nodeBrace = node as Brace;
      const patternBrace = pattern as Brace;
      return (
        nodeBrace.over === patternBrace.over &&
        nodeMatches(nodeBrace.base, patternBrace.base)
      );
    }

    case "text": {
      // For text nodes, check all children match
      const nodeText = node as Text;
      const patternText = pattern as Text;
      if (nodeText.body.length !== patternText.body.length) {
        return false;
      }
      return nodeText.body.every((child, i) =>
        nodeMatches(child, patternText.body[i])
      );
    }

    case "array": {
      // For arrays, check structure matches
      const nodeArray = node as Aligned;
      const patternArray = pattern as Aligned;
      if (nodeArray.body.length !== patternArray.body.length) {
        return false;
      }
      return nodeArray.body.every(
        (row, i) =>
          row.length === patternArray.body[i].length &&
          row.every((cell, j) => nodeMatches(cell, patternArray.body[i][j]))
      );
    }

    case "matrix": {
      // For matrices, check structure matches
      const nodeMatrix = node as Matrix;
      const patternMatrix = pattern as Matrix;
      if (nodeMatrix.body.length !== patternMatrix.body.length) {
        return false;
      }
      return nodeMatrix.body.every(
        (row, i) =>
          row.length === patternMatrix.body[i].length &&
          row.every((cell, j) => nodeMatches(cell, patternMatrix.body[i][j]))
      );
    }

    case "delimited": {
      // For delimited nodes, check structure matches
      const nodeDelimited = node as Delimited;
      const patternDelimited = pattern as Delimited;
      if (
        nodeDelimited.left !== patternDelimited.left ||
        nodeDelimited.right !== patternDelimited.right
      ) {
        return false;
      }
      return (
        nodeDelimited.body.length === patternDelimited.body.length &&
        nodeDelimited.body.every((child, i) =>
          nodeMatches(child, patternDelimited.body[i])
        )
      );
    }

    case "root": {
      // For roots, check body and optional index
      const nodeRoot = node as Root;
      const patternRoot = pattern as Root;
      return (
        nodeMatches(nodeRoot.body, patternRoot.body) &&
        ((nodeRoot.index === undefined && patternRoot.index === undefined) ||
          (nodeRoot.index !== undefined &&
            patternRoot.index !== undefined &&
            nodeMatches(nodeRoot.index, patternRoot.index)))
      );
    }

    case "op": {
      // For operators, check operator and limits flag
      const nodeOp = node as Op;
      const patternOp = pattern as Op;
      return (
        nodeOp.operator === patternOp.operator &&
        nodeOp.limits === patternOp.limits
      );
    }

    case "accent": {
      // For accent nodes, check label and base
      const nodeAccent = node as Accent;
      const patternAccent = pattern as Accent;
      return (
        nodeAccent.label === patternAccent.label &&
        nodeMatches(nodeAccent.base, patternAccent.base)
      );
    }

    default:
      // For unknown types, default to false
      return false;
  }
};

/**
 * Parse a variable string (like "P(B \mid A)") into a mini formula tree
 * Uses the existing deriveTree function to create the tree structure
 *
 * Note: Variable names must use valid LaTeX subscript notation.
 * For multiple indices, use braces: "w_{1,2,3}" not "w_1_2_3"
 */
export const parseVariableString = (
  variableString: string
): AugmentedFormula => {
  try {
    return deriveTree(variableString);
  } catch (error) {
    console.warn(`Failed to parse variable string "${variableString}":`, error);
    // If parsing fails, create a simple symbol node
    return new AugmentedFormula([new MathSymbol("fallback", variableString)]);
  }
};

/**
 * Parse multiple variable strings into an array of mini formula trees
 */
export const parseVariableStrings = (
  variableStrings: string[]
): AugmentedFormula[] => {
  return variableStrings.map((variableString) =>
    parseVariableString(variableString)
  );
};

/**
 * Flatten a formula tree into a list of leaf nodes (symbols, spaces, operators)
 * This gives you the individual tokens/symbols as separate nodes
 * For example: "P(B \mid A)" -> [P, (, B, \mid, A, )]
 */
export const flattenFormulaToTokens = (
  formula: AugmentedFormula
): AugmentedFormulaNode[] => {
  const tokens: AugmentedFormulaNode[] = [];

  const traverse = (node: AugmentedFormulaNode) => {
    // For leaf nodes, add them directly
    if (node.children.length === 0) {
      tokens.push(node);
      return;
    }
    // For composite nodes, traverse their children
    node.children.forEach((child) => traverse(child));
  };
  formula.children.forEach((child) => traverse(child));
  return tokens;
};

/**
 * Get a simplified representation of a variable string as individual symbol strings
 * This extracts just the text content of each token
 */
export const getVariableTokens = (variableString: string): string[] => {
  const formula = parseVariableString(variableString);
  const tokens = flattenFormulaToTokens(formula);
  return tokens.map((token) => {
    switch (token.type) {
      case "symbol":
        return (token as MathSymbol).value;
      case "space":
        return (token as Space).text;
      case "op":
        return (token as Op).operator;
      default:
        // For other node types, use their LaTeX representation
        return token.toLatex("no-id", 0)[0];
    }
  });
};

/**
 * Result of finding an expression match within a formula
 */
export interface ExpressionMatchResult {
  /** The matched nodes from the formula */
  matchedNodes: AugmentedFormulaNode[];
  /** DOM element IDs (cssIds) to query for bounding box calculation */
  elementIds: string[];
}

/**
 * Find where an expression matches within a stored formula tree.
 * Uses the cssId values that were assigned during variable processing.
 * This uses structural AST matching rather than string matching, which correctly
 * handles cases like `=` inside subscripts (e.g., `\sum_{i=1}^{n}`) without
 * false positives.
 * @param formulaTree - The stored formula tree with cssId values assigned
 * @param expressionLatex - The expression to find within the formula
 * @returns Match result with nodes and element IDs, or null if no match found
 */
export const findExpression = (
  formulaTree: AugmentedFormula,
  expressionLatex: string,
  variableSymbols?: string[]
): ExpressionMatchResult | null => {
  try {
    // Parse the expression into an AST for matching
    // If variable symbols are provided, apply the same variable grouping as the formula tree
    let expressionTree: AugmentedFormula;
    if (variableSymbols && variableSymbols.length > 0) {
      const variableTrees = parseVariableStrings(variableSymbols);
      expressionTree = deriveTreeWithVars(
        expressionLatex,
        variableTrees,
        variableSymbols
      );
    } else {
      expressionTree = deriveTree(expressionLatex);
    }
    if (expressionTree.children.length === 0) {
      return null;
    }
    // Find matching subsequence in the formula's children
    const matches = findMatchingSubsequences(
      formulaTree.children,
      expressionTree.children
    );
    if (matches.length === 0) {
      return null;
    }
    const matchedNodes = matches[0].nodes;
    // Collect all cssIds from the matched nodes
    const elementIds = collectCssIds(matchedNodes);
    if (elementIds.length === 0) {
      return null;
    }
    return {
      matchedNodes,
      elementIds,
    };
  } catch (error) {
    console.warn("[findExpression] Error:", error);
    return null;
  }
};

/**
 * Collect all cssId values from AST nodes.
 * These IDs correspond to \cssId{} wrappers in the rendered LaTeX and were
 * assigned during variable processing.
 *
 * @param nodes - The matched AST nodes with cssId values
 */
const collectCssIds = (nodes: AugmentedFormulaNode[]): string[] => {
  const ids: string[] = [];
  const collect = (node: AugmentedFormulaNode, depth: number = 0) => {
    // Use the cssId that was assigned during variable processing
    if (node.cssId) {
      ids.push(node.cssId);
    }
    // Recurse into children to collect their cssIds as well
    node.children.forEach((child) => collect(child, depth + 1));
  };
  nodes.forEach((node) => collect(node, 0));
  return [...new Set(ids)]; // Remove duplicates
};
