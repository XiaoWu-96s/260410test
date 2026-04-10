import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  // GitHub Pages 会把站点挂在 /<repo>/ 路径下
  base: "/260410test/",
  plugins: [
    vue(),
    legacy({
      targets: [
        "Chrome >= 69",
        "iOS >= 12",
        "Android >= 6"
      ],
      renderModernChunks: false,
      modernPolyfills: false
    })
  ],
  server: {
    port: 5173,
    strictPort: false
  }
});

