import { useRef, useEffect } from "react";
import { css } from "@emotion/react";
import { observer } from "mobx-react-lite";
import { MathJaxContext, MathJax } from "better-react-mathjax";

import { formulaStore, selectionStore, styleStore } from "./store";
import {
  deriveFormulaTree,
  FormulaSVGSpecNode,
  FormulaSVGTransform,
} from "./FormulaTree";

export const RenderedFormula = () => {
  // useEffect(() => {
  //   formulaStore.updateFormula(deriveFormulaTree("a + b = c").augmentedFormula);
  // }, []);

  // return <RenderedFormulaSVG />;
  return <RenderedFormulaComponent />;
};

const RenderedFormulaComponent = () => {
  console.log("Rendering");
  const ref = useRef<Element>(null);
  useEffect(() => {
    if (ref.current) {
      window.mathjaxWrapper = ref.current;
    }
  }, [ref.current]);

  return (
    <MathJaxContext
      version={3}
      config={{
        loader: {
          load: ["input/tex", "output/chtml", "[tex]/color", "[tex]/html"],
        },
        tex: { packages: { "[+]": ["color", "html"] } },
      }}
    >
      <div
        css={css`
          transform: scale(4);
        `}
        ref={ref}
      >
        <MathJax
          hideUntilTypeset={"first"}
          renderMode={"pre"}
          text={String.raw`\cssId{aSquared}{\cssId{a}{a}^\cssId{squared}{2}}`}
          typesettingOptions={{
            fn: "tex2chtml",
          }}
          onInitTypeset={() => {
            console.log("Initial typeset");
          }}
          onTypeset={() => {
            console.log("Typeset");
          }}
        />
      </div>
    </MathJaxContext>
  );
};

const RenderedFormulaSVG = observer(() => {
  return (
    <svg
      css={css`
        transform: scale(4);
      `}
      xmlns="http://www.w3.org/2000/svg"
      width={formulaStore.widthAttr}
      height={formulaStore.heightAttr}
      role="img"
      focusable="false"
      viewBox={formulaStore.viewboxAttr}
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <RenderedFormulaDefs defs={formulaStore.svgSpec.defs} />
      <RenderedFormulaNode node={formulaStore.svgSpec.root} />
    </svg>
  );
});

const RenderedFormulaDefs = ({
  defs,
}: {
  defs: { id: string; d: string }[];
}) => {
  return (
    <defs>
      {defs.map((def) => (
        <path key={def.id} id={def.id} d={def.d}></path>
      ))}
    </defs>
  );
};

const transformString = (spec: FormulaSVGTransform) => {
  let transform = "";
  if (spec.scale) {
    transform += `scale(${spec.scale.x}, ${spec.scale.y}) `;
  }
  if (spec.translate) {
    transform += `translate(${spec.translate.x}, ${spec.translate.y}) `;
  }
  return transform.length > 0 ? transform : undefined;
};

const RenderedFormulaNode = ({ node }: { node: FormulaSVGSpecNode }) => {
  if (node.type === "g") {
    return (
      <g id={node.id} transform={transformString(node.transform)}>
        {node.children?.map((child) => (
          <RenderedFormulaNode key={child.id} node={child} />
        ))}
      </g>
    );
  } else if (node.type === "use") {
    return <RenderedFormulaLeaf id={node.id} linkHref={node.linkHref!} />;
  } else if (node.type === "rect") {
    return (
      <rect
        id={node.id}
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
      />
    );
  } else {
    return "?";
  }
};

// TODO: Very temporary
type FormulaLeafProps = {
  id: string;
  linkHref: string;
};

const RenderedFormulaLeaf = observer(({ id, linkHref }: FormulaLeafProps) => {
  const ref = useRef<SVGUseElement>(null);
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      selectionStore.updateTarget(
        id,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
      );
    }
  }, [id, linkHref]);

  return (
    <use
      id={id}
      onClick={() => selectionStore.toggle(id)}
      fill={
        selectionStore.currentlyDragged.includes(id)
          ? "red"
          : selectionStore.selected.includes(id)
            ? "blue"
            : styleStore.color.get(id) ?? "currentColor"
      }
      xlinkHref={linkHref}
      ref={ref}
    ></use>
  );
});
