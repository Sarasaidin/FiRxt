"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCartStore, type CartItemType } from "@/store/cart-store";
import { toast } from "@/components/ui/toaster";

interface AddToCartButtonProps {
  id: string;
  name: string;
  price: number;
  type: CartItemType;
  image?: string;
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
  stock?: number;
  label?: string;
  addedLabel?: string;
  redirectToCart?: boolean;
}

export function AddToCartButton({
  id,
  name,
  price,
  type,
  image,
  partnerId,
  partnerName,
  partnerSlug,
  stock,
  label,
  addedLabel = "Added",
  redirectToCart = true,
}: AddToCartButtonProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  if (type === "PHYSICAL" && stock !== undefined && stock <= 0) {
    return (
      <button
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-400"
      >
        Out of Stock
      </button>
    );
  }

  function handleAdd() {
    addItem({
      id,
      name,
      price,
      quantity: 1,
      type,
      image,
      partnerId,
      partnerName,
      partnerSlug,
    });

    setAdded(true);
    toast(`${name} added to cart`, "success");

    if (redirectToCart) {
      setTimeout(() => {
        router.push("/cart");
      }, 300);
    } else {
      setTimeout(() => setAdded(false), 2000);
    }
  }

  const defaultLabel =
    type === "SERVICE" ? "Book / Add to Cart" : "Reserve / Add to Cart";

  return (
    <Button
      type="button"
      onClick={handleAdd}
      size="sm"
      variant={added ? "secondary" : "primary"}
      className="mt-3 w-full"
    >
      {added ? (
        <>
          <Check className="mr-1.5 h-4 w-4" /> {addedLabel}
        </>
      ) : (
        <>
          <ShoppingCart className="mr-1.5 h-4 w-4" /> {label ?? defaultLabel}
        </>
      )}
    </Button>
  );
}