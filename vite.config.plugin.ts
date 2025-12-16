import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Separate build config for the Vite plugin (runs in Node.js, not browser)
export default defineConfig({
  plugins: [
    dts({
      include: ["src/vite-plugin.ts"],
      outDir: "dist/types",
      staticImport: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/vite-plugin.ts"),
      name: "FormulizeVitePlugin",
      fileName: (format) => `vite-plugin.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Externalize vite since it's a peer dependency for plugins
      external: ["vite"],
    },
    sourcemap: true,
    emptyOutDir: false, // Don't clear dist folder (main build already ran)
  },
});
