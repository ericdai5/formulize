// import * as prettier from "prettier/standalone";
// import * as babelPlugin from "prettier/parser-babel";
// import * as estreePlugin from "prettier/plugins/estree";
// import katex from "katex";
import {
  FormulaLatexRangeNode,
  FormulaLatexRanges,
  StyledRange,
  UnstyledRange,
} from "./FormulaText";
import { removeEmptyGroups } from "./formulaTransformations";

export const debugLatex = async (latex: string) => {
  // const mathjaxRendered: Element = MathJax.tex2chtml(latex);
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
  return removeEmptyGroups(new AugmentedFormula(augmentedTrees));
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
      return color;
    }
    case "styling":
    case "ordgroup": {
      if (katexTree.body.length === 1) {
        return buildAugmentedFormula(katexTree.body[0], id);
      }
      const children = katexTree.body.map((child, i) =>
        buildAugmentedFormula(child, `${id}.${i}`)
      );
      const group = new Group(id, children);
      children.forEach((child) => (child._parent = group));
      return group;
    }
    case "enclose": {
      // const children = katexTree.body.map((child, i) =>
      //   buildAugmentedFormula(child, `${id}.${i}`)
      // );
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
  }

  console.log("Failed to build:", katexTree);
  throw new Error("Failed to build formula tree");
};

// TODO: eventually this will also cover alternative code presentations (content
// only, with augmentations)
type LatexMode = "render" | "ast" | "no-id" | "content-only";

export class AugmentedFormula {
  private idToNode: { [id: string]: AugmentedFormulaNode } = {};

  constructor(public children: AugmentedFormulaNode[]) {
    console.log("New formula from:", children);
    const collectIds = (node: AugmentedFormulaNode) => {
      this.idToNode[node.id] = node;
      node.children.forEach(collectIds);
    };
    children.forEach(collectIds);
  }

