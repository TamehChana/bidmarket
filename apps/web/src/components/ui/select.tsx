import { cn } from "@/lib/utils";

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
