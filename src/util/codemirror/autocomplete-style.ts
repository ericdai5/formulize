import { EditorView } from "@codemirror/view";

export const autocompleteTheme = EditorView.theme({
  ".cm-tooltip-autocomplete": {
    borderRadius: "8px",
    padding: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 0 8px 0 rgba(59, 130, 246, 0.1)",
  },
  ".cm-completionInfo": {
    borderRadius: "8px",
    padding: "4px",
    marginTop: "-6px",
    marginLeft: "4px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 0 8px 0 rgba(59, 130, 246, 0.1)",
  },
  ".cm-tooltip-autocomplete > ul > li": {
    color: "#334155",
    backgroundColor: "#ffffff",
    borderRadius: "4px",
    marginTop: "4px",
    fontSize: "14px",
  },
  ".cm-tooltip-autocomplete > ul > li:first-child": {
    marginTop: "0",
  },
  ".cm-tooltip.cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "#e2e8f0",
    color: "#000000",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected] .cm-completionLabel": {
    color: "#000000",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected] .cm-completionMatchedText": {
    color: "#0000CC",
  },
  ".cm-completionMatchedText": {
    color: "#0000CC",
    fontWeight: "600",
  },
  ".cm-completionDetail": {
    color: "#64748b",
  },
});
