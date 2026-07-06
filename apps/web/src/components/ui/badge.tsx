import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "live" | "urgent" | "winning" | "outbid" | "ended";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        variant === "default" && "bg-brand-muted text-brand",
        variant === "live" && "bg-live-muted text-live",
        variant === "urgent" && "bg-urgent-muted text-urgent",
        variant === "winning" && "bg-winning-muted text-winning",
        variant === "outbid" && "bg-outbid-muted text-outbid",
        variant === "ended" && "bg-border/60 text-muted",
        className,
      )}
      {...props}
    />
  );
}
