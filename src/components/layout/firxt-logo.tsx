import { cn } from "@/lib/utils";

export function FiRxtLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Pill background */}
      <div className="bg-brand-navy border-2 border-white/30 rounded-full px-3 py-1 flex items-center">
        <span className="font-black text-lg leading-none">
          <span className="text-brand-green">Fi</span>
          <span className="text-brand-red">R</span>
          <span className="text-brand-green">xt</span>
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-xs text-white/60 leading-none">Live Smart</p>
      </div>
    </div>
  );
}

export function FiRxtLogoDark({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="bg-brand-navy rounded-full px-6 py-2">
        <span className="font-black text-2xl leading-none">
          <span className="text-brand-green">Fi</span>
          <span className="text-brand-red">R</span>
          <span className="text-brand-green">xt</span>
        </span>
      </div>
      <p className="text-sm text-gray-600">Live Smart</p>
    </div>
  );
}
