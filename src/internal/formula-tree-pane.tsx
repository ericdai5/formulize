import { createContext, useContext, useState } from "react";

import { observer } from "mobx-react-lite";

import { ChevronRight, X } from "lucide-react";
import { ChevronsDownUp } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";

import { assertUnreachable, replaceNodes } from "../util/parse/formula-transform";
import {
  AugmentedFormulaNode,
  Box,
  Brace,
  Color,
  Group,
  Script,
  Variable,
} from "../util/parse/formula-tree";
import { FormulaStore, formulaStoreManager } from "../store/formulas";

import CurlyBraceListOptionIcon from "/CurlyBraceListOption.svg";

const FormulaElementPaneContext = createContext<{
  collapsed: { [key: string]: boolean };
  onCollapse: (id: string, collapsed: boolean) => void;
  selectedNodes: Set<string>;
  onSelectNode: (id: string) => void;
}>({
  collapsed: {},
  onCollapse: () => {},
  selectedNodes: new Set(),
  onSelectNode: () => {},
});

interface FormulaTreePaneProps {
  formulaStore?: FormulaStore;
  storeId?: string;
}

export const FormulaTreePane = observer(
  ({ formulaStore, storeId }: FormulaTreePaneProps) => {
    // Get the store either from props or from the manager using storeId or default to first store
    const store =
      formulaStore ||
      (storeId ? formulaStoreManager.getStore(storeId) : null) ||
      formulaStoreManager.allStores[0] ||
      null;

    const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});
    const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

    const onCollapse = (id: string, isCollapsed: boolean) => {
      setCollapsed({ ...collapsed, [id]: isCollapsed });
    };

    const onSelectNode = (id: string) => {
      // Simple selection - just toggle single node selection
      const newSelection = new Set(selectedNodes);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.clear();
        newSelection.add(id);
      }
      setSelectedNodes(newSelection);
    };

    if (!store || !store.augmentedFormula) {
      return (
        <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
          <div className="flex flex-row justify-between items-center">
            <h1 className="text-base">Elements</h1>
          </div>
          <div className="text-gray-500 text-sm">No formula available</div>
        </div>
      );
    }

    return (
      <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-base">Elements</h1>
          <div className="flex flex-row">
            <div
              title="Expand all"
              className="flex justify-center items-center cursor-pointer hover:bg-gray-100 rounded-md p-1"
              onClick={() => {
                setCollapsed({});
              }}
            >
              <ChevronsUpDown
                size={16}
                className="text-slate-600 hover:text-slate-900"
              />
            </div>
            <div
              title="Collapse all"
              className="flex justify-center items-center cursor-pointer hover:bg-gray-100 rounded-md p-1"
              onClick={() => {
                const newCollapsed: { [key: string]: boolean } = {};
                const collapse = (node: AugmentedFormulaNode) => {
                  if (node.children.length > 0) {
                    newCollapsed[node.id] = true;
                    node.children.forEach(collapse);
                  }
                };
                store.augmentedFormula.children.forEach(collapse);
                setCollapsed(newCollapsed);
              }}
            >
              <ChevronsDownUp
                size={16}
                className="text-slate-600 hover:text-slate-900"
              />
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-grow">
          <FormulaElementPaneContext.Provider
            value={{
              collapsed: collapsed,
              onCollapse: onCollapse,
              selectedNodes: selectedNodes,
              onSelectNode: onSelectNode,
            }}
          >
            {store.augmentedFormula.children.map((tree) => (
              <div key={tree.id}>
                <FormulaTree tree={tree} store={store} />
              </div>
            ))}
          </FormulaElementPaneContext.Provider>
        </div>
      </div>
    );
  }
);

const FormulaTree = observer(
  ({ tree, store }: { tree: AugmentedFormulaNode; store: FormulaStore }) => {
    const { collapsed, onCollapse, selectedNodes } = useContext(
      FormulaElementPaneContext
    );

    return (
      <div
        className={`${
          selectedNodes.has(tree.id)
            ? "bg-slate-100 rounded-lg h-fit"
            : "bg-transparent rounded-lg"
        }`}
      >
        <div className="flex flex-row justify-start items-center hover:bg-slate-100 rounded-lg bg-transparent mb-0.5">
          <div
            className={`${
              tree.children.length === 0 ? "hidden" : "visible"
            } cursor-pointer flex justify-center items-center hover:bg-slate-200 rounded-md p-1 ml-1`}
            onClick={() => onCollapse(tree.id, !collapsed[tree.id])}
          >
            <ChevronRight
              size={16}
              className={`${collapsed[tree.id] ? "rotate-0" : "rotate-90"} text-slate-600 hover:text-slate-900 transition-transform duration-300 ease-in-out`}
            />
          </div>
          <div className="pl-3 p-1 hover:bg-slate-100 rounded-lg w-full">
            <TreeElement tree={tree} store={store} />
          </div>
        </div>
        <div className="ml-8">
          {!collapsed[tree.id] &&
            tree.children.map((child) => (
              <FormulaTree tree={child} key={child.id} store={store} />
            ))}
        </div>
      </div>
    );
  }
);

