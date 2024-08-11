import { css } from "@emotion/react";
import { createContext, useContext, useState } from "react";

import { observer } from "mobx-react-lite";

import Icon from "@mui/material/Icon";

import { AugmentedFormulaNode, Box, Color, Group } from "./FormulaTree";
import { assertUnreachable, replaceNodes } from "./formulaTransformations";
import { formulaStore, selectionStore } from "./store";

const ElementPaneContext = createContext<{
  expanded: { [key: string]: boolean };
  onExpand: (id: string, expanded: boolean) => void;
}>({ expanded: {}, onExpand: () => {} });

export const ElementPane = observer(() => {
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const onExpand = (id: string, exp: boolean) => {
    setExpanded({ ...expanded, [id]: exp });
  };

  return (
    <div
      css={css`
        padding-top: 0;
        padding-left: 1rem;
        padding-right: 1rem;
        padding-bottom: 1rem;
        font-family: "Source Sans 3", sans-serif;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        user-select: none;
      `}
    >
      <h1
        css={css`
          font-size: 1.5rem;
          cursor: default;
        `}
      >
        Elements
      </h1>
      <div
        css={css`
          display: flex;
          flex-direction: row;
          margin-bottom: 0.5rem;
        `}
      >
        <div
          title="Expand all"
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            &:hover {
              background: #ffffff;
            }
          `}
          onClick={() => {
            const newExpanded: { [key: string]: boolean } = {};
            const expand = (node: AugmentedFormulaNode) => {
              if (node.children.length > 0) {
                newExpanded[node.id] = true;
                node.children.forEach(expand);
              }
            };
            formulaStore.augmentedFormula.children.forEach(expand);
            setExpanded(newExpanded);
          }}
        >
          <Icon>unfold_more</Icon>
        </div>
        <div
          title="Collapse all"
          css={css`
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            &:hover {
              background: #ffffff;
            }
          `}
          onClick={() => {
            setExpanded({});
          }}
        >
          <Icon>unfold_less</Icon>
        </div>
      </div>
      <div
        css={css`
          border: 1px solid;
          overflow-y: auto;
          flex-grow: 1;
        `}
      >
        <ElementPaneContext.Provider value={{ expanded, onExpand }}>
          {formulaStore.augmentedFormula.children.map((tree) => (
            <div css={css``} key={tree.id}>
              <ElementTree tree={tree} />
            </div>
          ))}
        </ElementPaneContext.Provider>
      </div>
    </div>
  );
});

const ElementTree = observer(({ tree }: { tree: AugmentedFormulaNode }) => {
  const { expanded, onExpand } = useContext(ElementPaneContext);

  return (
    <div
      css={css`
        background: ${selectionStore.siblingSelections.some((siblingIds) =>
          siblingIds.includes(tree.id)
        )
          ? "#cceeff"
          : "transparent"};
        border-left: 1px solid #00000030;
      `}
    >
      <div
        css={css`
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: center;
          padding: 0.2rem 0;
          cursor: default;
        `}
      >
        <div
          css={css`
            visibility: ${tree.children.length === 0 ? "hidden" : "visible"};
            cursor: pointer;
          `}
          onClick={() => onExpand(tree.id, !expanded[tree.id])}
        >
          <Icon>{expanded[tree.id] ? "expand_more" : "chevron_right"}</Icon>
        </div>
        <TreeElement tree={tree} />
      </div>
      <div
        css={css`
          margin-left: 1rem;
        `}
      >
        {expanded[tree.id] &&
          tree.children.map((child) => (
            <ElementTree tree={child} key={child.id} />
          ))}
      </div>
    </div>
  );
});

const TreeElement = ({ tree }: { tree: AugmentedFormulaNode }) => {
  switch (tree.type) {
    case "symbol":
      return <LabeledNode tree={tree} label={tree.value} />;
    case "space":
      return <LabeledNode tree={tree} label="␣" />;
    case "text":
      return (
        <LabeledNode
          tree={tree}
          label={tree.body
            .map((node) => (node.type === "symbol" ? node.value : ""))
            .join("")}
        />
      );
    case "op":
      return <LabeledNode tree={tree} label={String.raw`\${tree.operator}`} />;
    case "frac":
      return <LabeledNode tree={tree} label="Fraction" />;
    case "script":
      return <LabeledNode tree={tree} label="Script" />;
    case "root":
      return <LabeledNode tree={tree} label="Root" />;
    case "brace":
      return <LabeledNode tree={tree} label="Brace" />;
    case "group":
      return <LabeledNode tree={tree} label="Group" />;
    case "array":
      return <LabeledNode tree={tree} label="Array" />;
    case "color":
      return <ColorNode tree={tree} />;
    case "box":
      return <BoxNode tree={tree} />;
    case "strikethrough":
      return <LabeledNode tree={tree} label="Strikethrough" deletable />;
    default:
      assertUnreachable(tree);
  }
};

const LabeledNode = ({
  tree,
  label,
  deletable,
}: {
  tree: AugmentedFormulaNode;
  label: string;
  deletable?: boolean;
}) => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      `}
      onClick={() => {
        selectionStore.selectOnly(tree.id);
      }}
    >
      {label}
      <div
        css={css`
          visibility: ${deletable ? "visible" : "hidden"};
        `}
        onClick={(e) => {
          e.stopPropagation();
          formulaStore.updateFormula(
            replaceNodes(formulaStore.augmentedFormula, (node) => {
              if (node.id === tree.id) {
                return new Group(tree.id, tree.children);
              }
              return node;
            })
          );
        }}
      >
        <Icon
          css={css`
            cursor: pointer;
            margin-right: 0.5rem;
            &:hover {
              color: red;
            }
          `}
        >
          close
        </Icon>
      </div>
    </div>
  );
};

const ColorNode = ({ tree }: { tree: Color }) => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
      `}
    >
      <div
        css={css`
          width: 1rem;
          height: 1rem;
          background: ${tree.color};
          border: 1px solid black;
          margin-right: 0.5rem;
        `}
      />
      <LabeledNode tree={tree} label="Color" deletable />
    </div>
  );
};

const BoxNode = ({ tree }: { tree: Box }) => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
      `}
    >
      <div
        css={css`
          width: 1rem;
          height: 1rem;
          background: ${tree.borderColor};
          border: 1px solid black;
          margin-right: 0.5rem;
        `}
      />
      <LabeledNode tree={tree} label="Box" deletable />
    </div>
  );
};
