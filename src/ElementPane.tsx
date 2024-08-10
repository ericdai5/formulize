import { css } from "@emotion/react";
import { createContext, useContext, useState } from "react";

import { observer } from "mobx-react-lite";

import Icon from "@mui/material/Icon";

import { AugmentedFormulaNode } from "./FormulaTree";
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
              newExpanded[node.id] = true;
              node.children.forEach(expand);
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
        {tree.type} {tree.id}
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