  toLatex(mode: LatexMode): string {
    return this.children.map((child) => child.toLatex(mode)).join(" ");
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
  | Aligned;

abstract class AugmentedFormulaNodeBase {
  public _parent: AugmentedFormulaNode | null = null;
  constructor(public id: string) {}

  protected latexWithId(mode: LatexMode, latex: string): string {
    switch (mode) {
      case "ast":
        return String.raw`\htmlId{${this.id}}{${latex}}`;
      case "render":
        return String.raw`\cssId{${this.id}}{${latex}}`;
      case "no-id":
      case "content-only":
        return latex;
    }
  }

  get ancestors(): AugmentedFormulaNode[] {
    if (this._parent === null) {
      return [];
    }
    return [this._parent, ...this._parent.ancestors];
  }

  abstract toLatex(mode: LatexMode): string;
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

  toLatex(mode: LatexMode): string {
    const baseLatex = String.raw`${this.base.toLatex(mode)}`;
    const subLatex = this.sub ? String.raw`_${this.sub.toLatex(mode)}` : "";
    const supLatex = this.sup ? String.raw`^${this.sup.toLatex(mode)}` : "";
    return this.latexWithId(
      mode,
      String.raw`{${baseLatex}${subLatex}${supLatex}}`
    );
  }

  withChanges({
    id,
    parent,
    base,
    sub,
    sup,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
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
    script._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    const numeratorLatex = this.numerator.toLatex(mode);
    const denominatorLatex = this.denominator.toLatex(mode);
    return this.latexWithId(
      mode,
      String.raw`\frac{${numeratorLatex}}{${denominatorLatex}}`
    );
  }

  withChanges({
    id,
    parent,
    numerator,
    denominator,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    numerator?: AugmentedFormulaNode;
    denominator?: AugmentedFormulaNode;
  }): Fraction {
    const fraction = new Fraction(
      id ?? this.id,
      numerator ?? this.numerator,
      denominator ?? this.denominator
    );
    fraction._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    return this.latexWithId(mode, this.value.toString());
  }

  withChanges({
    id,
    parent,
    value,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    value?: string;
  }): MathSymbol {
    const symbol = new MathSymbol(id ?? this.id, value ?? this.value);
    symbol._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    const childrenLatex = this.body
      .map((child) => child.toLatex(mode))
      .join(" ");
    if (mode === "content-only") {
      return childrenLatex;
    }

    return this.latexWithId(
      mode,
      String.raw`\textcolor{${this.color}}{${childrenLatex}}`
    );
  }

  withChanges({
    id,
    parent,
    color,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    color?: string;
    body?: AugmentedFormulaNode[];
  }): Color {
    const colorNode = new Color(
      id ?? this.id,
      color ?? this.color,
      body ?? this.body
    );
    colorNode._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    const childrenLatex = this.body
      .map((child) => child.toLatex(mode))
      .join(" ");
    return this.body.length === 1
      ? this.latexWithId(mode, childrenLatex)
      : this.latexWithId(mode, String.raw`{${childrenLatex}}`);
  }

  withChanges({
    id,
    parent,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode[];
  }): Group {
    const group = new Group(id ?? this.id, body ?? this.body);
    group._parent = parent ?? this._parent;
    return group;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body;
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return this.body.length === 1
      ? this.body[0].toStyledRanges()
      : [
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

  toLatex(mode: LatexMode): string {
    const bodyLatex = this.body.toLatex(mode);

    if (mode === "content-only") {
      return bodyLatex;
    }

    return this.latexWithId(
      mode,
      // fcolorbox returns to text mode so the body must be wrapped in $
      String.raw`\fcolorbox{${this.borderColor}}{${this.backgroundColor}}{$${bodyLatex}$}`
    );
  }

  withChanges({
    id,
    parent,
    borderColor,
    backgroundColor,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
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
    box._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    const baseLatex = this.base.toLatex(mode);

    if (mode === "content-only") {
      return baseLatex;
    }

    const command = "\\" + (this.over ? "over" : "under") + "brace";
    return this.latexWithId(mode, String.raw`${command}{${baseLatex}}`);
  }

  withChanges({
    id,
    parent,
    over,
    base,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    over?: boolean;
    base?: AugmentedFormulaNode;
  }): Brace {
    const brace = new Brace(
      id ?? this.id,
      over ?? this.over,
      base ?? this.base
    );
    brace._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    const childrenLatex = this.body
      .map((child) => child.toLatex("no-id"))
      .join("");
    return this.latexWithId(mode, String.raw`\text{${childrenLatex}}`);
  }

  withChanges({
    id,
    parent,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode[];
  }): Text {
    const t = new Text(id ?? this.id, body ?? this.body);
    t._parent = parent ?? this._parent;
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

  toLatex(_: LatexMode): string {
    return this.text;
  }

  withChanges({
    id,
    parent,
    text,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    text?: string;
  }): Space {
    const space = new Space(id ?? this.id, text ?? this.text);
    space._parent = parent ?? this._parent;
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

  toLatex(mode: LatexMode): string {
    const rowsLatex = this.body
      .map((row) => row.map((cell) => cell.toLatex(mode)).join(" & "))
      .join(String.raw` \\` + "\n");

    if (mode === "content-only") {
      return rowsLatex;
    }

    return this.latexWithId(
      mode,
      `\\begin{aligned}\n${rowsLatex}\n\\end{aligned}`
    );
  }

  withChanges({
    id,
    parent,
    body,
  }: {
    id?: string;
    parent?: AugmentedFormulaNode | null;
    body?: AugmentedFormulaNode[][];
  }): Aligned {
    const aligned = new Aligned(id ?? this.id, body ?? this.body);
    aligned._parent = parent ?? this._parent;
    return aligned;
  }

  get children(): AugmentedFormulaNode[] {
    return this.body.flat();
  }

  toStyledRanges(): FormulaLatexRangeNode[] {
    return this.body.flatMap((row, i) =>
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
    );
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
