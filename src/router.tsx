/**
 * Router configuration and factory.
 * Exports: getRouter. Creates the TanStack Router instance with QueryClient and routeTree.
 */

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // 30s staleTime and no focus refetch: tab switches and back-navigation were
  // re-querying every list, the largest share of database calls. Screens that
  // need fresher data set their own staleTime or invalidate after mutations.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
