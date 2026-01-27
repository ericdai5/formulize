import { createContext, useContext, useEffect, useState } from "react";

import { ChevronRight } from "lucide-react";
import { ChevronsDownUp } from "lucide-react";
import { ChevronsUpDown } from "lucide-react";

import { useFormulize } from "./useFormulize";

interface DOMNodeInfo {
  id: string;
  tagName: string;
  cssId: string | null;
  classes: string[];
  textContent: string;
  children: DOMNodeInfo[];
  isVariable: boolean;
  variableType: string | null;
}

const MathJaxTreeContext = createContext<{
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

/**
 * Parse a DOM element into a tree structure
 */
const parseDOMNode = (
  element: Element,
  parentId: string,
  index: number
): DOMNodeInfo => {
  const id = `${parentId}-${index}`;
  const htmlEl = element as HTMLElement;
  const classes = Array.from(element.classList);
  const isVariable = classes.some(
    (c) =>
      c.includes("formula-var-") ||
      c === "formula-var-base" ||
      c === "formula-var-input" ||
      c === "formula-var-computed"
  );

  let variableType: string | null = null;
  if (classes.includes("formula-var-input")) variableType = "input";
  else if (classes.includes("formula-var-computed")) variableType = "computed";
  else if (classes.includes("formula-var-base")) variableType = "base";

  // Get direct text content (not from children)
  let textContent = "";
  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent || "";
    }
  });

  // Parse children
  const children: DOMNodeInfo[] = [];
  Array.from(element.children).forEach((child, childIndex) => {
    children.push(parseDOMNode(child, id, childIndex));
  });

  return {
    id,
    tagName: element.tagName.toLowerCase(),
    cssId: htmlEl.id || null,
    classes,
    textContent: textContent.trim(),
    children,
    isVariable,
    variableType,
  };
};

/**
 * Build tree structure from all formula nodes in the DOM
 */
const buildMathJaxTree = (): DOMNodeInfo[] => {
  const trees: DOMNodeInfo[] = [];
  // Find all formula nodes
  const formulaNodes = document.querySelectorAll(".formula-node");
  formulaNodes.forEach((formulaNode, formulaIndex) => {
    const renderedLatex = formulaNode.querySelector(".rendered-latex");
    if (renderedLatex) {
      // Parse from the MathJax container (usually mjx-container)
      const mjxContainer = renderedLatex.querySelector("mjx-container");
      if (mjxContainer) {
        trees.push(parseDOMNode(mjxContainer, `formula-${formulaIndex}`, 0));
      } else {
        // Fallback to rendered-latex content
        trees.push(parseDOMNode(renderedLatex, `formula-${formulaIndex}`, 0));
      }
    }
  });

  return trees;
};

interface ExpressionScopeInfo {
  latexKey: string;
  scopeId: string;
  type: string;
  containsVars: string[];
}

