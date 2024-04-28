// import * as prettier from "prettier/standalone";
// import * as babelPlugin from "prettier/parser-babel";
// import * as estreePlugin from "prettier/plugins/estree";
// import katex from "katex";

export const debugLatex = async (latex: string) => {
  // const html: Element = MathJax.tex2chtml(latex);
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
    document.body.appendChild(debugDiv);
  }
  debugDiv.innerHTML = katexRendered;

  const parsed = deriveAugmentedFormula(latex);
  console.log("Parsed augmented formula:", parsed);
};

window.debugLatex = debugLatex;

export const updateFormula = (
  newFormula: AugmentedFormula
): {
  renderSpec: RenderSpec;
  augmentedFormula: AugmentedFormula;
} => {
  console.log("Rendering:", newFormula);
  const renderLatex = newFormula.toLatex("render");
  console.log("LaTeX:", renderLatex);
  const chtml = MathJax.tex2chtml(renderLatex);
  const renderSpec = deriveRenderSpec(chtml);
  console.log("Render spec:", renderSpec);

  // MathJax rendering requires appending new styles to the document
  // TODO: Don't know what this does when there are multiple formulas
  MathJax.startup.document.clear();
  MathJax.startup.document.updateDocument();

  // TODO: parse AugmentedFormula from LaTeX
  const augmentedFormula = deriveAugmentedFormula(newFormula.toLatex("ast"));
  console.log("Augmented formula:", augmentedFormula);

  return {
    renderSpec,
    augmentedFormula,
  };
};

export const deriveAugmentedFormula = (latex: string): AugmentedFormula => {
  const katexTrees = katex.__parse(latex, { strict: false, trust: true });

  const augmentedTrees = katexTrees.map((katexTree, i) =>
    buildAugmentedFormula(katexTree, `${i}`)
  );
  console.log("Augmented trees:", augmentedTrees);
  return new AugmentedFormula(augmentedTrees);
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
    case "ordgroup": {
      const children = katexTree.body.map((child, i) =>
        buildAugmentedFormula(child, `${id}.${i}`)
      );
      const group = new Group(id, children);
      children.forEach((child) => (child._parent = group));
      return group;
    }
  }

  console.log("Failed to build:", katexTree);
};

// TODO: eventually this will also cover alternative code presentations (content
// only, with augmentations)
type LatexMode = "render" | "ast";

export class AugmentedFormula {
  constructor(public children: AugmentedFormulaNode[]) {}

  toLatex(mode: LatexMode): string {
    return this.children.map((child) => child.toLatex(mode)).join(" ");
  }
}

export type AugmentedFormulaNode =
  | Script
  | Fraction
  | MathSymbol
  | Color
  | Group;

abstract class AugmentedFormulaNodeBase {
  public _parent: AugmentedFormulaNode | null = null;
  constructor(public id: string) {}

  protected latexWithId(mode: LatexMode, latex: string): string {
    switch (mode) {
      case "ast":
        return String.raw`\htmlId{${this.id}}{${latex}}`;
      case "render":
      default:
        return String.raw`\cssId{${this.id}}{${latex}}`;
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
    const baseLatex = String.raw`{${this.base.toLatex(mode)}}`;
    const subLatex = this.sub ? String.raw`_{${this.sub.toLatex(mode)}}` : "";
    const supLatex = this.sup ? String.raw`^{${this.sup.toLatex(mode)}}` : "";
    return String.raw`{${baseLatex}${subLatex}${supLatex}}`;
    // return withId(
    //   mode,
    //   this.id,
    //   String.raw`\fcolorbox{red}{white}{$${this.base.toLatex(mode)}${this.sub
    //   ? `_{${this.sub.toLatex(mode)}}` : ""}${this.sup ?
    //   `^{${this.sup.toLatex(mode)}}` : ""}$}`
    // );
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
    return String.raw`\frac{${numeratorLatex}}{${denominatorLatex}}`;
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
    return String.raw`\textcolor{${this.color}}{${childrenLatex}}`;
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
    return String.raw`{${childrenLatex}}`;
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
    Array.from(node.style).map((prop) => [
      // https://stackoverflow.com/a/60738940
      prop.replace(/-./g, (x) => x[1].toUpperCase()),
      node.style[prop as string],
    ])
  );
};
