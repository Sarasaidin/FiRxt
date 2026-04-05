"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetch(`/api/products/${id}`).then((r) => r.json()).then((data) => {
      if (data.product) {
        reset({
          ...data.product,
          price: (data.product.price / 100).toFixed(2),
          comparePrice: data.product.comparePrice ? (data.product.comparePrice / 100).toFixed(2) : "",
        });
      }
    });
  }, [id, reset]);

  async function onSubmit(data: any) {
    setLoading(true);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        price: parseFloat(data.price),
        comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : null,
        stock: parseInt(data.stock),
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast("Product updated!", "success");
    } else {
      toast("Update failed", "error");
    }
  }

  async function handleDelete() {
    if (!confirm("Deactivate this product?")) return;
    setDeleting(true);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    setDeleting(false);
    toast("Product deactivated", "info");
    router.push("/partner-dashboard/products");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Edit Product</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input {...register("name")} id="name" label="Product Name" required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea {...register("description")} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("price")} id="price" type="number" step="0.01" label="Price (MYR)" required />
            <Input {...register("comparePrice")} id="comparePrice" type="number" step="0.01" label="Compare Price" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input {...register("stock")} id="stock" type="number" label="Stock" required />
            <Input {...register("sku")} id="sku" label="SKU" />
          </div>
          <Input {...register("brand")} id="brand" label="Brand" />
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("requiresPrescription")} className="rounded" />
              <span className="text-sm text-gray-700">Requires prescription</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("isActive")} className="rounded" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register("isFeatured")} className="rounded" />
              <span className="text-sm text-gray-700">Featured</span>
            </label>
          </div>
          <div className="flex gap-3 mt-2">
            <Button type="button" variant="danger" loading={deleting} onClick={handleDelete}>Deactivate</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" loading={loading}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
