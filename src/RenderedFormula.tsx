import { useEffect } from "react";
import { css } from "@emotion/react";
import { observer } from "mobx-react-lite";
import { useInView } from "react-intersection-observer";

import { formulaStore, selectionStore, styleStore } from "./store";
import {
  RenderSpec,
  AugmentedFormula,
  Script,
  Identifier,
  Numeral,
  Op,
  NewLine,
} from "./FormulaTree";

window.testMutateFormula = () => {
  formulaStore.updateFormula(
    new AugmentedFormula([
      ...formulaStore.augmentedFormula.children.slice(0, -1),
      new NewLine(),
      ...formulaStore.augmentedFormula.children.slice(-1),
    ]),
  );
};

export const RenderedFormula = observer(() => {
  useEffect(() => {
    formulaStore.updateFormula(
      new AugmentedFormula([
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
    );
  }, []);

  console.log("Rendering spec:", formulaStore.renderSpec);
  return (
    <div
      css={css`
        transform: scale(4);
      `}
    >
      {formulaStore.renderSpec !== null && (
        <RenderedFormulaComponent spec={formulaStore.renderSpec} />
      )}
      <br />
    </div>
  );
});

const RenderedFormulaComponent = ({ spec }: { spec: RenderSpec }) => {
  return ["mjx-mi", "mjx-mn", "mjx-mo"].includes(spec.tagName) ? (
    <TargetableFormulaNode spec={spec} />
  ) : (
    <GenericFormulaNode spec={spec} />
  );
};

const GenericFormulaNode = ({ spec }: { spec: RenderSpec }) => {
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

const TargetableFormulaNode = observer(({ spec }: { spec: RenderSpec }) => {
  const { ref, entry } = useInView();

  useEffect(() => {
    if (entry && spec.id) {
      selectionStore.updateTarget(
        spec.id,
        entry.boundingClientRect.left,
        entry.boundingClientRect.top,
        entry.boundingClientRect.width,
        entry.boundingClientRect.height,
      );
    }
  }, [entry, spec.id]);

  const Tag = spec.tagName;
  return (
    // TODO: React throws a seemingly harmless error about `class` vs `className`
    // @ts-expect-error This is an arbitrary tag, we can't statically type it
    <Tag id={spec.id} class={spec.className} style={spec.style} {...spec.attrs}>
      <div
        css={css`
          display: inline-block;
          position: relative;

          color: ${spec.id ? styleStore.color.get(spec.id) : "black"};

          ${spec.id &&
          (selectionStore.currentlyDragged.includes(spec.id) ||
            selectionStore.selected.includes(spec.id))
            ? `&:after {
            position: absolute;
            content: "";
            top: -0.1rem;
            bottom: -0.1rem;
            left: -0.1rem;
            right: -0.1rem;
            outline: 1px dashed black;
          }`
            : ""}
        `}
        ref={ref}
      >
        {spec.children?.map((child, i) => (
          <RenderedFormulaComponent key={i} spec={child} />
        ))}
      </div>
    </Tag>
  );
});
