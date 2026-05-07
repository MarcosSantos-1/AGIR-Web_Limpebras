"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { AuthGate } from "@/components/auth/auth-gate";
import { type ReactNode } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        {children}
        <Toaster richColors position="top-center" />
      </AuthGate>
    </AuthProvider>
  );
}
