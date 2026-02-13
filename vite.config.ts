import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    watch: {
      usePolling: true
    },
    // The following proxy is needed at dev time, because otherwise "vite" hogs all
    // paths on "127.0.0.1", i.e. even if the path is "/.netlify/functions". On the
    // other hand,
    //
    // npx netlify functions:serve --port 5173
    //
    // correctly listens on localhost:5173 (not on 127.0.0.1), such as for example,
    // curl "http://localhost:5173/.netlify/functions/retrieve-releases?title=Yesterday&artist=The%20Beatles"
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:5173',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        authorize: path.resolve(__dirname, "authorize.html"), // New HTML file entry point
      },
    },
    target: "esnext", // Ensures support for top-level await
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
