import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  server: {
    port: 3005,
  },
  plugins: [
    react({
      jsxRuntime: "automatic",
      jsxImportSource: "react",
      babel: {
        plugins: [
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
        env: {
          production: {
            plugins: [],
          },
        },
      },
    }),
    dts({
      include: ["src"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/main.tsx",
        "src/app.tsx",
      ],
      outDir: "dist/types",
      staticImport: true,
      rollupTypes: true,
    }),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
  build: {
    lib: {
      // Entry point for the library
      entry: resolve(__dirname, "src/index.ts"),
      name: "Formulize",
      // File name for the output files
      fileName: (format) => `formulize.${format}.js`,
      formats: ["es", "cjs", "umd"],
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [
        // React
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        // Heavy visualization libraries
        "plotly.js-dist",
        "d3",
        "@xyflow/react",
        // Math rendering
        "mathjax-full",
        "better-react-mathjax",
        "katex",
        "mathjs",
        // State management
        "mobx",
        "mobx-react-lite",
        "mobx-state-tree",
        // CodeMirror
        "codemirror",
        "@codemirror/autocomplete",
        "@codemirror/lang-javascript",
        "@codemirror/language",
        "@codemirror/legacy-modes",
        "@codemirror/state",
        "@codemirror/view",
        "@uiw/react-codemirror",
        // Other heavy deps
        "js-interpreter",
        "lodash",
        "lucide-react",
      ],
      output: {
        // Global variables for UMD build
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
          "react/jsx-dev-runtime": "jsxDevRuntime",
          mobx: "mobx",
          "mobx-react-lite": "mobxReactLite",
          "mobx-state-tree": "mobxStateTree",
          katex: "katex",
          "mathjax-full": "MathJax",
          "plotly.js-dist": "Plotly",
          d3: "d3",
          mathjs: "mathjs",
          codemirror: "CodeMirror",
          "@xyflow/react": "ReactFlow",
          "better-react-mathjax": "BetterReactMathjax",
          "@codemirror/autocomplete": "CodeMirrorAutocomplete",
          "@codemirror/lang-javascript": "CodeMirrorLangJavascript",
          "@codemirror/language": "CodeMirrorLanguage",
          "@codemirror/legacy-modes": "CodeMirrorLegacyModes",
          "@codemirror/state": "CodeMirrorState",
          "@codemirror/view": "CodeMirrorView",
          "@uiw/react-codemirror": "ReactCodeMirror",
          "js-interpreter": "JsInterpreter",
          lodash: "lodash",
          "lucide-react": "LucideReact",
        },
      },
    },
    sourcemap: true,
    // Generate .css file
    cssCodeSplit: false,
  },
});
