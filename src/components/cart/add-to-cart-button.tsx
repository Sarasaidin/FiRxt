"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
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
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  if (type === "PHYSICAL" && stock !== undefined && stock <= 0) {
    return (
      <button disabled className="mt-3 w-full rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-400 cursor-not-allowed">
        Out of Stock
      </button>
    );
  }

  function handleAdd() {
    addItem({ id, name, price, quantity: 1, type, image, partnerId, partnerName, partnerSlug });
    setAdded(true);
    toast(`${name} added to cart`, "success");
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <Button
      onClick={handleAdd}
      size="sm"
      variant={added ? "secondary" : "primary"}
      className="mt-3 w-full"
    >
      {added ? (
        <>
          <Check className="mr-1.5 h-4 w-4" /> Added
        </>
      ) : (
        <>
          <ShoppingCart className="mr-1.5 h-4 w-4" /> Add to Cart
        </>
      )}
    </Button>
  );
}
