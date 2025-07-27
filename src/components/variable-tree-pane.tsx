import { useState } from "react";

import { ChevronRight } from "lucide-react";
import { ChevronsDownUp } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";

import {
  AugmentedFormula,
  AugmentedFormulaNode,
  Variable,
  getVariableTokens,
  parseVariableString,
} from "../formula-tree";
import { FormulizeConfig } from "../formulize";

interface VariableTreePaneProps {
  variableName: string;
  title?: string;
}

export const VariableTreePane = ({ variableName }: VariableTreePaneProps) => {
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});

  const onCollapse = (id: string, isCollapsed: boolean) => {
    setCollapsed({ ...collapsed, [id]: isCollapsed });
  };

  // Parse the variable name into a tree
  const parseVariableTree = (
    name: string
  ): {
    tree: AugmentedFormula;
    tokens: string[];
    error?: string;
  } => {
    try {
      const tree = parseVariableString(name);
      const tokens = getVariableTokens(name);
      return { tree, tokens };
    } catch (error) {
      console.warn(`Failed to parse variable "${name}":`, error);
      return {
        tree: new AugmentedFormula([]),
        tokens: [name],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  if (!variableName) {
    return (
      <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
        <div className="flex flex-row justify-between items-center">
          <h1 className="text-base">Variable Tree</h1>
        </div>
        <div className="text-gray-500 text-sm">No variable name provided</div>
      </div>
    );
  }

  const { tree, tokens, error } = parseVariableTree(variableName);

  return (
    <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-base">Variable: {variableName}</h1>
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
              tree.children.forEach(collapse);
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
        {/* Variable Info Section */}
        <div className="mb-4 text-sm text-gray-600 space-y-1">
          <div>LaTeX: {tree.toLatex("no-id")}</div>
          <div>Tokens: [{tokens.map((t) => `"${t}"`).join(", ")}]</div>
          {error && (
            <div className="text-red-600 bg-red-50 p-2 rounded">
              Parse Error: {error}
            </div>
          )}
        </div>

        {/* Tree Structure */}
        {tree.children.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No parse tree (simple symbol)
          </div>
        ) : (
          tree.children.map((child) => (
            <VariableTreeElement
              key={child.id}
              tree={child}
              collapsed={collapsed}
              onCollapse={onCollapse}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface VariableTreeElementProps {
  tree: AugmentedFormulaNode;
  collapsed: { [key: string]: boolean };
  onCollapse: (id: string, collapsed: boolean) => void;
}

const VariableTreeElement = ({
  tree,
  collapsed,
  onCollapse,
}: VariableTreeElementProps) => {
  return (
    <div className="bg-transparent rounded-lg">
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
            <VariableTreeElement
              tree={child}
              key={child.id}
              collapsed={collapsed}
              onCollapse={onCollapse}
            />
          ))}
      </div>
    </div>
  );
};

const TreeElement = ({ tree }: { tree: AugmentedFormulaNode }) => {
  const getLabel = (tree: AugmentedFormulaNode): string => {
    switch (tree.type) {
      case "symbol":
        return (tree as any).value;
      case "space":
        return "␣";
      case "text":
        return (tree as any).body
          .map((node: any) =>
            node.type === "symbol"
              ? node.value
              : node.type === "space"
                ? node.text
                : ""
          )
          .join("");
      case "op":
        return String.raw`\${(tree as any).operator}`;
      case "frac":
        return "Fraction";
      case "script":
        return "Script";
      case "root":
        return "Root";
      case "group":
        return "Group";
      case "array":
        return "Array";
      case "brace":
        return "Brace";
      case "color":
        return "Color";
      case "box":
        return "Box";
      case "strikethrough":
        return "Strikethrough";
      case "variable":
        return `Variable: ${(tree as Variable).variableLatex}`;
      case "accent":
        return "Accent";
      default:
        return "Unknown";
    }
  };

  return <span>{getLabel(tree)}</span>;
};

// Wrapper component to handle multiple variable trees
export const VariableTreesPane = ({
  config,
}: {
  config: FormulizeConfig | null;
}) => {
  const variableNames = config?.variables ? Object.keys(config.variables) : [];

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
      <div className="text-gray-500 text-sm">{message}</div>
    </div>
  );

  if (!config) return <EmptyState message="No configuration available" />;
  if (variableNames.length === 0)
    return <EmptyState message="No variables found in configuration" />;

  return (
    <div className="h-full overflow-hidden flex flex-col flex-1 overflow-y-auto">
      {variableNames.map((variableName, index) => (
        <div key={variableName} className={index > 0 ? "border-t" : ""}>
          <VariableTreePane
            variableName={variableName}
            title={`Variable ${index + 1}: ${variableName}`}
          />
        </div>
      ))}
    </div>
  );
};
