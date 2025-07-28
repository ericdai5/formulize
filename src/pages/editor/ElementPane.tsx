import { createContext, useContext, useEffect, useState } from "react";

import { observer } from "mobx-react-lite";

import Icon from "@mui/material/Icon";
import { ChevronRight } from "lucide-react";
import { ChevronsDownUp } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";

import { assertUnreachable, replaceNodes } from "../../parse/formula-transform";
import {
  AugmentedFormulaNode,
  Box,
  Brace,
  Color,
  Group,
  Script,
} from "../../parse/formula-tree";
import { formulaStore, selectionStore } from "../../store";
import { ColorPicker, ColorSwatch } from "./Menu";

import CurlyBraceListOptionIcon from "/CurlyBraceListOption.svg";


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
              formulaStore.augmentedFormula.children.forEach(collapse);
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
        <ElementPaneContext.Provider
          value={{ collapsed: collapsed, onCollapse: onCollapse }}
        >
          {formulaStore.augmentedFormula.children.map((tree) => (
            <div key={tree.id}>
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
      className={`${
        selectionStore.siblingSelections.some((siblingIds) =>
          siblingIds.includes(tree.id)
        )
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
          <TreeElement tree={tree} />
        </div>
      </div>
      <div className="ml-8">
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
            .map((node) =>
              node.type === "symbol"
                ? node.value
                : node.type === "space"
                  ? node.text
                  : ""
            )
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
    case "variable":
      return <LabeledNode tree={tree} label="Variable" />;
    case "accent":
      return <LabeledNode tree={tree} label="Accent" />;
    case "matrix":
      return <LabeledNode tree={tree} label="Matrix" />;
    case "delimited":
      return <LabeledNode tree={tree} label="Delimited" />;
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
      className="flex flex-row justify-between items-center w-full"
      onClick={() => {
        selectionStore.selectOnly(tree.id);
      }}
    >
      {label}
      <div
        className={`${deletable ? "visible" : "hidden"}`}
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
        <Icon className="cursor-pointer mr-2 hover:text-red-500">close</Icon>
      </div>
    </div>
  );
};

const BraceNode = ({ tree }: { tree: Brace }) => {
  return (
    <div className="flex flex-row justify-between items-center w-full">
      <div
        className={`flex justify-center items-center cursor-pointer p-0.5 mr-2 hover:bg-gray-200 transition-transform duration-300 ease-in-out ${tree.over ? "rotate-90" : "-rotate-90"}`}
        title={tree.over ? "Make underbrace" : "Make overbrace"}
        onClick={() => {
          formulaStore.updateFormula(
            replaceNodes(formulaStore.augmentedFormula, (node) => {
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
        <img className="w-4 h-4" src={CurlyBraceListOptionIcon} alt="Curly brace list option" />
      </div>
      <div
        className="flex flex-row justify-between items-center w-full"
        onClick={() => {
          selectionStore.selectOnly(tree.id);
        }}
      >
        Brace
        <div
          className="visible"
          onClick={(e) => {
            e.stopPropagation();
            formulaStore.updateFormula(
              replaceNodes(formulaStore.augmentedFormula, (node) => {
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
          <Icon className="cursor-pointer mr-2 hover:text-red-500">close</Icon>
        </div>
      </div>
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
    <div className="flex flex-row justify-between items-center w-full">
      <div className="relative mr-2">
        <div className="cursor-pointer">
          <ColorSwatch
            color={tree.color}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          />
        </div>
        {open && (
          <div className="absolute top-4 left-0 z-10 bg-gray-100 border border-gray-200">
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
    <div className="flex flex-row justify-between items-center w-full">
      <div className="relative mr-2">
        <div className="cursor-pointer">
          <ColorSwatch
            color={tree.borderColor}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          />
        </div>
        {open && (
          <div className="absolute top-4 left-0 z-10 bg-gray-100 border border-gray-200">
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
