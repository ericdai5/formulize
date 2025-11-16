import BayesProbabilityChart from "./BayesProbabilityChart";
import { register } from "../registry";

export { default as BayesProbabilityChart } from "./BayesProbabilityChart";

// Explicit registration function for library consumers and live app
export function registerBuiltInComponents() {
  // The import of BayesProbabilityChart above already triggered the register() call
  // at the bottom of BayesProbabilityChart.tsx, but we re-register here to ensure
  // it works in production builds where tree-shaking might affect side effects
  register("BayesProbabilityChart", BayesProbabilityChart);
}
