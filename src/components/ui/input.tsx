import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors",
            "placeholder:text-gray-400",
            "focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20",
            error && "border-brand-red focus:border-brand-red focus:ring-brand-red/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-brand-red">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
