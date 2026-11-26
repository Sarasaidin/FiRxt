
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export default function DeleteCustomerButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete customer "${userName}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/customers/${userId}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        toast(result.error ?? "Unable to delete customer.", "error");
        return;
      }

      toast("Customer deleted successfully.", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleDelete}
      loading={loading}
    >
      Delete
    </Button>
  );
}
