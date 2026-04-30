import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f318e3] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
