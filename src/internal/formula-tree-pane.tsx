import { createContext, useContext, useState } from "react";

import { observer } from "mobx-react-lite";

import { ChevronRight, X } from "lucide-react";
import { ChevronsDownUp } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";

import { ComputationStore } from "../store/computation";
import {
  assertUnreachable,
  replaceNodes,
} from "../util/parse/formula-transform";
import {
  AugmentedFormulaNode,
  Box,
  Brace,
  Color,
  Group,
  Script,
  Variable,
} from "../util/parse/formula-tree";

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
  computationStore: ComputationStore;
}

export const FormulaTreePane = observer(
  ({ computationStore }: FormulaTreePaneProps) => {
    return (
      <>
        {computationStore.formulas.map((formula) => (
          <SingleFormulaTreePane
            key={formula.id}
            computationStore={computationStore}
            formulaId={formula.id}
          />
        ))}
      </>
    );
  }
);

const SingleFormulaTreePane = observer(
  ({ computationStore, formulaId }: { computationStore: ComputationStore; formulaId: string }) => {
    // Get the augmented formula from computation store
    const augmentedFormula = computationStore.getAugmentedFormula(formulaId);

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

    if (!augmentedFormula || augmentedFormula.children.length === 0) {
      return (
        <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col overflow-hidden select-none text-sm border-b border-slate-200">
          <div className="flex flex-row justify-between items-center">
            <h1 className="text-sm">{formulaId}</h1>
          </div>
          <div className="text-gray-500 text-sm">No formula available</div>
        </div>
      );
    }

    return (
      <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col overflow-hidden select-none text-sm border-b border-slate-200">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-sm">{formulaId}</h1>
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
                augmentedFormula.children.forEach(collapse);
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
            {augmentedFormula.children.map((tree) => (
              <div key={tree.id}>
                <FormulaTree tree={tree} computationStore={computationStore} formulaId={formulaId} />
              </div>
            ))}
          </FormulaElementPaneContext.Provider>
        </div>
      </div>
    );
  }
);

const FormulaTree = observer(
  ({ tree, computationStore, formulaId }: { tree: AugmentedFormulaNode; computationStore: ComputationStore; formulaId: string }) => {
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
            <TreeElement tree={tree} computationStore={computationStore} formulaId={formulaId} />
          </div>
        </div>
        <div className="ml-8">
          {!collapsed[tree.id] &&
            tree.children.map((child) => (
              <FormulaTree tree={child} key={child.id} computationStore={computationStore} formulaId={formulaId} />
            ))}
        </div>
      </div>
    );
  }
);

const TreeElement = ({
  tree,
  computationStore,
  formulaId,
}: {
  tree: AugmentedFormulaNode;
  computationStore: ComputationStore;
  formulaId: string;
}) => {
  switch (tree.type) {
    case "symbol":
      return <LabeledNode tree={tree} label={tree.value} computationStore={computationStore} formulaId={formulaId} />;
    case "space":
      return <LabeledNode tree={tree} label="␣" computationStore={computationStore} formulaId={formulaId} />;
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
          computationStore={computationStore}
          formulaId={formulaId}
        />
      );
    case "op":
      return (
        <LabeledNode
          tree={tree}
          label={String.raw`\${tree.operator}`}
          computationStore={computationStore}
          formulaId={formulaId}
        />
      );
    case "frac":
      return <LabeledNode tree={tree} label="Fraction" computationStore={computationStore} formulaId={formulaId} />;
    case "script":
      return <LabeledNode tree={tree} label="Script" computationStore={computationStore} formulaId={formulaId} />;
    case "root":
      return <LabeledNode tree={tree} label="Root" computationStore={computationStore} formulaId={formulaId} />;
    case "group":
      return <LabeledNode tree={tree} label="Group" computationStore={computationStore} formulaId={formulaId} />;
    case "array":
      return <LabeledNode tree={tree} label="Array" computationStore={computationStore} formulaId={formulaId} />;
    case "brace":
      return <BraceNode tree={tree} computationStore={computationStore} formulaId={formulaId} />;
    case "color":
      return <ColorNode tree={tree} computationStore={computationStore} formulaId={formulaId} />;
    case "box":
      return <BoxNode tree={tree} computationStore={computationStore} formulaId={formulaId} />;
    case "strikethrough":
      return (
        <LabeledNode
          tree={tree}
          label="Strikethrough"
          deletable
          computationStore={computationStore}
          formulaId={formulaId}
        />
      );
    case "variable":
      return (
        <LabeledNode
          tree={tree}
          label={`Variable: ${(tree as Variable).variableLatex}`}
          computationStore={computationStore}
          formulaId={formulaId}
        />
      );
    case "matrix":
      return <LabeledNode tree={tree} label="Matrix" computationStore={computationStore} formulaId={formulaId} />;
    case "delimited":
      return <LabeledNode tree={tree} label="Delimited" computationStore={computationStore} formulaId={formulaId} />;
    case "accent":
      return <LabeledNode tree={tree} label="Accent" computationStore={computationStore} formulaId={formulaId} />;
    default:
      assertUnreachable(tree);
  }
};

const LabeledNode = ({
  tree,
  label,
  deletable,
  computationStore,
  formulaId,
}: {
  tree: AugmentedFormulaNode;
  label: string;
  deletable?: boolean;
  computationStore: ComputationStore;
  formulaId: string;
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
          computationStore.updateFormula(
            formulaId,
            replaceNodes(computationStore.getAugmentedFormula(formulaId), (node) => {
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

const BraceNode = ({ tree, computationStore, formulaId }: { tree: Brace; computationStore: ComputationStore; formulaId: string }) => {
  const { onSelectNode } = useContext(FormulaElementPaneContext);

  return (
    <div className="flex flex-row justify-between items-center w-full">
      <div
        className={`flex justify-center items-center cursor-pointer p-0.5 mr-2 hover:bg-gray-200 transition-transform duration-300 ease-in-out ${tree.over ? "rotate-90" : "-rotate-90"}`}
        title={tree.over ? "Make underbrace" : "Make overbrace"}
        onClick={() => {
          computationStore.updateFormula(
            formulaId,
            replaceNodes(computationStore.getAugmentedFormula(formulaId), (node) => {
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
            computationStore.updateFormula(
              formulaId,
              replaceNodes(computationStore.getAugmentedFormula(formulaId), (node) => {
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

const ColorNode = ({ tree, computationStore, formulaId }: { tree: Color; computationStore: ComputationStore; formulaId: string }) => {
  return <LabeledNode tree={tree} label="Color" deletable computationStore={computationStore} formulaId={formulaId} />;
};

const BoxNode = ({ tree, computationStore, formulaId }: { tree: Box; computationStore: ComputationStore; formulaId: string }) => {
  return <LabeledNode tree={tree} label="Box" deletable computationStore={computationStore} formulaId={formulaId} />;
};
