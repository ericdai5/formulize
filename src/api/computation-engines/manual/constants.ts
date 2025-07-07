export const ERROR_MESSAGES = {
  NO_CODE: "No code to debug",
  EXECUTION_ERROR: "Execution error",
  VARIABLE_EXTRACTION_ERROR: "Could not extract variables",
  VIEW_EXTRACTION_ERROR: "Could not extract view variables",
} as const;

export const DEBUG_VARIABLE_NAMES = {
  INTERPRETER_VALUE: "Interpreter Value",
  CURRENT_NODE_TYPE: "Current Node Type",
  STACK_DEPTH: "Stack Depth",
  DECLARED_VARIABLES: "Declared Variables",
  NODE_INFO: "Node Info",
  CURRENT_SCOPE_TYPE: "Current Scope Type",
  CURRENT_FUNCTION: "Current Function",
  ERROR: "[Error]",
  VIEW_ERROR: "[View Error]",
} as const;