"use client";

import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    values: { name: session?.user?.name ?? "", email: session?.user?.email ?? "" },
  });
  const [deleting, setDeleting] = useState(false);

  async function onSubmit(data: any) {
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    if (res.ok) {
      await update({ name: data.name });
      toast("Profile updated!", "success");
    } else {
      toast("Update failed", "error");
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        toast(result.error ?? "Unable to delete account.", "error");
        return;
      }

      toast("Account deleted successfully.", "success");
      await signOut({ callbackUrl: "/" });
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">
        My Profile
      </h1>

      <Card className="p-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Input
            {...register("name")}
            id="name"
            label="Full Name"
          />

          <Input
            {...register("email")}
            id="email"
            type="email"
            label="Email"
            disabled
            className="bg-gray-50"
          />

          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </form>

        {/* Delete Account Section */}
        <div className="mt-8 border-t border-red-200 pt-6">
          <h2 className="text-lg font-semibold text-red-700">
            Delete Account
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Permanently delete your customer account. This action
            cannot be undone. Accounts with order history or a
            partner profile cannot currently be deleted here.
          </p>

          <Button
            type="button"
            onClick={handleDeleteAccount}
            loading={deleting}
            className="mt-4"
          >
            Delete My Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
