import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Vite config for Vercel deployment (application build)
export default defineConfig({
  base: "/",
  server: {
    port: 3005,
  },
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
  css: {
    postcss: "./postcss.config.js",
  },
  build: {
    // Regular app build (not library mode)
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
  },
});