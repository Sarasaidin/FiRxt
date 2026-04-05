"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetch(`/api/services/${id}`).then((r) => r.json()).then((data) => {
      if (data.service) reset({ ...data.service, price: (data.service.price / 100).toFixed(2) });
    });
  }, [id, reset]);

  async function onSubmit(data: any) {
    setLoading(true);
    const res = await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, price: parseFloat(data.price), durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : null }),
    });
    setLoading(false);
    if (res.ok) toast("Service updated!", "success");
    else toast("Update failed", "error");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Edit Service</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("name")} id="name" label="Service Name" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("price")} id="price" type="number" step="0.01" label="Price (MYR)" required />
            <Input {...register("durationMinutes")} id="durationMinutes" type="number" label="Duration (minutes)" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("isActive")} className="rounded" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
