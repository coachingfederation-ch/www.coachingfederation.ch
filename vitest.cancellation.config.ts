import { defineConfig } from "vitest/config";

// Isolate handler unit tests from TanStack's RPC transform; browser verification
// exercises the real request boundary separately.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    environment: "node",
    include: ["src/lib/event-cancellation.test.ts", "src/lib/event-status.test.ts"],
  },
});