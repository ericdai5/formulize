import APIPage from "./pages/api";
import EditorPage from "./pages/editor/EditorPage";
// Auto-register built-in custom components for live app
import { registerBuiltInComponents } from "./visualizations/custom/components";

// Ensure registration happens for production builds
registerBuiltInComponents();

function App() {
  return (
    <>
      {/* <EditorPage /> */}
      <APIPage />
    </>
  );
}

export default App;
