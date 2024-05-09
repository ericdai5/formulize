import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/forge/",
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: [
          "@emotion/babel-plugin",
          ["@babel/plugin-proposal-decorators", { version: "2023-11" }],
        ],
      },
    }),
  ],
});
