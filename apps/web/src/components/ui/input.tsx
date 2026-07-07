import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
