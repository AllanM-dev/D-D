import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/D-D/" : "/",
  plugins: [vue()],
  test: { include: ["src/**/*.test.ts"] },
});
