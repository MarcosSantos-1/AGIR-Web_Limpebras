"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { CustomPontosViciadosProvider } from "@/contexts/custom-pontos-viciados-context";
import { AccentColorProvider } from "@/contexts/accent-color-context";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthGate } from "@/components/auth/auth-gate";
import { type ReactNode } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AccentColorProvider>
        <AuthProvider>
          <AuthGate>
            <CustomPontosViciadosProvider>
              {children}
              <Toaster richColors position="top-center" />
            </CustomPontosViciadosProvider>
          </AuthGate>
        </AuthProvider>
      </AccentColorProvider>
    </ThemeProvider>
  );
}
