"use client";

import { useUserProfile } from "@/contexts/user-profile-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileForm } from "@/components/settings/profile-form";

export function ProfileOnboardingDialog() {
  const { hydrated, needsOnboarding } = useUserProfile();

  const open = hydrated && needsOnboarding;

  return (
    <Dialog open={open} modal>
      <DialogContent
        className="max-w-xl border-0 bg-transparent p-4 shadow-none sm:max-w-xl"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Configurar perfil</DialogTitle>
        <DialogDescription className="sr-only">
          Nome, cargo, telefone com DDD e gradiente das iniciais.
        </DialogDescription>
        <ProfileForm layout="modal" submitLabel="Guardar e continuar" />
      </DialogContent>
    </Dialog>
  );
}
