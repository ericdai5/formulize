import { scan } from "react-scan";
import React from "react";
import ReactDOM from "react-dom/client";
import * as acorn from "acorn";

import App from "./App.tsx";
import "./index.css";

// Make acorn globally available for JS-Interpreter
(window as unknown as { acorn: typeof acorn }).acorn = acorn;

scan({
  enabled: true,
});

const loadMathJax = () => {
  return new Promise((resolve) => {
    window.MathJax = {
      loader: {
        load: [
          "input/tex",
          "output/chtml",
          "[tex]/html",
          "[tex]/color",
          "[tex]/cancel",
        ],
      },
      tex: {
        packages: { "[+]": ["html", "color", "cancel"] },
      },
      chtml: {
        scale: 2.0,
      },
      // @ts-expect-error This is valid, MathJax types are incomplete
      startup: {
        pageReady: () => {
          // @ts-expect-error MathJax startup types are incomplete
          return MathJax.startup.defaultPageReady().then(() => {
            console.log("MathJax is ready");
            // @ts-expect-error Promise resolve callback lacks proper typing
            resolve();
          });
        },
      },
    };

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    script.async = true;
    document.head.appendChild(script);
  });
};

// starting app only after MathJax is loaded
loadMathJax().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