const TreeElement = ({
  tree,
  store,
}: {
  tree: AugmentedFormulaNode;
  store: FormulaStore;
}) => {
  switch (tree.type) {
    case "symbol":
      return <LabeledNode tree={tree} label={tree.value} store={store} />;
    case "space":
      return <LabeledNode tree={tree} label="␣" store={store} />;
    case "text":
      return (
        <LabeledNode
          tree={tree}
          label={tree.body
            .map((node) =>
              node.type === "symbol"
                ? node.value
                : node.type === "space"
                  ? node.text
                  : ""
            )
            .join("")}
          store={store}
        />
      );
    case "op":
      return (
        <LabeledNode
          tree={tree}
          label={String.raw`\${tree.operator}`}
          store={store}
        />
      );
    case "frac":
      return <LabeledNode tree={tree} label="Fraction" store={store} />;
    case "script":
      return <LabeledNode tree={tree} label="Script" store={store} />;
    case "root":
      return <LabeledNode tree={tree} label="Root" store={store} />;
    case "group":
      return <LabeledNode tree={tree} label="Group" store={store} />;
    case "array":
      return <LabeledNode tree={tree} label="Array" store={store} />;
    case "brace":
      return <BraceNode tree={tree} store={store} />;
    case "color":
      return <ColorNode tree={tree} store={store} />;
    case "box":
      return <BoxNode tree={tree} store={store} />;
    case "strikethrough":
      return (
        <LabeledNode
          tree={tree}
          label="Strikethrough"
          deletable
          store={store}
        />
      );
    case "variable":
      return (
        <LabeledNode
          tree={tree}
          label={`Variable: ${(tree as Variable).variableLatex}`}
          store={store}
        />
      );
    case "matrix":
      return <LabeledNode tree={tree} label="Matrix" store={store} />;
    case "delimited":
      return <LabeledNode tree={tree} label="Delimited" store={store} />;
    case "accent":
      return <LabeledNode tree={tree} label="Accent" store={store} />;
    default:
      assertUnreachable(tree);
  }
};

const LabeledNode = ({
  tree,
  label,
  deletable,
  store,
}: {
  tree: AugmentedFormulaNode;
  label: string;
  deletable?: boolean;
  store: FormulaStore;
}) => {
  const { onSelectNode } = useContext(FormulaElementPaneContext);

  return (
    <div
      className="flex flex-row justify-between items-center w-full"
      onClick={() => {
        onSelectNode(tree.id);
      }}
    >
      {label}
      <div
        className={`${deletable ? "visible" : "hidden"}`}
        onClick={(e) => {
          e.stopPropagation();
          store.updateFormula(
            replaceNodes(store.augmentedFormula, (node) => {
              if (node.id === tree.id) {
                return new Group(tree.id, tree.children);
              }
              return node;
            })
          );
        }}
      >
        <X className="cursor-pointer mr-2 hover:text-red-500" />
      </div>
    </div>
  );
};

const BraceNode = ({ tree, store }: { tree: Brace; store: FormulaStore }) => {
  const { onSelectNode } = useContext(FormulaElementPaneContext);

  return (
    <div className="flex flex-row justify-between items-center w-full">
      <div
        className={`flex justify-center items-center cursor-pointer p-0.5 mr-2 hover:bg-gray-200 transition-transform duration-300 ease-in-out ${tree.over ? "rotate-90" : "-rotate-90"}`}
        title={tree.over ? "Make underbrace" : "Make overbrace"}
        onClick={() => {
          store.updateFormula(
            replaceNodes(store.augmentedFormula, (node) => {
              if (
                node.type === "script" &&
                node.children.find((n) => n.id === tree.id)
              ) {
                return new Script(
                  node.id,
                  node.base,
                  tree.over ? node.sup : undefined,
                  tree.over ? undefined : node.sub
                );
              } else if (node.type === "brace" && node.id === tree.id) {
                return node.withChanges({ over: !tree.over });
              }
              return node;
            })
          );
        }}
      >
        <img
          className="w-4 h-4"
          src={CurlyBraceListOptionIcon}
          alt="Curly brace list option"
        />
      </div>
      <div
        className="flex flex-row justify-between items-center w-full"
        onClick={() => {
          onSelectNode(tree.id);
        }}
      >
        Brace
        <div
          className="visible"
          onClick={(e) => {
            e.stopPropagation();
            store.updateFormula(
              replaceNodes(store.augmentedFormula, (node) => {
                const maybeBraceNode = node.children.find(
                  (n) => n.id === tree.id
                );
                if (node.type === "script" && maybeBraceNode !== undefined) {
                  return new Group(node.id, maybeBraceNode.children);
                }
                return node;
              })
            );
          }}
        >
          <X className="cursor-pointer mr-2 hover:text-red-500" />
        </div>
      </div>
    </div>
  );
};

const ColorNode = ({ tree, store }: { tree: Color; store: FormulaStore }) => {
  return <LabeledNode tree={tree} label="Color" deletable store={store} />;
};

const BoxNode = ({ tree, store }: { tree: Box; store: FormulaStore }) => {
  return <LabeledNode tree={tree} label="Box" deletable store={store} />;
};
