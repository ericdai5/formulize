import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/vite-plugin.ts",
      name: "FormulizeVitePlugin",
      formats: ["es", "cjs"],
      fileName: (format) => `vite-plugin.${format === "es" ? "es" : "cjs"}.js`,
    },
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        exports: "named",
      },
    },
  },
  plugins: [
    dts({
      include: ["src/vite-plugin.ts"],
      outDir: "dist/types",
    }),
  ],
});
