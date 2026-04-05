"use client";

import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { useState } from "react";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    values: { name: session?.user?.name ?? "", email: session?.user?.email ?? "" },
  });

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

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">My Profile</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("name")} id="name" label="Full Name" />
          <Input {...register("email")} id="email" type="email" label="Email" disabled className="bg-gray-50" />
          <Button type="submit" loading={loading}>Save Changes</Button>
        </form>
      </Card>
    </div>
  );
}
