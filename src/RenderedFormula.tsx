import { useRef, useEffect } from "react";
import { css } from "@emotion/react";
import { observer } from "mobx-react-lite";
import { MathJaxContext, MathJax } from "better-react-mathjax";

import { formulaStore, selectionStore, styleStore } from "./store";
import { deriveFormulaTree, RenderSpec } from "./FormulaTree";

export const RenderedFormula = observer(() => {
  useEffect(() => {
    formulaStore.updateFormula(
      deriveFormulaTree("a^2 + b^2 + d^2 = c^2").augmentedFormula,
    );
  }, []);

  console.log("Rendering spec:", formulaStore.renderSpec);
  return (
    <div>
      {"My component:"}
      {formulaStore.renderSpec !== null && (
        <RenderedFormulaComponent spec={formulaStore.renderSpec} />
      )}
      <br />
    </div>
  );
});

const RenderedFormulaComponent = ({ spec }: { spec: RenderSpec }) => {
  const Tag = spec.tagName;
  return (
    // TODO: React throws a seemingly harmless error about `class` vs `className`
    // @ts-expect-error This is an arbitrary tag, we can't statically type it
    <Tag id={spec.id} class={spec.className} style={spec.style} {...spec.attrs}>
      {spec.children?.map((child, i) => (
        <RenderedFormulaComponent key={i} spec={child} />
      ))}
    </Tag>
  );
};
