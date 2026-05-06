"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { POSTerminal } from "@/components/pos/POSTerminal";

// Scoped QueryClient so POS data doesn't pollute the app-level cache
const posQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function POSPage() {
  return (
    <QueryClientProvider client={posQueryClient}>
      {/* Fill the full available height without the shell header */}
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <POSTerminal />
      </div>
    </QueryClientProvider>
  );
}
