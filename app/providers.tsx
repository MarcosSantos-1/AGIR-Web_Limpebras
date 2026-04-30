"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { AuthGate } from "@/components/auth/auth-gate";
import { type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
