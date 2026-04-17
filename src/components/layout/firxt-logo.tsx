import { cn } from "@/lib/utils";

type FiRxtLogoProps = {
  className?: string;
  showTagline?: boolean;
  showPoweredBy?: boolean;
  monochrome?: boolean;
  reversed?: boolean;
};

export function FiRxtLogo({
  className,
  showTagline = true,
  showPoweredBy = false,
  monochrome = false,
  reversed = false,
}: FiRxtLogoProps) {
  const containerClass = reversed
    ? "bg-white/10 border border-white/20"
    : monochrome
    ? "bg-transparent"
    : "bg-[#0B1D3B] border border-white/15";

  const monoText = reversed ? "text-white" : "text-[#0B1D3B]";

  const fiClass = monochrome ? monoText : "text-[#5FB346]";
  const rClass = monochrome ? monoText : "text-[#B22625]";
  const xtClass = monochrome ? monoText : reversed ? "text-white" : "text-[#5FB346]";

  const taglineClass = reversed ? "text-white/70" : "text-white/70";
  const poweredByClass = reversed ? "text-white/80" : "text-[#0B1D3B]/70";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="flex flex-col">
        <div
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1.5 shadow-sm",
            containerClass
          )}
        >
          <span
            className="text-lg font-black leading-none tracking-tight"
            style={{ fontFamily: "Futura Std Heavy, Russo One, sans-serif" }}
          >
            <span className={fiClass}>Fi</span>
            <span className={rClass}>R</span>
            <span className={xtClass}>xt</span>
          </span>
        </div>

        {showPoweredBy && (
          <span
            className={cn("mt-1 text-[10px] leading-none", poweredByClass)}
            style={{ fontFamily: "Russo One, sans-serif" }}
          >
            Powered by WellAI
          </span>
        )}
      </div>

      {showTagline && (
        <div className="hidden sm:block">
          <p
            className={cn("text-xs leading-none", taglineClass)}
            style={{ fontFamily: "Russo One, sans-serif" }}
          >
            Live Smart
          </p>
        </div>
      )}
    </div>
  );
}

export function FiRxtLogoDark({
  className,
  showPoweredBy = true,
}: {
  className?: string;
  showPoweredBy?: boolean;
}) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <div className="rounded-full bg-[#0B1D3B] px-5 py-2 shadow-sm">
        <span
          className="text-2xl font-black leading-none tracking-tight"
          style={{ fontFamily: "Futura Std Heavy, Russo One, sans-serif" }}
        >
          <span className="text-[#5FB346]">Fi</span>
          <span className="text-[#B22625]">R</span>
          <span className="text-[#5FB346]">xt</span>
        </span>
      </div>

      <p
        className="text-sm text-[#0B1D3B]/75"
        style={{ fontFamily: "Russo One, sans-serif" }}
      >
        Live Smart
      </p>

      {showPoweredBy && (
        <p
          className="text-[10px] text-[#0B1D3B]/60"
          style={{ fontFamily: "Russo One, sans-serif" }}
        >
          Powered by WellAI
        </p>
      )}
    </div>
  );
}

export function FiRxtLogoMono({
  className,
  reversed = false,
  showPoweredBy = false,
}: {
  className?: string;
  reversed?: boolean;
  showPoweredBy?: boolean;
}) {
  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1.5",
          reversed ? "bg-white/10 border border-white/20" : "bg-transparent"
        )}
      >
        <span
          className={cn(
            "text-lg font-black leading-none tracking-tight",
            reversed ? "text-white" : "text-[#0B1D3B]"
          )}
          style={{ fontFamily: "Futura Std Heavy, Russo One, sans-serif" }}
        >
          FiRxt
        </span>
      </div>

      {showPoweredBy && (
        <span
          className={cn(
            "text-[10px] leading-none",
            reversed ? "text-white/80" : "text-[#0B1D3B]/60"
          )}
          style={{ fontFamily: "Russo One, sans-serif" }}
        >
          Powered by WellAI
        </span>
      )}
    </div>
  );
}