import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins:[react()],
  test:{ environment:"jsdom", setupFiles:["./tests/setup.ts"], include:["tests/**/*.test.tsx"],
    coverage:{provider:"v8",include:["src/**/*.{ts,tsx}"],exclude:["src/main.tsx","src/assets/**","src/vite-env.d.ts"],reporter:["text","html","lcov","json-summary"],thresholds:{statements:80,lines:80,functions:80,branches:75}},
  },
});
