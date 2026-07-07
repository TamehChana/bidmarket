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
    "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" &&
      "bg-accent text-accent-foreground shadow-sm hover:bg-accent-hover",
    variant === "brand" &&
      "bg-brand text-accent-foreground shadow-sm hover:bg-brand-hover",
    variant === "secondary" &&
      "border border-border bg-card text-accent hover:bg-accent-muted",
    variant === "ghost" && "text-accent hover:bg-accent-muted",
    variant === "danger" && "bg-urgent text-white hover:brightness-95",
    size === "sm" && "h-9 px-4 text-sm",
    size === "md" && "h-10 px-5 text-sm",
    size === "lg" && "h-11 px-6 text-sm",
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
