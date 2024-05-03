import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { Children, useEffect, useState } from "react";

import { toJS } from "mobx";
import { observer } from "mobx-react-lite";

import {
  AugmentedFormula,
  MathSymbol,
  RenderSpec,
  Script,
  deriveAugmentedFormula,
} from "./FormulaTree";
import { formulaStore, selectionStore } from "./store";

window.testMutateFormula = () => {
  window.mutatedTimes = (window.mutatedTimes || 0) + 1;

  formulaStore.updateFormula(
    new AugmentedFormula([
      ...formulaStore.augmentedFormula.children.slice(0, -1),
      new MathSymbol(`t${window.mutatedTimes}`, "t"),
      new MathSymbol(`+${window.mutatedTimes}`, "+"),
      ...formulaStore.augmentedFormula.children.slice(-1),
    ])
  );
};

window.setFormula = (latex: string) => {
  formulaStore.updateFormula(deriveAugmentedFormula(latex));
  selectionStore.updateTargets();
};

export const RenderedFormula = observer(() => {
  useEffect(() => {
    formulaStore.updateFormula(deriveAugmentedFormula("a^2 + b^2 = c^2"));
  }, []);

  useEffect(() => {
    const resizeHandler = () => {
      selectionStore.updateTargets();
    };
    window.addEventListener("resize", resizeHandler);

    () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  useEffect(() => {
    console.log("Updating targets");
    requestAnimationFrame(() => {
      selectionStore.updateTargets();
    });
  });

  return (
    <div
      style={{
        transform: `translate(${selectionStore.pan.x}px, ${selectionStore.pan.y}px) scale(${selectionStore.zoom})`,
      }}
    >
      {formulaStore.renderSpec !== null && (
        <RenderedFormulaComponent spec={toJS(formulaStore.renderSpec)} />
      )}
    </div>
  );
});

const RenderedFormulaComponent = observer(({ spec }: { spec: RenderSpec }) => {
  const [ref, setRef] = useState<Element | null>(null);
  useEffect(() => {
    if (spec.id && ref) {
      console.log("Got element ref", ref);
      selectionStore.addTarget(
        spec.id,
        ref,
        ["mjx-mi", "mjx-mn", "mjx-mo"].includes(spec.tagName)
      );
      requestAnimationFrame(() => {
        selectionStore.updateTargets();
      });
    }

    () => {
      console.log("Target cleanup running");
      if (spec.id) {
        selectionStore.removeTarget(spec.id);
      }
    };
  }, [ref, spec.id]);

  const Tag = spec.tagName;
  return (
    // TODO: React throws a seemingly harmless error about `class` vs `className`
    // @ts-expect-error This is an arbitrary tag, we can't statically type it
    <Tag
      id={spec.id}
      class={spec.className}
      style={spec.style}
      {...spec.attrs}
      ref={(ref: unknown) => setRef(ref as Element)}
    >
      {spec.children?.map((child, i) => (
        <RenderedFormulaComponent key={i} spec={child} />
      ))}
    </Tag>
  );
});
