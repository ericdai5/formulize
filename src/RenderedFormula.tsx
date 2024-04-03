import { useRef, useEffect } from "react";
import { css } from "@emotion/react";
import { observer } from "mobx-react-lite";

import {
  selectionStore,
  styleStore,
  formulaStore,
  IFormulaNode,
} from "./store";

export const RenderedFormula = () => {
  return <RenderedFormulaSVG />;
};

const RenderedFormulaSVG = observer(() => {
  return (
    <svg
      css={css`
        transform: scale(4);
      `}
      xmlns="http://www.w3.org/2000/svg"
      width={`${11.893}ex`}
      height="2.185ex"
      role="img"
      focusable="false"
      viewBox="0 -883.9 5256.7 965.9"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <RenderedFormulaDefs defs={formulaStore.defs} />
      <RenderedFormulaNode node={formulaStore.root} />
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

function transformString(node: IFormulaNode) {
  let transform = "";
  if (node.translateX !== undefined && node.translateY !== undefined) {
    transform += `translate(${node.translateX},${node.translateY}) `;
  }

  if (node.scaleX !== undefined && node.scaleY !== undefined) {
    transform += `scale(${node.scaleX},${node.scaleY})`;
  }
  return transform.length > 0 ? transform : undefined;
}

const RenderedFormulaNode = ({ node }: { node: IFormulaNode }) => {
  if (node.nodeType === "g") {
    return (
      <g data-mml-node={node.mmlNode} transform={transformString(node)}>
        {node.children?.map((child) => (
          <RenderedFormulaNode key={child.id} node={child} />
        ))}
      </g>
    );
  } else if (node.nodeType === "use") {
    return <RenderedFormulaLeaf id={node.id} linkHref={node.linkHref!} />;
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
