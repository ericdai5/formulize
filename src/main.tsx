import React from "react";
import ReactDOM from "react-dom/client";

import * as acorn from "acorn";

import App from "./app.tsx";
import "./index.css";

// Make acorn globally available for JS-Interpreter with proper default options
const acornWithDefaults = {
  ...acorn,
  defaultOptions: { ecmaVersion: 2020 },
  parse: (code: string, options = {}) => {
    return acorn.parse(code, { ecmaVersion: 2020, ...options });
  },
};

(window as unknown as { acorn: typeof acornWithDefaults }).acorn =
  acornWithDefaults;

// Only enable react-scan in development
if (import.meta.env.DEV) {
  import("react-scan")
    .then(({ scan }) => {
      scan({
        enabled: true,
      });
    })
    .catch((error) => {
      console.warn("Failed to load react-scan:", error);
    });
}

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
    script.src =
      "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js";
    script.integrity =
      "sha384-Wuix6BuhrWbjDBs24bXrjf4ZQ5aFeFWBuKkFekO2t8xFU0iNaLQfp2K6/1Nxveei";
    script.crossOrigin = "anonymous";
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
