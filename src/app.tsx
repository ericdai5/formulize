import APIPage from "./pages/api";
// Auto-register built-in custom components for live app
import { registerBuiltInComponents } from "./visualizations/custom/components";

// Ensure registration happens for production builds
registerBuiltInComponents();

function App() {
  return <APIPage />;
}

export default App;
