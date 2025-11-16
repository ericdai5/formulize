export { default as BayesProbabilityChart } from "./BayesProbabilityChart";

// Auto-register for live app builds (side effect)
// This will be tree-shaken in library builds unless explicitly imported
import "./BayesProbabilityChart";

// Explicit registration function for library consumers
export function registerBuiltInComponents() {
  // Side effect import already registered, but re-import to be explicit
  import("./BayesProbabilityChart");
}
