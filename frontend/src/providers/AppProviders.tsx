import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/providers/ToastProvider";
import { createAppQueryClient } from "@/providers/app-query-client";

const queryClient = createAppQueryClient();

export function AppProviders({ children }: { children?: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="digital-main-lit-theme">
      <TooltipProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>{children ?? <Outlet />}</ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
