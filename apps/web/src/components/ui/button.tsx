import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand";
type ButtonSize = "sm" | "md" | "lg";

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" &&
      "bg-accent text-accent-foreground shadow-glow hover:bg-accent-hover hover:shadow-card-hover active:scale-[0.98]",
    variant === "brand" &&
      "bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover active:scale-[0.98]",
    variant === "secondary" &&
      "border border-border bg-card text-foreground shadow-sm hover:border-accent/30 hover:bg-accent-muted/40",
    variant === "ghost" && "text-muted hover:bg-brand-muted hover:text-foreground",
    variant === "danger" && "bg-urgent text-white hover:brightness-110 active:scale-[0.98]",
    size === "sm" && "h-9 px-3.5 text-sm",
    size === "md" && "h-11 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
