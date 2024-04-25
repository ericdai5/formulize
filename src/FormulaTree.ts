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

const deriveAugmentedFormula = (latex: string): AugmentedFormula => {
  const katexTrees = katex.__parse(latex, { strict: false, trust: true });

  const augmentedTrees = katexTrees.map((katexTree) =>
    buildAugmentedFormula(katexTree)
  );
  return new AugmentedFormula(augmentedTrees);
};

const buildAugmentedFormula = (
  katexTree: katex.ParseNode,
  id?: string
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
    case "supsub":
      return new Script(
        "",
        buildAugmentedFormula(katexTree.base!),
        katexTree.sub ? buildAugmentedFormula(katexTree.sub) : undefined,
        katexTree.sup ? buildAugmentedFormula(katexTree.sup) : undefined
      );
    case "atom":
    case "mathord":
    case "textord":
      return new MathSymbol(id ?? "", katexTree.text);
  }

  console.log("Failed to build:", katexTree);
};

// TODO: eventually this will also cover alternative code presentations (content
// only, with augmentations)
type LatexMode = "render" | "ast";

interface AugmentedFormulaNodeBase {
  toLatex(mode: LatexMode): string;
}

export class AugmentedFormula {
  public type = "formula" as const;
  constructor(public children: AugmentedFormulaNode[]) {}

  toLatex(mode: LatexMode): string {
    return this.children.map((child) => child.toLatex(mode)).join(" ");
  }
}

type AugmentedFormulaNode =
  | Script
  | Fraction
  | MathSymbol
  | NewLine
  | AlignMarker;

const withId = (mode: LatexMode, id: string, latex: string) => {
  switch (mode) {
    case "ast":
      return String.raw`\htmlId{${id}}{${latex}}`;
    case "render":
    default:
      return String.raw`\cssId{${id}}{${latex}}`;
  }
};

export class Script implements AugmentedFormulaNodeBase {
  public type = "script" as const;
  constructor(
    public id: string,
    public base: AugmentedFormulaNode,
    public sub?: AugmentedFormulaNode,
    public sup?: AugmentedFormulaNode
  ) {}

  toLatex(mode: LatexMode): string {
    return withId(
      mode,
      this.id,
      String.raw`${this.base.toLatex(mode)}${
        this.sub ? `_{${this.sub.toLatex(mode)}}` : ""
      }${this.sup ? `^{${this.sup.toLatex(mode)}}` : ""}`
      // String.raw`\fcolorbox{red}{white}{$${this.base.toLatex(mode)}${this.sub
      // ? `_{${this.sub.toLatex(mode)}}` : ""}${this.sup ?
      // `^{${this.sup.toLatex(mode)}}` : ""}$}`
    );
  }
}

export class Fraction implements AugmentedFormulaNodeBase {
  public type = "frac" as const;
  constructor(
    public id: string,
    public numerator: AugmentedFormulaNode,
    public denominator: AugmentedFormulaNode
  ) {}

  toLatex(mode: LatexMode): string {
    return String.raw`\frac{${this.numerator.toLatex(mode)}}{${this.denominator.toLatex(
      mode
    )}}`;
  }
}

export class MathSymbol implements AugmentedFormulaNodeBase {
  public type = "symbol" as const;
  constructor(
    public id: string,
    public value: string
  ) {}

  toLatex(mode: LatexMode): string {
    return withId(mode, this.id, this.value.toString());
  }
}

export class NewLine implements AugmentedFormulaNodeBase {
  public type = "newline" as const;
  constructor() {}

  toLatex(mode: LatexMode): string {
    return String.raw`\\`;
  }
}

export class AlignMarker implements AugmentedFormulaNodeBase {
  public type = "align" as const;
  constructor() {}

  toLatex(mode: LatexMode): string {
    return "&";
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
