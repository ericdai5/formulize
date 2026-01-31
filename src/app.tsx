import { Navigate, Route, Routes } from "react-router-dom";

import { examples } from "./examples";
import APIPage from "./pages/api";
// import EditorPage from "./pages/editor/EditorPage";
// Auto-register built-in custom components for live app
import { registerBuiltInComponents } from "./visualizations/custom/components";

// Ensure registration happens for production builds
registerBuiltInComponents();

// Get all example keys for routing
const exampleKeys = Object.keys(examples) as (keyof typeof examples)[];

function App() {
  return (
    <Routes>
      {/* Redirect root to the first example */}
      <Route
        path="/"
        element={<Navigate to={`/examples/${exampleKeys[0]}`} replace />}
      />
      {/* Route for each example */}
      <Route path="/examples/:exampleId" element={<APIPage />} />
      {/* Fallback - redirect unknown routes to first example */}
      <Route
        path="*"
        element={<Navigate to={`/examples/${exampleKeys[0]}`} replace />}
      />
    </Routes>
  );
}

export default App;
