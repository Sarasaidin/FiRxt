"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";

export default function NewPromotionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      title: "", description: "", type: "PERCENTAGE", discountValue: "",
      minOrderValue: "", code: "", usageLimit: "", startDate: "", endDate: "",
    },
  });

  async function onSubmit(data: any) {
    setLoading(true);
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        discountValue: parseFloat(data.discountValue),
        minOrderValue: data.minOrderValue ? parseFloat(data.minOrderValue) * 100 : null,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit) : null,
        status: "ACTIVE",
      }),
    });
    setLoading(false);
    if (res.ok) { toast("Promotion created!", "success"); router.push("/admin/promotions"); }
    else { const j = await res.json(); toast(j.error ?? "Failed", "error"); }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">New Promotion</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("title")} id="title" label="Promotion Title" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
          </div>
          <Select
            {...register("type")}
            id="type"
            label="Discount Type"
            options={[
              { value: "PERCENTAGE", label: "Percentage (%)" },
              { value: "FIXED_AMOUNT", label: "Fixed Amount (MYR)" },
              { value: "FREE_SHIPPING", label: "Free Shipping" },
            ]}
          />
          <Input {...register("discountValue")} id="discountValue" type="number" step="0.01" label="Discount Value (% or MYR)" required />
          <Input {...register("minOrderValue")} id="minOrderValue" type="number" step="0.01" label="Minimum Order (MYR)" />
          <Input {...register("code")} id="code" label="Promo Code (optional)" placeholder="HEALTH10" />
          <Input {...register("usageLimit")} id="usageLimit" type="number" label="Usage Limit (optional)" />
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("startDate")} id="startDate" type="datetime-local" label="Start Date" required />
            <Input {...register("endDate")} id="endDate" type="datetime-local" label="End Date" required />
          </div>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Promotion</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
