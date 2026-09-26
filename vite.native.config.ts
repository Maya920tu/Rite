import { defineConfig, type Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function flattenNativeHtml(): Plugin {
  return {
    name: "rite-flatten-native-html",
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "asset" || !chunk.fileName.endsWith("index.html")) continue;
        chunk.fileName = "index.html";
        if (typeof chunk.source === "string") {
          chunk.source = chunk.source.replaceAll("../assets/", "./assets/");
        }
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), viteReact(), flattenNativeHtml()],
  resolve: { tsconfigPaths: true },
  publicDir: "public",
  build: {
    outDir: "dist-native",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: "native/index.html",
    },
  },
});
