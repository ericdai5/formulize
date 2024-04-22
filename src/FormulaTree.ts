import * as prettier from "prettier/standalone";
import * as babelPlugin from "prettier/parser-babel";
import * as estreePlugin from "prettier/plugins/estree";

export const debugLatex = async (latex: string) => {
  const html: Element = MathJax.tex2chtml(latex);
  const formattedHtml = await prettier.format(html.outerHTML, {
    parser: "babel",
    plugins: [babelPlugin, estreePlugin],
  });
  window.mjxDebug = html;
  console.log(formattedHtml);

  const renderSpec = deriveRenderSpec(html);
  console.log(renderSpec);
};

window.debugLatex = debugLatex;

export const deriveFormulaTree = (
  latex: string,
): {
  renderSpec: RenderSpec;
} => {
  console.log("Rendering:", latex);
  const chtml = MathJax.tex2chtml(latex);
  const renderSpec = deriveRenderSpec(chtml);

  // MathJax rendering requires appending new styles to the document
  MathJax.startup.document.clear();
  MathJax.startup.document.updateDocument();

  // TODO: parse AugmentedFormula from LaTeX

  return {
    renderSpec,
  };
};

interface AugmentedFormulaNodeBase {
  toLatex(): string;
}

export class AugmentedFormula {
  public type = "formula" as const;
  constructor(public children: AugmentedFormulaNode[]) {}

  toLatex(): string {
    return this.children.map((child) => child.toLatex()).join(" ");
  }
}

type AugmentedFormulaNode =
  | Script
  | Fraction
  | Op
  | Identifier
  | Numeral
  | NewLine
  | AlignMarker;

const withId = (id: string, latex: string) => {
  return String.raw`\cssId{${id}}{${latex}}`;
};

export class Script implements AugmentedFormulaNodeBase {
  public type = "script" as const;
  constructor(
    public id: string,
    public base: AugmentedFormulaNode,
    public sub?: AugmentedFormulaNode,
    public sup?: AugmentedFormulaNode,
  ) {}

  toLatex(): string {
    return withId(
      this.id,
      String.raw`\fcolorbox{red}{white}{$${this.base.toLatex()}${this.sub ? `_{${this.sub.toLatex()}}` : ""}${this.sup ? `^{${this.sup.toLatex()}}` : ""}$}`,
    );
  }
}

/**
 * Multiple terms separated by the same operator, e.g. `a + b + c`
 */
export class Op implements AugmentedFormulaNodeBase {
  public type = "op" as const;
  constructor(
    public id: string,
    public op: string,
  ) {}

  toLatex(): string {
    return withId(this.id, this.op);
  }
}

export class Fraction implements AugmentedFormulaNodeBase {
  public type = "frac" as const;
  constructor(
    public id: string,
    public numerator: AugmentedFormulaNode,
    public denominator: AugmentedFormulaNode,
  ) {}

  toLatex(): string {
    return String.raw`\frac{${this.numerator.toLatex()}}{${this.denominator.toLatex()}}`;
  }
}

export class Identifier implements AugmentedFormulaNodeBase {
  public type = "ident" as const;
  constructor(
    public id: string,
    public name: string,
  ) {}

  toLatex(): string {
    return withId(this.id, this.name);
  }
}

export class Numeral implements AugmentedFormulaNodeBase {
  public type = "number" as const;
  constructor(
    public id: string,
    public value: number,
  ) {}

  toLatex(): string {
    return withId(this.id, this.value.toString());
  }
}

export class NewLine implements AugmentedFormulaNodeBase {
  public type = "newline" as const;
  constructor() {}

  toLatex(): string {
    return String.raw`\\`;
  }
}

export class AlignMarker implements AugmentedFormulaNodeBase {
  public type = "align" as const;
  constructor() {}

  toLatex(): string {
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
        .map((attr) => [attr.name, attr.value]),
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
    ]),
  );
};
