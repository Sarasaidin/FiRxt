"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: "", description: "", price: "", comparePrice: "",
      sku: "", stock: "0", brand: "", requiresPrescription: false,
      isActive: true, isFeatured: false,
    },
  });

  async function onSubmit(data: any) {
    setLoading(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        price: parseFloat(data.price),
        comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : undefined,
        stock: parseInt(data.stock),
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast("Product created!", "success");
      router.push("/partner-dashboard/products");
    } else {
      const json = await res.json();
      toast(json.error ?? "Failed to create product", "error");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Add Product</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("name")} id="name" label="Product Name" placeholder="Vitamin C 1000mg" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              placeholder="Product description..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("price")} id="price" type="number" step="0.01" label="Price (MYR)" placeholder="12.90" required />
            <Input {...register("comparePrice")} id="comparePrice" type="number" step="0.01" label="Compare Price (optional)" placeholder="15.90" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("stock")} id="stock" type="number" label="Stock Quantity" placeholder="100" required />
            <Input {...register("sku")} id="sku" label="SKU (optional)" placeholder="VIT-C-1000" />
          </div>
          <Input {...register("brand")} id="brand" label="Brand (optional)" placeholder="Blackmores" />
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("requiresPrescription")} className="rounded" />
              <span className="text-sm text-gray-700">Requires prescription</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("isActive")} className="rounded" defaultChecked />
              <span className="text-sm text-gray-700">Active (visible to customers)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("isFeatured")} className="rounded" />
              <span className="text-sm text-gray-700">Featured product</span>
            </label>
          </div>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Product</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
