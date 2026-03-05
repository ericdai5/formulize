import { Navigate, Route, Routes } from "react-router-dom";

import { examples } from "./examples";
import APIPage from "./api";
// import EditorPage from "./pages/editor/EditorPage";

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
