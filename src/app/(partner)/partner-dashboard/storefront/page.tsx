"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

export default function StorefrontPage() {
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  async function onSubmit(data: any) {
    if (!activePartnerId) {
      toast("No active business selected.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/partners/${activePartnerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Update failed.");
      }

      toast("Storefront updated!", "success");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Update failed.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Edit Storefront</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("name")} id="name" label="Business Name" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" placeholder="Tell customers about your business..." />
          </div>
          <Input {...register("phone")} id="phone" label="Phone" placeholder="+60123456789" />
          <Input {...register("email")} id="email" type="email" label="Business Email" />
          <Input {...register("website")} id="website" label="Website" placeholder="https://..." />
          <Input {...register("logoUrl")} id="logoUrl" label="Logo URL" placeholder="https://..." />
          <Input {...register("bannerUrl")} id="bannerUrl" label="Banner URL" placeholder="https://..." />
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Address</p>
            <div className="flex flex-col gap-3">
              <Input {...register("addressLine1")} id="addressLine1" label="Address Line 1" />
              <Input {...register("addressLine2")} id="addressLine2" label="Address Line 2" />
              <div className="grid grid-cols-2 gap-3">
                <Input {...register("city")} id="city" label="City" />
                <Input {...register("state")} id="state" label="State" />
              </div>
              <Input {...register("postcode")} id="postcode" label="Postcode" />
            </div>
          </div>
          <Button type="submit" loading={loading} className="mt-2">Save Changes</Button>
        </form>
      </Card>
    </div>
  );
}
