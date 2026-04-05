"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({ defaultValues: { name: "", description: "", price: "", durationMinutes: "", isActive: true } });

  async function onSubmit(data: any) {
    setLoading(true);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, price: parseFloat(data.price), durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : null }),
    });
    setLoading(false);
    if (res.ok) { toast("Service created!", "success"); router.push("/partner-dashboard/services"); }
    else { const j = await res.json(); toast(j.error ?? "Failed", "error"); }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Add Service</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("name")} id="name" label="Service Name" placeholder="Blood Pressure Check" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" placeholder="Service description..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("price")} id="price" type="number" step="0.01" label="Price (MYR)" placeholder="25.00" required />
            <Input {...register("durationMinutes")} id="durationMinutes" type="number" label="Duration (minutes)" placeholder="30" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register("isActive")} className="rounded" defaultChecked />
            <span className="text-sm text-gray-700">Active (visible to customers)</span>
          </label>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Service</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
