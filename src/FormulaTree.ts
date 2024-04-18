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
  augmentedFormula: AugmentedFormula;
} => {
  const chtml = MathJax.tex2chtml(latex);
  const renderSpec = deriveRenderSpec(chtml);

  // MathJax rendering requires appending new styles to the document
  MathJax.startup.document.clear();
  MathJax.startup.document.updateDocument();

  // TODO: parse AugmentedFormula from LaTeX

  return {
    renderSpec,
    augmentedFormula: new AugmentedFormula([
      new Script(
        "0.0.0",
        new Identifier("0.0.0.0", "a"),
        undefined,
        new Numeral("0.0.0.1", 2),
      ),
      new Op("0.0.1", "+"),
      new Script(
        "0.0.2",
        new Identifier("0.0.2.0", "b"),
        undefined,
        new Numeral("0.0.2.1", 2),
      ),
      new Op("0.0.3", "="),
      new Script(
        "0.0.4",
        new Identifier("0.0.4.0", "c"),
        undefined,
        new Numeral("0.0.4.1", 2),
      ),
    ]),
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

class Script implements AugmentedFormulaNodeBase {
  public type = "script" as const;
  constructor(
    public svgId: string,
    public base: AugmentedFormulaNode,
    public sub?: AugmentedFormulaNode,
    public sup?: AugmentedFormulaNode,
  ) {}

  toLatex(): string {
    return `${this.base.toLatex()}${this.sub ? `_{${this.sub.toLatex()}}` : ""}${this.sup ? `^{${this.sup.toLatex()}}` : ""}`;
  }
}

/**
 * Multiple terms separated by the same operator, e.g. `a + b + c`
 */
class Op implements AugmentedFormulaNodeBase {
  public type = "op" as const;
  constructor(
    public svgId: string,
    public op: string,
  ) {}

  toLatex(): string {
    return this.op;
  }
}

class Fraction implements AugmentedFormulaNodeBase {
  public type = "frac" as const;
  constructor(
    public svgId: string,
    public numerator: AugmentedFormulaNode,
    public denominator: AugmentedFormulaNode,
  ) {}

  toLatex(): string {
    return String.raw`\frac{${this.numerator.toLatex()}}{${this.denominator.toLatex()}}`;
  }
}

class Identifier implements AugmentedFormulaNodeBase {
  public type = "ident" as const;
  constructor(
    public svgId: string,
    public name: string,
  ) {}

  toLatex(): string {
    return this.name;
  }
}

class Numeral implements AugmentedFormulaNodeBase {
  public type = "number" as const;
  constructor(
    public svgId: string,
    public value: number,
  ) {}

  toLatex(): string {
    return this.value.toString();
  }
}

class NewLine implements AugmentedFormulaNodeBase {
  public type = "newline" as const;
  constructor() {}

  toLatex(): string {
    return String.raw`\\`;
  }
}

class AlignMarker implements AugmentedFormulaNodeBase {
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
