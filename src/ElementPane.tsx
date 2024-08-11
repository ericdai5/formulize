import { css } from "@emotion/react";
import { createContext, useContext, useEffect, useState } from "react";

import { observer } from "mobx-react-lite";

import Icon from "@mui/material/Icon";

import { AugmentedFormulaNode, Box, Brace, Color, Group } from "./FormulaTree";
import { ColorPicker, ColorSwatch } from "./Menu";
import { assertUnreachable, replaceNodes } from "./formulaTransformations";
import { formulaStore, selectionStore } from "./store";

import CurlyBraceListOption from "./Icons/CurlyBraceListOption.svg";

const ElementPaneContext = createContext<{
  collapsed: { [key: string]: boolean };
  onCollapse: (id: string, collapsed: boolean) => void;
}>({ collapsed: {}, onCollapse: () => {} });

export const ElementPane = observer(() => {
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});
  const onCollapse = (id: string, isCollapsed: boolean) => {
    setCollapsed({ ...collapsed, [id]: isCollapsed });
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
            setCollapsed({});
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
            const newCollapsed: { [key: string]: boolean } = {};
            const collapse = (node: AugmentedFormulaNode) => {
              if (node.children.length > 0) {
                newCollapsed[node.id] = true;
                node.children.forEach(collapse);
              }
            };
            formulaStore.augmentedFormula.children.forEach(collapse);
            setCollapsed(newCollapsed);
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
        <ElementPaneContext.Provider
          value={{ collapsed: collapsed, onCollapse: onCollapse }}
        >
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
  const { collapsed, onCollapse } = useContext(ElementPaneContext);

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
          onClick={() => onCollapse(tree.id, !collapsed[tree.id])}
        >
          <Icon>{collapsed[tree.id] ? "chevron_right" : "expand_more"}</Icon>
        </div>
        <TreeElement tree={tree} />
      </div>
      <div
        css={css`
          margin-left: 1rem;
        `}
      >
        {!collapsed[tree.id] &&
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
    case "group":
      return <LabeledNode tree={tree} label="Group" />;
    case "array":
      return <LabeledNode tree={tree} label="Array" />;
    case "brace":
      return <BraceNode tree={tree} />;
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

const BraceNode = ({ tree }: { tree: Brace }) => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
      `}
    >
      <div
        css={css`
          display: flex;
          justify-content: center;
          align-items: center;
          transform: ${tree.over ? "rotate(90deg)" : "rotate(-90deg)"};
          cursor: pointer;
          padding: 0.2rem;
          margin-right: 0.5rem;

          &:hover {
            background: #e0e0e0;
          }
        `}
        title={tree.over ? "Make underbrace" : "Make overbrace"}
        onClick={() => {
          formulaStore.updateFormula(
            replaceNodes(formulaStore.augmentedFormula, (node) => {
              if (node.type === "brace" && node.id === tree.id) {
                return node.withChanges({ over: !tree.over });
              }
              return node;
            })
          );
        }}
      >
        <img
          css={css`
            width: 1rem;
            height: 1rem;
          `}
          src={CurlyBraceListOption}
        />
      </div>
      <LabeledNode tree={tree} label="Brace" deletable />
    </div>
  );
};

const ColorNode = ({ tree }: { tree: Color }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);

    () => {
      window.removeEventListener("click", close);
    };
  }, [setOpen]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
      `}
    >
      <div
        css={css`
          position: relative;
          margin-right: 0.5rem;
        `}
      >
        <div
          css={css`
            cursor: pointer;
          `}
        >
          <ColorSwatch
            color={tree.color}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          />
        </div>
        {open && (
          <div
            css={css`
              position: absolute;
              top: 1rem;
              left: 0;
              z-index: 1;
              background: #f0f0f0;
              border: 1px solid #000000;
            `}
          >
            <ColorPicker
              onSelect={(color) => {
                formulaStore.updateFormula(
                  replaceNodes(formulaStore.augmentedFormula, (node) => {
                    if (node.type === "color" && node.id === tree.id) {
                      return node.withChanges({ color });
                    }
                    return node;
                  })
                );
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
      <LabeledNode tree={tree} label="Color" deletable />
    </div>
  );
};

const BoxNode = ({ tree }: { tree: Box }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);

    () => {
      window.removeEventListener("click", close);
    };
  }, [setOpen]);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
      `}
    >
      <div
        css={css`
          position: relative;
          margin-right: 0.5rem;
        `}
      >
        <div
          css={css`
            cursor: pointer;
          `}
        >
          <ColorSwatch
            color={tree.borderColor}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          />
        </div>
        {open && (
          <div
            css={css`
              position: absolute;
              top: 1rem;
              left: 0;
              z-index: 1;
              background: #f0f0f0;
              border: 1px solid #000000;
            `}
          >
            <ColorPicker
              onSelect={(borderColor) => {
                formulaStore.updateFormula(
                  replaceNodes(formulaStore.augmentedFormula, (node) => {
                    if (node.type === "box" && node.id === tree.id) {
                      return node.withChanges({ borderColor });
                    }
                    return node;
                  })
                );
                setOpen(false);
              }}
            />
          </div>
        )}
      </div>
      <LabeledNode tree={tree} label="Box" deletable />
    </div>
  );
};
