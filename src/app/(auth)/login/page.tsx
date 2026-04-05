import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md bg-white rounded-xl animate-pulse" />}>
      <LoginForm />
    </Suspense>
  );
}