export const MathJaxTreePane = () => {
  const context = useFormulize();
  const computationStore = context?.computationStore;
  const [trees, setTrees] = useState<DOMNodeInfo[]>([]);
  const [collapsed, setCollapsed] = useState<{ [key: string]: boolean }>({});
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [expressionScopes, setExpressionScopes] = useState<
    ExpressionScopeInfo[]
  >([]);

  // Build tree on mount and when refresh is needed
  useEffect(() => {
    setTrees(buildMathJaxTree());
    refreshExpressionScopes();
  }, []);

  const refreshExpressionScopes = () => {
    if (!computationStore) {
      setExpressionScopes([]);
      return;
    }
    const scopes: ExpressionScopeInfo[] = [];
    for (const [
      latexKey,
      scopeData,
    ] of computationStore.expressionScopes.entries()) {
      scopes.push({
        latexKey,
        scopeId: scopeData.scopeId,
        type: scopeData.type,
        containsVars: scopeData.containsVars,
      });
    }
    setExpressionScopes(scopes);
  };

  const handleRefresh = () => {
    setTrees(buildMathJaxTree());
    refreshExpressionScopes();
  };

  const onCollapse = (id: string, isCollapsed: boolean) => {
    setCollapsed({ ...collapsed, [id]: isCollapsed });
  };

  const onSelectNode = (id: string) => {
    const newSelection = new Set(selectedNodes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.clear();
      newSelection.add(id);
    }
    setSelectedNodes(newSelection);
  };

  const collapseAll = () => {
    const newCollapsed: { [key: string]: boolean } = {};
    const collapse = (node: DOMNodeInfo) => {
      if (node.children.length > 0) {
        newCollapsed[node.id] = true;
        node.children.forEach(collapse);
      }
    };
    trees.forEach(collapse);
    setCollapsed(newCollapsed);
  };

  return (
    <div className="pt-3 pl-4 pr-4 pb-4 gap-4 flex flex-col h-full overflow-hidden select-none text-base">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-2">
          <button
            onClick={handleRefresh}
            className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
          <div
            title="Expand all"
            className="flex justify-center items-center cursor-pointer hover:bg-gray-100 rounded-md p-1"
            onClick={() => setCollapsed({})}
          >
            <ChevronsUpDown
              size={16}
              className="text-slate-600 hover:text-slate-900"
            />
          </div>
          <div
            title="Collapse all"
            className="flex justify-center items-center cursor-pointer hover:bg-gray-100 rounded-md p-1"
            onClick={collapseAll}
          >
            <ChevronsDownUp
              size={16}
              className="text-slate-600 hover:text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Expression Scopes */}
      <div className="border-b pb-2">
        <div className="text-xs text-gray-500 mb-2">
          Expression Scopes ({expressionScopes.length})
        </div>
        {expressionScopes.length === 0 ? (
          <div className="text-xs text-gray-400 italic">
            No expression scopes registered
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {expressionScopes.map((scope) => (
              <div
                key={scope.scopeId}
                className="text-xs bg-gray-50 rounded p-2 border border-gray-200"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-purple-600 font-semibold">
                    {scope.scopeId}
                  </span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                    {scope.type}
                  </span>
                </div>
                <div className="font-mono text-gray-700 text-xs break-all bg-white p-1 rounded border">
                  {scope.latexKey}
                </div>
                {scope.containsVars.length > 0 && (
                  <div className="mt-1 text-gray-500">
                    vars: {scope.containsVars.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {trees.length === 0 ? (
        <div className="text-gray-500 text-sm">
          No MathJax rendered content found. Click Refresh after formulas load.
        </div>
      ) : (
        <div className="overflow-y-auto flex-grow font-mono text-sm">
          <MathJaxTreeContext.Provider
            value={{
              collapsed,
              onCollapse,
              selectedNodes,
              onSelectNode,
            }}
          >
            {trees.map((tree, index) => (
              <div key={tree.id} className="mb-4">
                <div className="text-xs text-gray-400 mb-1">
                  Formula Node {index}
                </div>
                <DOMTreeNode node={tree} />
              </div>
            ))}
          </MathJaxTreeContext.Provider>
        </div>
      )}
    </div>
  );
};

const DOMTreeNode = ({ node }: { node: DOMNodeInfo }) => {
  const { collapsed, onCollapse, selectedNodes, onSelectNode } =
    useContext(MathJaxTreeContext);

  const isCollapsed = collapsed[node.id];
  const hasChildren = node.children.length > 0;

  // Determine badge color based on variable type
  const getBadgeColor = () => {
    switch (node.variableType) {
      case "input":
        return "bg-green-100 text-green-800 border-green-300";
      case "computed":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "base":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "";
    }
  };

  return (
    <div
      className={`${
        selectedNodes.has(node.id)
          ? "bg-slate-100 rounded-lg"
          : "bg-transparent rounded-lg"
      }`}
    >
      <div className="flex flex-row justify-start items-center hover:bg-slate-100 rounded-lg bg-transparent mb-0.5">
        {/* Collapse toggle */}
        <div
          className={`${
            hasChildren ? "visible" : "invisible"
          } cursor-pointer flex justify-center items-center hover:bg-slate-200 rounded-md p-1 ml-1`}
          onClick={() => onCollapse(node.id, !isCollapsed)}
        >
          <ChevronRight
            size={14}
            className={`${isCollapsed ? "rotate-0" : "rotate-90"} text-slate-600 hover:text-slate-900 transition-transform duration-200`}
          />
        </div>

        {/* Node content */}
        <div
          className="pl-2 p-1 hover:bg-slate-100 rounded-lg w-full flex flex-wrap items-center gap-1"
          onClick={() => onSelectNode(node.id)}
        >
          {/* Tag name */}
          <span className="text-blue-600">&lt;{node.tagName}</span>

          {/* CSS ID if present */}
          {node.cssId && (
            <span className="text-purple-600 font-semibold">
              id="{node.cssId}"
            </span>
          )}

          {/* Variable type badge */}
          {node.variableType && (
            <span
              className={`px-1.5 py-0.5 text-xs rounded border ${getBadgeColor()}`}
            >
              {node.variableType}
            </span>
          )}

          {/* Classes (abbreviated) */}
          {node.classes.length > 0 && (
            <span className="text-gray-400 text-xs">
              .{node.classes.slice(0, 2).join(".")}
              {node.classes.length > 2 && `+${node.classes.length - 2}`}
            </span>
          )}

          <span className="text-blue-600">&gt;</span>

          {/* Text content preview */}
          {node.textContent && (
            <span className="text-gray-600 text-xs truncate max-w-[100px]">
              "{node.textContent}"
            </span>
          )}

          {/* Children count */}
          {hasChildren && (
            <span className="text-gray-400 text-xs">
              ({node.children.length})
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {!isCollapsed && hasChildren && (
        <div className="ml-6 border-l border-gray-200 pl-2">
          {node.children.map((child) => (
            <DOMTreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MathJaxTreePane;
