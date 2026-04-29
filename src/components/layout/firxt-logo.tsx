import { cn } from "@/lib/utils";

type BaseProps = {
  className?: string;
};

type FiRxtLogoProps = BaseProps & {
  showTagline?: boolean;
  showPoweredBy?: boolean;
};

type FiRxtBrandCardProps = BaseProps & {
  showPoweredBy?: boolean;
};

export function FiRxtLogoDark({
  className,
  showPoweredBy = false,
}: {
  className?: string;
  showPoweredBy?: boolean;
}) {
  return (
    <FiRxtBrandCard
      className={className}
      showPoweredBy={showPoweredBy}
    />
  );
}

export function FiRxtLogo({
  className,
  showTagline = true,
  showPoweredBy = true,
}: FiRxtLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="flex flex-col items-center">
        <div className="inline-flex items-center rounded-full border border-white/30 bg-[#0B1D3B] px-4 py-1.5 shadow-sm">
          <span
            className="text-[27px] font-black leading-none tracking-[-0.01em]"
            style={{
              fontFamily:
                "Futura Std Heavy, Russo One, Arial Black, sans-serif",
              WebkitTextStroke: "0.3px white",
            }}
          >
            <span className="text-[#5FB346]">Fi</span>
            <span className="text-[#B22625]">Rx</span>
            <span className="text-[#5FB346]">t</span>
          </span>
        </div>

        {showPoweredBy && (
          <p
            className="mt-1 text-[10px] font-bold leading-none"
            style={{
              fontFamily: "Futura Std Heavy, Russo One, sans-serif",
              fontWeight: 800,
            }}
          >
            <span className="text-white">Powered by </span>
            <span className="text-[#712B87]">WellAI</span>
          </p>
        )}
      </div>

      {showTagline && (
        <span
          className="hidden text-sm text-white/80 sm:inline-block"
          style={{
            fontFamily: "Futura Std Heavy, Russo One, sans-serif",
          }}
        >
          Live Smart
        </span>
      )}
    </div>
  );
}

export function FiRxtBrandCard({
  className,
  showPoweredBy = true,
}: FiRxtBrandCardProps) {
  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div className="inline-flex items-center rounded-[999px] bg-[#0B1D3B] px-14 py-8 shadow-sm">
        <span
          className="text-[80px] font-black leading-none tracking-[-0.05em]"
          style={{
            fontFamily:
              "Futura Std Heavy, Russo One, sans-serif",
            WebkitTextStroke: "3.5px white",
          }}
        >
          <span className="text-[#5FB346]">Fi</span>
          <span className="text-[#B22625]">Rx</span>
          <span className="text-[#5FB346]">t</span>
        </span>
      </div>

      {showPoweredBy && (
        <div
          className="mt-3 text-center text-[24px] font-black leading-none tracking-[-0.03em]"
          style={{
            fontFamily:
              "Russo One, Futura Std Heavy, Arial Black, sans-serif",
          }}
        >
          <span className="text[#0B1D3B]">Powered by </span>
          <span className="text-[#712B87]">WellAI</span>
        </div>
      )}
    </div>
  );
}

export function FiRxtLogoMono({
  className,
  dark = false,
}: BaseProps & { dark?: boolean }) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "inline-flex items-center rounded-full px-4 py-1.5",
          dark ? "bg-[#0B1D3B]" : "bg-transparent"
        )}
      >
        <span
          className={cn(
            "text-[30px] font-black leading-none tracking-[-0.03em]",
            dark ? "text-white" : "text-[#0B1D3B]"
          )}
          style={{
            fontFamily:
              "Futura Std Heavy, Russo One, Arial Black, sans-serif",
          }}
        >
          FiRxt
        </span>
      </div>
    </div>
  );
}