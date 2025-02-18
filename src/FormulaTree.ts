import katex from "katex";
import * as babelPlugin from "prettier/parser-babel";
import * as estreePlugin from "prettier/plugins/estree";
import * as prettier from "prettier/standalone";

import {
  FormulaLatexRangeNode,
  FormulaLatexRanges,
  StyledRange,
  UnstyledRange,
} from "./FormulaText";
import { canonicalizeFormula } from "./formulaTransformations";

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
  console.log("KaTeX Parse tree:", katex.__parse(latex, katexOptions));

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

  const parsed = deriveAugmentedFormula(latex);
  console.log("Parsed augmented formula:", parsed);
};

(window as any).debugLatex = debugLatex;

export const checkFormulaCode = (latex: string) => {
  try {
    deriveAugmentedFormula(latex);
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
  console.log("LaTeX:", newFormula.toLatex("no-id"));
  console.log("New formula:", newFormula);
  const renderLatex = newFormula.toLatex("render");
  const chtml = (MathJax as any).tex2chtml(renderLatex);
  const renderSpec = deriveRenderSpec(chtml);
  console.log("Render spec:", renderSpec);

  // MathJax rendering requires appending new styles to the document
  // TODO: Don't know what this does when there are multiple formulas
  (MathJax as any).startup.document.clear();
  (MathJax as any).startup.document.updateDocument();

  return {
    renderSpec,
  };
};

export const deriveAugmentedFormula = (latex: string): AugmentedFormula => {
  const katexTrees = katex.__parse(latex, { strict: false, trust: true });

  const augmentedTrees = katexTrees.map((katexTree, i) =>
    buildAugmentedFormula(katexTree, `${i}`)
  );
  return canonicalizeFormula(new AugmentedFormula(augmentedTrees));
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
    case "op":
      if (katexTree.symbol) {
        return new Op(id, katexTree.name, katexTree.limits);
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
  }

  console.log("Failed to build:", katexTree);
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
  | Op
  | Strikethrough;

abstract class AugmentedFormulaNodeBase {
  public _parent: AugmentedFormulaNode | null = null;
  public _leftSibling: AugmentedFormulaNode | null = null;
  public _rightSibling: AugmentedFormulaNode | null = null;
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

export class MathSymbol extends AugmentedFormulaNodeBase {
  public type = "symbol" as const;
  constructor(
    public id: string,
    public value: string
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
      return consolidateRanges(baseLatex, offset, this.id);
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
