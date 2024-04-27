import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App.tsx";

window.MathJax = {
  loader: {
    load: [
      "input/tex",
      "output/chtml",
      "[tex]/require",
      "[tex]/html",
      "[tex]/color",
    ],
    tex: { packages: { "[+]": ["html", "color"] } },
  },
  startup: {
    pageReady: () => {
      // We have to wait until MathJax is available before starting React
      ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    },
  },
};

// Loading MathJax will eventually trigger the React render
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/startup.js";
script.async = true;
document.head.appendChild(script);
